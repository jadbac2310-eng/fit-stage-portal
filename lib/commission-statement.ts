import type { Lesson } from "./lessons-types";
import type { TrialLesson } from "./trial-lessons-types";
import type { HourlyTask } from "./hourly-tasks-types";
import { hourlyTaskHours, hourlyTaskAmount } from "./hourly-tasks-types";
import { buildTrainerEntries, buildSalesEntries, isoToMonth, type CommissionContext } from "./commissions";

/** 明細1行（単価・歩合率は含まない。支払う金額のみ） */
export interface StatementLine {
  date:         string; // YYYY-MM-DD
  customerName: string;
  label:        string; // コース名 または「成約ボーナス」
  amount:       number;
}

/** 時給業務の明細1行 */
export interface HourlyStatementLine {
  date:   string; // YYYY-MM-DD
  title:  string;
  hours:  number;
  amount: number;
}

export interface TrainerStatement {
  memberId:     string;
  memberName:   string;
  trainerLines: StatementLine[]; // 担当トレーナーとしてのレッスン歩合
  trainerTotal: number;
  salesLines:   StatementLine[]; // 営業としてのレッスン歩合＋成約ボーナス
  salesTotal:   number;
  hourlyLines:  HourlyStatementLine[]; // 時給業務
  hourlyTotal:  number;
  total:        number;
}

/**
 * 月次のトレーナー明細を全員ぶん作る。
 * レッスン担当分（トレーナー歩合）・営業分（営業歩合＋成約ボーナス）・時給業務のうち
 * 複数を持つ人は、1人分の明細に全部まとめて含める。
 */
export function buildTrainerStatements(
  lessons: Lesson[],
  completedTrialLessons: TrialLesson[],
  contractedTrialLessons: TrialLesson[],
  hourlyTasks: HourlyTask[],
  month: string,
  ctx: CommissionContext,
): TrainerStatement[] {
  const trainerEntries = buildTrainerEntries(lessons, completedTrialLessons, month, ctx);
  const salesEntries   = buildSalesEntries(lessons, contractedTrialLessons, month, ctx);
  const hourlyInMonth  = hourlyTasks.filter((t) => t.status === "completed" && isoToMonth(t.scheduledAt) === month);

  const map = new Map<string, TrainerStatement>();
  const ensure = (id: string, name: string) => {
    if (!map.has(id)) {
      map.set(id, { memberId: id, memberName: name, trainerLines: [], trainerTotal: 0, salesLines: [], salesTotal: 0, hourlyLines: [], hourlyTotal: 0, total: 0 });
    }
    return map.get(id)!;
  };

  for (const e of trainerEntries) {
    const s = ensure(e.memberId, e.memberName);
    s.trainerLines = e.lessons
      .map((l) => ({ date: l.scheduledAt.slice(0, 10), customerName: l.customerName, label: l.course || "—", amount: l.commission }))
      .sort((a, b) => a.date.localeCompare(b.date));
    s.trainerTotal = e.total;
    s.total += e.total;
  }

  for (const e of salesEntries) {
    const s = ensure(e.memberId, e.memberName);
    const lessonLines = e.lessons.map((l) => ({ date: l.scheduledAt.slice(0, 10), customerName: l.customerName, label: l.course || "—", amount: l.commission }));
    const bonusLines  = e.bonuses.map((b) => ({ date: b.scheduledAt.slice(0, 10), customerName: b.customerName, label: "成約ボーナス", amount: b.amount }));
    s.salesLines = [...lessonLines, ...bonusLines].sort((a, b) => a.date.localeCompare(b.date));
    s.salesTotal = e.total;
    s.total += e.total;
  }

  for (const t of hourlyInMonth) {
    const s = ensure(t.memberId, t.memberName ?? t.memberId);
    const amount = hourlyTaskAmount(t);
    s.hourlyLines.push({ date: t.scheduledAt.slice(0, 10), title: t.title, hours: Math.round(hourlyTaskHours(t) * 10) / 10, amount });
    s.hourlyTotal += amount;
    s.total += amount;
  }
  for (const s of map.values()) s.hourlyLines.sort((a, b) => a.date.localeCompare(b.date));

  return Array.from(map.values())
    .filter((s) => s.total > 0)
    .sort((a, b) => b.total - a.total);
}

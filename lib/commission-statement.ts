import type { Lesson } from "./lessons-types";
import type { TrialLesson } from "./trial-lessons-types";
import type { HourlyTask } from "./hourly-tasks-types";
import { hourlyTaskHours, hourlyTaskAmount } from "./hourly-tasks-types";
import { buildTrainerEntries, buildSalesEntries, isoToMonth, type CommissionContext } from "./commissions";
import type { CommissionAdjustment } from "./commission-adjustments-types";

/** 明細1行（単価・歩合率は含まない。支払う金額のみ） */
export interface StatementLine {
  date:         string; // YYYY-MM-DD
  customerName: string;
  label:        string; // コース名 または「成約ボーナス」
  amount:       number;
}

/** 業務の明細1行 */
export interface HourlyStatementLine {
  date:   string; // YYYY-MM-DD
  title:  string;
  hours:  number;
  amount: number;
}

/** 調整の明細1行（前払いの差し引き・立替の精算など。マイナスもある） */
export interface AdjustmentStatementLine {
  label:  string;
  amount: number;
  note?:  string;
}

export interface TrainerStatement {
  memberId:     string;
  memberName:   string;
  trainerLines: StatementLine[]; // 担当トレーナーとしてのレッスン歩合
  trainerTotal: number;
  salesLines:   StatementLine[]; // 営業としてのレッスン歩合＋成約ボーナス
  salesTotal:   number;
  hourlyLines:  HourlyStatementLine[]; // 業務
  hourlyTotal:  number;
  /**
   * 総支給額（レッスン＋営業＋業務）。調整は含まない。
   *
   * 前払いを差し引いても、この額は絶対に変えない。
   * 前払いは「すでに渡したお金を戻してもらう」だけで、働いた対価そのものは減らないため。
   * 消費税の内訳もこの額から割り戻す（課税対象を減らしてはいけない）。
   */
  total:        number;
  adjustmentLines: AdjustmentStatementLine[]; // 前払いの差し引き・立替の精算など
  adjustmentTotal: number;                     // マイナス＝差し引く
  /** 支給日に振り込む額。total + adjustmentTotal。減るのはここだけ */
  payable:      number;
}

/**
 * 月次のコミッション明細を全員ぶん作る。
 * レッスン担当分（トレーナー歩合）・営業分（営業歩合＋成約ボーナス）・業務のうち
 * 複数を持つ人は、1人分の明細に全部まとめて含める。
 */
export function buildTrainerStatements(
  lessons: Lesson[],
  completedTrialLessons: TrialLesson[],
  contractedTrialLessons: TrialLesson[],
  hourlyTasks: HourlyTask[],
  month: string,
  ctx: CommissionContext,
  /** 前払いの差し引き・立替の精算など。全月ぶん渡してよい（この月のぶんだけ使う） */
  adjustments: CommissionAdjustment[] = [],
): TrainerStatement[] {
  const trainerEntries = buildTrainerEntries(lessons, completedTrialLessons, month, ctx);
  const salesEntries   = buildSalesEntries(lessons, contractedTrialLessons, month, ctx);
  const hourlyInMonth  = hourlyTasks.filter((t) => t.status === "completed" && isoToMonth(t.scheduledAt) === month);
  const adjustInMonth  = adjustments.filter((a) => a.month === month);

  const map = new Map<string, TrainerStatement>();
  const ensure = (id: string, name: string) => {
    if (!map.has(id)) {
      map.set(id, { memberId: id, memberName: name, trainerLines: [], trainerTotal: 0, salesLines: [], salesTotal: 0, hourlyLines: [], hourlyTotal: 0, total: 0, adjustmentLines: [], adjustmentTotal: 0, payable: 0 });
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

  // 前払いの差し引きなど。報酬が1件も無い人にも付くことがある
  // （先に渡したあと、その月はレッスンが無かった場合）ので ensure で行を作る
  for (const a of adjustInMonth) {
    const s = ensure(a.memberId, a.memberName ?? a.memberId);
    s.adjustmentLines.push({ label: a.label, amount: a.amount, note: a.note });
    s.adjustmentTotal += a.amount;
  }

  for (const s of map.values()) s.payable = s.total + s.adjustmentTotal;

  return Array.from(map.values())
    .filter((s) => s.total > 0 || s.adjustmentTotal !== 0)
    .sort((a, b) => b.payable - a.payable);
}

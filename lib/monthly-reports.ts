import type { Lesson } from "./lessons-types";
import type { Customer } from "./customers-types";
import type { Exercise } from "./exercise-types";

// 1回のレッスン（レポート出力用）
export interface ReportSession {
  date: string;          // ISO
  trainerName?: string;
  location?: string;
  exercises: Exercise[];
  impression?: string;   // トレーナーコメント（お客さんの様子）
}

export interface MonthlyReportStats {
  sessionCount: number;   // 今月のレッスン回数
  exerciseCount: number;  // 延べ種目数
  totalSets: number;      // 延べセット数
  totalVolumeKg: number;  // ウェイトの総挙上量（重量×回数の合計, kg）
}

export interface MonthlyReport {
  customerId: string;
  customerName: string;
  period: string;         // 'YYYY-MM'
  sessions: ReportSession[];
  stats: MonthlyReportStats;
}

function hasContent(l: Lesson): boolean {
  return (l.exercises?.length ?? 0) > 0 || !!l.customerImpression;
}

// "40kg" や "8回" 等の文字列から数値を取り出す
function num(s?: string): number {
  if (!s) return 0;
  const m = String(s).replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
}

function computeStats(sessions: ReportSession[]): MonthlyReportStats {
  let exerciseCount = 0, totalSets = 0, totalVolumeKg = 0;
  for (const s of sessions) {
    for (const ex of s.exercises) {
      exerciseCount++;
      for (const set of ex.sets) {
        totalSets++;
        if (ex.type === "weight") {
          const w = num(set.weight), r = num(set.reps);
          if (w > 0 && r > 0) totalVolumeKg += w * r;
        }
      }
    }
  }
  return { sessionCount: sessions.length, exerciseCount, totalSets, totalVolumeKg: Math.round(totalVolumeKg) };
}

/** 指定顧客・指定月のレポートを組み立てる（記録のあるレッスンのみ・日付昇順）。 */
export function buildMonthlyReport(
  customerId: string,
  customerName: string,
  period: string,
  lessons: Lesson[],
): MonthlyReport {
  const sessions: ReportSession[] = lessons
    .filter((l) =>
      l.customerId === customerId &&
      l.scheduledAt.slice(0, 7) === period &&
      l.status !== "cancelled" &&
      hasContent(l))
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
    .map((l) => ({
      date: l.scheduledAt,
      trainerName: l.trainerMemberName,
      location: l.location,
      exercises: l.exercises ?? [],
      impression: l.customerImpression,
    }));

  return { customerId, customerName, period, sessions, stats: computeStats(sessions) };
}

/** その月に記録のある全顧客分のレポートを組み立てる（回数の多い順）。 */
export function buildMonthlyReports(
  period: string,
  customers: Customer[],
  lessons: Lesson[],
): MonthlyReport[] {
  const nameOf = new Map(customers.map((c) => [c.id, c.fullName]));
  const ids = new Set(
    lessons
      .filter((l) => l.scheduledAt.slice(0, 7) === period && l.status !== "cancelled" && hasContent(l))
      .map((l) => l.customerId),
  );
  return Array.from(ids)
    .map((id) => buildMonthlyReport(id, nameOf.get(id) ?? "", period, lessons))
    .filter((r) => r.sessions.length > 0)
    .sort((a, b) => b.stats.sessionCount - a.stats.sessionCount || a.customerName.localeCompare(b.customerName, "ja"));
}

export function monthLabel(period: string): string {
  const [y, m] = period.split("-");
  return `${y}年${parseInt(m, 10)}月`;
}

export function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

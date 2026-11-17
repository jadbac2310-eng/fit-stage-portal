import { jstDay } from "./highlights-types";

/**
 * お客さまの「入会日」（2026-11-13 に定義をそろえた。2026-11-18 に1か所へまとめた）。
 * 入会日＝初めて回数券を買った日と、体験で成約した日（体験の日）の、早いほう。
 * 全員向けの「今月のFIT STAGE」（lib/company-stats.ts）と、管理者の経営ダッシュボードの両方がここを使う。
 * 顧客マスタに登録された日（createdAt）は使わない（申込みだけの人や手で登録した人が入り、体験・成約と食い違うため）。
 */
export function joinDates(
  passes: { customerId: string; purchasedAt?: string | null }[],
  trials: { customerId?: string | null; contracted?: boolean | null; scheduledAt: string }[],
): Map<string, string> {
  const out = new Map<string, string>();
  const setEarlier = (id: string, day: string) => {
    const cur = out.get(id);
    if (!cur || day < cur) out.set(id, day);
  };
  for (const p of passes) if (p.purchasedAt) setEarlier(p.customerId, p.purchasedAt.slice(0, 10));
  for (const t of trials) if (t.contracted === true && t.customerId) setEarlier(t.customerId, jstDay(t.scheduledAt));
  return out;
}

/** その月（YYYY-MM）に入会した人の id と入会日。dayCut を渡すと、その日までに切る（先月と同じ日までで比べるため） */
export function joinedInMonth(dates: Map<string, string>, month: string, dayCut: number | null = null): [string, string][] {
  return Array.from(dates.entries()).filter(([, day]) =>
    day.slice(0, 7) === month && (dayCut == null || Number(day.slice(8, 10)) <= dayCut));
}

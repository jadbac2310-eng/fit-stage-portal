// 前月比を出すための日付まわり。
//
// 月の途中で「先月より増えた／減った」を見るとき、先月まるごとと比べると
// 毎月の初めに必ず「大幅に減った」と出てしまう。
// そうならないように、先月も「同じ日まで」で数えるための道具を置く。
//
// クライアントからも読むので、ここでは supabase を import しない。

/**
 * 日付の「日」。
 * YYYY-MM-DD はそのまま読み、日時(ISO)は isoToMonth と同じく端末の時間で読む。
 */
export function dayOf(iso: string): number {
  return iso.length <= 10 ? parseInt(iso.slice(8, 10), 10) : new Date(iso).getDate();
}

/** その日までに入るものか（day が null なら月まるごと） */
export function withinDay(iso: string | undefined, day: number | null): boolean {
  return !!iso && (day == null || dayOf(iso) <= day);
}

/** 先月ぶんを「同じ日まで」に切る（day が null ならそのまま） */
export function upTo<T>(rows: T[], day: number | null, pick: (r: T) => string | undefined): T[] {
  return day == null ? rows : rows.filter((r) => withinDay(pick(r), day));
}

/** 'YYYY-MM' の先月 */
export function prevMonthOf(month: string): string {
  const [y, m] = month.split("-").map((x) => parseInt(x, 10));
  return `${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, "0")}`;
}

/** 増減の割合（%・四捨五入）。比べる相手が無い／0のときは null */
export function deltaPercent(now: number, prev?: number | null): number | null {
  if (prev == null || prev === 0) return null;
  return Math.round(((now - prev) / Math.abs(prev)) * 100);
}

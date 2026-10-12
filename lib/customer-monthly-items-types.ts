/**
 * 顧客ごとの「毎月かかる固定の請求項目」。
 *
 * ホームページ運用代行のように、レッスンとは別に毎月つける項目。
 * レッスン料と同じ請求書にまとめて載せる。
 */
export interface CustomerMonthlyItem {
  id:         string;
  customerId: string;
  name:       string;
  amount:     number;
  /** この日以降の請求に載せる（未設定なら制限なし） */
  startedOn?: string; // YYYY-MM-DD
  /** この日までの請求に載せる（未設定なら継続中） */
  endedOn?:   string; // YYYY-MM-DD
  sortOrder:  number;
  createdAt:  string;
  updatedAt:  string;
}

/**
 * 請求期間（from〜to）に請求する項目かどうか。
 * 期間に1日でもかかっていれば、その月は請求する。
 */
export function isMonthlyItemActive(
  item: Pick<CustomerMonthlyItem, "startedOn" | "endedOn">,
  period: { from: string; to: string },
): boolean {
  if (item.startedOn && item.startedOn > period.to) return false;   // まだ始まっていない
  if (item.endedOn   && item.endedOn   < period.from) return false; // もう終わっている
  return true;
}

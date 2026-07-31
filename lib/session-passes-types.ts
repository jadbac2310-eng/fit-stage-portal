/** 回数券に紐づくレッスン群から「何回目の利用か」（レッスンID→序数）を求める。
 *  日時昇順・同時刻は作成順。レッスン作成時に残数が減る仕組みのため、
 *  紐づいているレッスンはステータスに関わらず1回の消費として数える。 */
export function passUsageOrdinals(
  lessons: { id: string; scheduledAt: string; createdAt: string }[]
): Map<string, number> {
  const sorted = [...lessons].sort(
    (a, b) =>
      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime() ||
      a.createdAt.localeCompare(b.createdAt)
  );
  return new Map(sorted.map((l, i) => [l.id, i + 1]));
}

export interface SessionPass {
  id: string;
  customerId: string;
  totalCount: number;
  remainingCount: number;
  personCount: number;     // 1名様 or 2名様
  price?: number;          // 入金額（総額）。単価 = price / totalCount
  purchasedAt: string;
  expiredAt?: string;
  note?: string;
  createdById?: string;
  updatedById?: string;
  createdAt: string;
  updatedAt: string;
}

/** 回数券に紐づくレッスン群から「何回目の利用か」（レッスンID→序数）を求める。
 *  日時昇順・同時刻は作成順。レッスン作成時に残数が減る仕組みのため、
 *  紐づいているレッスンはステータスに関わらず1回の消費として数える。 */
/**
 * その状態のレッスンが、回数券を1回ぶん押さえているか。
 *
 *   予定・完了・当日キャンセル … 押さえる（当日キャンセルは消費する約束のため）
 *   キャンセル                … 押さえない（回数は戻す）
 *
 * 残回数の増減も、何回目かの数え方も、この1つの判定にそろえる。
 * 別々に書くと「残回数は減ったのに回数は飛ばされる」のような食い違いが起きる。
 */
export function passHeldByStatus(status: string | undefined): boolean {
  return status !== "cancelled";
}

/**
 * 回数券の何回目の利用かを数える。
 *
 * キャンセルした回は数に入れない（回数券も消費しないため）。
 * 当日キャンセルは消費する約束なので数に入れる。
 */
export function passUsageOrdinals(
  lessons: { id: string; scheduledAt: string; createdAt: string; status?: string }[]
): Map<string, number> {
  const sorted = [...lessons]
    .filter((l) => passHeldByStatus(l.status))
    .sort(
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

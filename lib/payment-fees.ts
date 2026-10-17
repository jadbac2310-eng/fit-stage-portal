// 決済手数料。
//
// Square の料率にあわせる。
//   カード・タッチ決済（対面）         2.5%
//   カード・キー入力（非対面・オンライン） 3.6%
//   PayPay                            3.25%
//
// 手数料は「決済額 × 料率」を四捨五入した円。Square の明細と同じ数字になる。
// 実際の明細と突き合わせて確認したもの:
//   ¥104,100 × 2.5%  = ¥2,603
//   ¥27,000  × 3.6%  = ¥972
//   ¥19,200  × 3.25% = ¥624   （入金額 ¥18,576）
//   ¥34,800  × 3.25% = ¥1,131 （入金額 ¥33,669）
//
// DBには手数料を持たせず、入金方法と金額からその都度計算する。
// 方法の名前に料率が入っているので、どの記録がどの料率かは必ず一意に決まる。
//
// クライアントからも読むので、ここでは supabase を import しない。

/** 対面のタッチ決済 */
export const CARD_TOUCH = "カード（タッチ 2.5%）";
/** 非対面のキー入力・オンライン決済 */
export const CARD_KEYED = "カード（キー入力 3.6%）";
/** PayPay */
export const PAYPAY = "PayPay（3.25%）";
/** 料率を分けて記録する前の古い「カード」。タッチかキー入力か分からないので手数料を出さない */
export const CARD_LEGACY = "カード";

export const PAYMENT_FEE_RATE: Record<string, number> = {
  [CARD_TOUCH]: 2.5,
  [CARD_KEYED]: 3.6,
  [PAYPAY]:     3.25,
};

/** 入金方法の手数料率（%）。現金・振込など手数料のかからない方法は 0 */
export function feeRate(method?: string | null): number {
  if (!method) return 0;
  return PAYMENT_FEE_RATE[method] ?? 0;
}

/** 決済額にかかる手数料（円）。四捨五入 */
export function paymentFee(amount: number, method?: string | null): number {
  const rate = feeRate(method);
  if (rate <= 0 || !Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round((amount * rate) / 100);
}

/** 手数料を引いた、実際に手元に入る金額 */
export function netAmount(amount: number, method?: string | null): number {
  return (Number.isFinite(amount) ? amount : 0) - paymentFee(amount, method);
}

/**
 * 料率の分からない古い「カード」の記録か。
 * 勝手にどちらかの料率を当てると手数料も利益も嘘になるので、
 * 手数料0のまま印をつけて、タッチかキー入力か選び直してもらう。
 */
export function isUnknownCard(method?: string | null): boolean {
  return method === CARD_LEGACY;
}

export interface FeeablePayment {
  amount:  number;
  method?: string;
  paidAt?: string;   // YYYY-MM-DD
}

/**
 * その月に入金された決済の手数料の合計。
 *
 * 売上はレッスンをやった月で数えるが、手数料は実際にお金が動いた月（入金日）で数える。
 * 決済会社に引かれるのが入金のタイミングだから。
 */
export function feeTotal(payments: FeeablePayment[], month: string): number {
  return payments.reduce(
    (s, p) => p.paidAt?.slice(0, 7) === month ? s + paymentFee(p.amount, p.method) : s,
    0,
  );
}

/** その月の手数料がかかった入金だけを、手数料の大きい順に返す（内訳表示用） */
export function feePayments(payments: FeeablePayment[], month: string): (FeeablePayment & { fee: number })[] {
  return payments
    .filter((p) => p.paidAt?.slice(0, 7) === month && paymentFee(p.amount, p.method) > 0)
    .map((p) => ({ ...p, fee: paymentFee(p.amount, p.method) }))
    .sort((a, b) => b.fee - a.fee);
}

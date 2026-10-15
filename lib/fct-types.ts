// FCT（ファーストクラストレーナーズ）経由のレッスンのお金の計算。
//
// FCTの支払明細は、お客さまが払う単価の「税抜」に歩合率をかけた額を支払額としている。
//   例）単価 8,700円（税込） → 税抜 7,909円 → ×45% → 3,559円
// ポータルも同じ計算をして、FCTの明細と数字がそのまま合うようにする。
//
// 歩合率は店舗ごとに持つ（FCT店舗マスタ）。直営店は45%。

/** FCT店舗の歩合率の既定値（%）。直営店の実績値 */
export const FCT_DEFAULT_RATE = 45;

/** 消費税10%。FCTの明細は税抜に歩合率をかけるので、単価を1.1で割って使う */
const TAX_DIVISOR = 1.1;

/** 源泉所得税10% ＋ 復興特別所得税0.21%。税抜の報酬額にかかる */
export const WITHHOLDING_RATE = 10.21;

/**
 * FCTから1レッスンあたり入る額（税込）。
 * 単価が未設定なら0円（顧客マスタに単価を入れるまで売上は立たない）。
 */
export function fctLessonPay(customerPrice?: number | null, ratePercent: number = FCT_DEFAULT_RATE): number {
  if (customerPrice == null) return 0;
  return Math.round((customerPrice / TAX_DIVISOR) * (ratePercent / 100));
}

/** 税込の合計から、FCTの明細と同じ内訳（税抜・消費税・源泉・振込額）を出す */
export interface FctPayBreakdown {
  /** 税込合計（＝FCTの明細の「支払額」） */
  total:       number;
  /** 税抜（＝明細の「支払合計①」） */
  net:         number;
  /** 消費税（＝明細の「消費税②」） */
  tax:         number;
  /** 源泉＆復興税（＝明細の「徴収額③」） */
  withholding: number;
  /** 実際に振り込まれる額（＝明細の「振込金額⑤」） */
  transfer:    number;
}

export function fctPayBreakdown(total: number): FctPayBreakdown {
  const net         = Math.round(total / TAX_DIVISOR);
  const tax         = total - net;
  const withholding = Math.round(net * (WITHHOLDING_RATE / 100));
  return { total, net, tax, withholding, transfer: total - withholding };
}

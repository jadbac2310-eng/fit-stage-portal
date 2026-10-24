/**
 * コミッションの調整（前払いの差し引き・立替の精算など）。
 *
 * 「先に7万円渡したから、来月のコミッションから引く」を覚えておくための仕組み。
 * amount はマイナス＝差し引く／プラス＝足す。
 * 対象月（month）のコミッション明細に自動で載るので、払うときに忘れない。
 */
export interface CommissionAdjustment {
  id:         string;
  memberId:   string;
  memberName?: string;
  /** どの月のコミッションから引くか（YYYY-MM） */
  month:      string;
  /** 明細に出る名前（例「10/24 前払い分」） */
  label:      string;
  /** マイナス＝差し引く／プラス＝足す（円） */
  amount:     number;
  note?:      string;
  createdById?: string;
  updatedById?: string;
  createdAt:  string;
  updatedAt:  string;
}

/** よく使う調整のひな形。入力の手間とラベルの表記ゆれを減らす */
export const ADJUSTMENT_PRESETS: { label: string; sign: -1 | 1; hint: string }[] = [
  { label: "前払い分の差し引き", sign: -1, hint: "先に現金・振込で渡したぶんを引く" },
  { label: "立替分の精算",       sign:  1, hint: "本人が立て替えた経費を足す" },
  { label: "その他の差し引き",   sign: -1, hint: "物品代など" },
  { label: "その他の支給",       sign:  1, hint: "手当など" },
];

export function adjustmentTotalOf(adjustments: { amount: number }[]): number {
  return adjustments.reduce((s, a) => s + a.amount, 0);
}

/** その月・その人ぶんだけ取り出す */
export function adjustmentsFor(
  adjustments: CommissionAdjustment[],
  memberId: string,
  month: string,
): CommissionAdjustment[] {
  return adjustments
    .filter((a) => a.memberId === memberId && a.month === month)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * 差し引きが報酬より多いか。
 *
 * 多いと「お支払い金額がマイナス」になってしまうので、画面で先に知らせる。
 * 金額を分けて翌月に回してもらうための判定。
 */
export function overDeducted(rewardTotal: number, adjustmentTotal: number): boolean {
  return rewardTotal + adjustmentTotal < 0;
}

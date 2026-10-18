import { CARD_TOUCH, CARD_KEYED, PAYPAY } from "./payment-fees";

export type PaymentSourceType = "session_pass" | "customer_plan" | "single_lesson" | "trial_lesson";

export const SOURCE_TYPE_LABEL: Record<PaymentSourceType, string> = {
  session_pass:  "回数券",
  customer_plan: "月額プラン",
  single_lesson: "都度払い",
  trial_lesson:  "体験レッスン",
};

// カードは料率が違うので、タッチとキー入力を分けて選ぶ（手数料は lib/payment-fees.ts で計算する）
export const PAYMENT_METHODS = ["現金", "振込", CARD_TOUCH, CARD_KEYED, PAYPAY, "その他"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface Payment {
  id:          string;
  sourceType:  PaymentSourceType;
  sourceId:    string;
  customerId?: string;
  amount:      number;
  paidAt?:     string;   // YYYY-MM-DD
  method?:     string;
  note?:       string;
  createdById?: string;
  createdAt:   string;
  updatedAt:   string;
}

/** 売上1項目（入金管理の1行）。payment があれば入金済み。 */
export interface Receivable {
  sourceType:   PaymentSourceType;
  sourceId:     string;
  customerId:   string;
  customerName: string;
  label:        string;   // 例: 回数券 16回 / 月4回プラン / 都度レッスン
  date:         string;   // 計上日 YYYY-MM-DD（購入日・実施日）
  amount:       number;   // 請求額
  payment?:     Payment;  // 入金記録（あれば入金済み）
}

export function paymentKey(sourceType: PaymentSourceType, sourceId: string): string {
  return `${sourceType}:${sourceId}`;
}

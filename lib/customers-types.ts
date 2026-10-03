// CustomerPlan is kept here because trial-lessons uses it for contractPlan
export type CustomerPlan = "monthly" | "pay_as_you_go";
export type CustomerStatus = "active" | "inactive" | "pending" | "trial";
export type CustomerType = "individual" | "corporate";
/** 支払期限を、対象月の当月で見るか翌月で見るか */
export type PaymentDueMonth = "same" | "next";

export interface Customer {
  id: string;
  email: string;
  fullName: string;
  dateOfBirth?: string;
  address?: string;
  phoneNumber?: string;
  desiredStartDate?: string;
  singleSessionPrice?: number;  // 都度プランの単価（顧客ごと・管理者入力）
  salesMemberId?: string;       // 担当営業（members.id）
  billingName?: string;         // 請求書の宛名（上書き。未設定なら fullName）
  billingToCustomerId?: string; // 請求のまとめ先（この顧客分を別顧客に請求する）
  paymentDueMonth: PaymentDueMonth; // 支払期限が当月か翌月か
  paymentDueDay?: number;           // 支払期限の日。未設定は末日
  agreedToTerms: boolean;
  status: CustomerStatus;
  customerType: CustomerType;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export const STATUS_LABEL: Record<CustomerStatus, string> = {
  trial:    "体験申し込み",
  active:   "在籍中",
  inactive: "退会",
  pending:  "審査中",
};

export const CUSTOMER_TYPE_LABEL: Record<CustomerType, string> = {
  individual: "個人",
  corporate:  "法人",
};

export const PAYMENT_DUE_MONTH_LABEL: Record<PaymentDueMonth, string> = {
  same: "当月",
  next: "翌月",
};

/** 「翌月末」「当月25日」のような表示用ラベル */
export function paymentDueRuleLabel(month: PaymentDueMonth, day?: number): string {
  return `${PAYMENT_DUE_MONTH_LABEL[month]}${day == null ? "末日" : `${day}日`}`;
}

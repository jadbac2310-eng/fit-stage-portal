export type CustomerPlan = "monthly" | "pay_as_you_go";
export type CustomerStatus = "active" | "inactive" | "pending" | "trial";

export interface Customer {
  id: string;
  email: string;
  fullName: string;
  dateOfBirth?: string;
  address?: string;
  phoneNumber?: string;
  plan?: CustomerPlan;
  desiredStartDate?: string;
  agreedToTerms: boolean;
  status: CustomerStatus;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export const PLAN_LABEL: Record<CustomerPlan, string> = {
  monthly:       "月額制",
  pay_as_you_go: "都度払い",
};

export const STATUS_LABEL: Record<CustomerStatus, string> = {
  trial:    "体験申し込み",
  active:   "在籍中",
  inactive: "退会",
  pending:  "審査中",
};

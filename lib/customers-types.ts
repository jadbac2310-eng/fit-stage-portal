// CustomerPlan is kept here because trial-lessons uses it for contractPlan
export type CustomerPlan = "monthly" | "pay_as_you_go";
export type CustomerStatus = "active" | "inactive" | "pending" | "trial";

export interface Customer {
  id: string;
  email: string;
  fullName: string;
  dateOfBirth?: string;
  address?: string;
  phoneNumber?: string;
  desiredStartDate?: string;
  agreedToTerms: boolean;
  status: CustomerStatus;
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

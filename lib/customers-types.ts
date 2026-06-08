// CustomerPlan is kept here because trial-lessons uses it for contractPlan
export type CustomerPlan = "monthly" | "pay_as_you_go";
export type CustomerStatus = "active" | "inactive" | "pending" | "trial";
export type CustomerType = "individual" | "corporate";

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

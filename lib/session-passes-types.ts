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
  createdAt: string;
  updatedAt: string;
}

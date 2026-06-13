export interface SessionPass {
  id: string;
  customerId: string;
  totalCount: number;
  remainingCount: number;
  price?: number;          // 入金額（総額）。単価 = price / totalCount
  purchasedAt: string;
  expiredAt?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

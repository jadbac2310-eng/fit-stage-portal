export interface SessionPass {
  id: string;
  customerId: string;
  totalCount: number;
  remainingCount: number;
  purchasedAt: string;
  expiredAt?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

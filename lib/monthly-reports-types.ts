export interface MonthlyReport {
  id: string;
  customerId: string;
  trainerMemberId?: string;
  trainerMemberName?: string;
  yearMonth: string; // "2026-06"
  content?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export type LessonPaymentType = "monthly" | "session_pass" | "single";
export type LessonStatus = "scheduled" | "completed" | "cancelled";

export interface Lesson {
  id: string;
  customerId: string;
  customerName: string;
  trainerMemberId?: string;
  trainerMemberName?: string;
  scheduledAt: string;
  location?: string;
  course?: string;
  paymentType?: LessonPaymentType;
  status: LessonStatus;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export const PAYMENT_LABEL: Record<LessonPaymentType, string> = {
  monthly:      "月会費",
  session_pass: "回数券",
  single:       "ショット",
};

export const LESSON_STATUS_LABEL: Record<LessonStatus, string> = {
  scheduled: "予定",
  completed: "完了",
  cancelled: "キャンセル",
};

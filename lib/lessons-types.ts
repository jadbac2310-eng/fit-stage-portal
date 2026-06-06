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
  sessionPassId?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export const LESSON_STATUS_LABEL: Record<LessonStatus, string> = {
  scheduled: "予定",
  completed: "完了",
  cancelled: "キャンセル",
};

export const COURSE_OPTIONS: { value: string; label: string; paymentType: LessonPaymentType }[] = [
  { value: "回数券8回",  label: "回数券 8回",  paymentType: "session_pass" },
  { value: "回数券16回", label: "回数券 16回", paymentType: "session_pass" },
  { value: "回数券32回", label: "回数券 32回", paymentType: "session_pass" },
  { value: "月2回",      label: "月2回",       paymentType: "monthly"      },
  { value: "月4回",      label: "月4回",       paymentType: "monthly"      },
  { value: "月8回",      label: "月8回",       paymentType: "monthly"      },
  { value: "都度",       label: "都度",        paymentType: "single"       },
];

export function courseToPaymentType(course: string | undefined): LessonPaymentType | null {
  return COURSE_OPTIONS.find((o) => o.value === course)?.paymentType ?? null;
}

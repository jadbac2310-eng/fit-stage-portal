import type { Exercise } from "./exercise-types";

export type LessonPaymentType = "monthly" | "session_pass" | "single";
export type LessonStatus = "scheduled" | "completed" | "cancelled";

export interface Lesson {
  id: string;
  customerId: string;
  customerName: string;
  trainerMemberId?: string;
  trainerMemberName?: string;
  scheduledAt: string;
  endAt?: string;
  location?: string;
  course?: string;
  paymentType?: LessonPaymentType;
  status: LessonStatus;
  sessionPassId?: string;
  amount?: number;          // 都度払いの金額（円）。未設定はコース単価を使用
  trainingContent?: string;    // 旧レポート自由記述（互換用・現在は未使用）
  exercises?: Exercise[];      // レポート: 種目ログ（種目名・重量・回数）
  customerImpression?: string; // レポート: お客さんの様子
  note?: string;
  rentalGymId?: string;        // 利用レンタルジム（rental_gyms.id）
  rentalGymFee?: number;       // この回のレンタルジム代（マスタ値がデフォルト・変更可）
  storeId?: string;            // 利用店舗（stores.id）。レンタルジムとは別概念
  storeFee?: number;           // この回の店舗利用料（既定2000・変更可）
  createdById?: string;        // レッスンを追加したメンバー
  createdByName?: string;
  updatedById?: string;        // 最後に編集したメンバー
  createdAt: string;
  updatedAt: string;
}

export const LESSON_STATUS_LABEL: Record<LessonStatus, string> = {
  scheduled: "予定",
  completed: "完了",
  cancelled: "キャンセル",
};

export const COURSE_OPTIONS: { value: string; label: string; paymentType: LessonPaymentType }[] = [
  { value: "回数券", label: "回数券", paymentType: "session_pass" },
  { value: "月2回",  label: "月2回",  paymentType: "monthly"      },
  { value: "月4回",  label: "月4回",  paymentType: "monthly"      },
  { value: "月8回",  label: "月8回",  paymentType: "monthly"      },
  { value: "都度",   label: "都度",   paymentType: "single"       },
  { value: "オンラインパーソナル", label: "オンラインパーソナル", paymentType: "single" },
];

export function courseToPaymentType(course: string | undefined): LessonPaymentType | null {
  return COURSE_OPTIONS.find((o) => o.value === course)?.paymentType ?? null;
}

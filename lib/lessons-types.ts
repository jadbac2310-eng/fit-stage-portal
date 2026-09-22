import type { Exercise } from "./exercise-types";

export type LessonPaymentType = "monthly" | "session_pass" | "single";
export type LessonStatus = "scheduled" | "completed" | "cancelled" | "cancelled_same_day";

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
  storeId?: string;            // 利用店舗（stores.id）。レンタルジムとは別概念で利用料は無い
  fctStoreId?: string;         // 利用FCT店舗（fct_stores.id）
  fctStoreFee?: number;        // この回のFCT店舗利用料（マスタ値がデフォルト・変更可）
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
  cancelled_same_day: "当日キャンセル",
};

/** 売上・歩合の計算対象に含めるステータスか（当日キャンセルは実施扱いで売上・歩合が発生する） */
export function isBillableLessonStatus(status: LessonStatus): boolean {
  return status === "completed" || status === "cancelled_same_day";
}

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

/**
 * 単発（都度・オンライン等）レッスン1回の計上額を決める。
 * レッスン個別金額 → 顧客の都度単価 の順に見て、どちらも未設定なら null
 * （呼び出し側でプランマスタの既定単価などにフォールバックする）。
 *
 * 0円は「未設定」ではなく「0円と決めた」として扱う。金額の判定に真偽値
 * （`amount &&` や `amount > 0`）を使うと0円が未設定と同じ扱いになり、
 * 顧客の単価が勝手に使われてしまうので必ずこの関数を通すこと。
 */
export function resolveSingleLessonAmount(
  lessonAmount: number | null | undefined,
  customerSinglePrice: number | null | undefined,
): number | null {
  if (lessonAmount != null) return lessonAmount;
  if (customerSinglePrice != null) return customerSinglePrice;
  return null;
}

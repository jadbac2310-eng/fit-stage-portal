import type { CustomerPlan } from "./customers-types";
import type { Exercise } from "./exercise-types";
import { COURSE_OPTIONS } from "./lessons-types";
import { TRIAL_LESSON_COURSE_NAME } from "./commissions-types";

export type TrialLessonStatus = "scheduled" | "completed" | "cancelled";

/**
 * 体験レッスンで選べる料金区分。
 * 既定は「体験レッスン」。体験枠で実施したが都度料金で請求する等のために、
 * 1回ごとに金額が決まるコース（単発）も選べるようにしている。
 * 月プラン・回数券は契約が前提のコースなのでここには出さない。
 */
export const TRIAL_COURSE_OPTIONS: { value: string; label: string }[] = [
  { value: TRIAL_LESSON_COURSE_NAME, label: TRIAL_LESSON_COURSE_NAME },
  ...COURSE_OPTIONS.filter((o) => o.paymentType === "single").map((o) => ({ value: o.value, label: o.label })),
];

/** 体験レッスンの料金区分の表示名（未設定は「体験レッスン」） */
export function trialCourseLabel(course?: string): string {
  return course || TRIAL_LESSON_COURSE_NAME;
}

export interface TrialLesson {
  id: string;
  customerId: string;
  customerName: string;
  salesMemberId?: string;      // カウンセリング自動作成時は未割当（後で担当を入力）
  salesMemberName: string;     // 未割当時は空文字
  trainerMemberId?: string;
  trainerMemberName?: string;
  scheduledAt: string;
  location?: string;
  rentalGymId?: string;        // 利用レンタルジム（rental_gyms.id）
  rentalGymFee?: number;       // この回のレンタルジム代（マスタ値がデフォルト・変更可）
  storeId?: string;            // 利用店舗（stores.id）。レンタルジムとは別概念で利用料は無い
  fctStoreId?: string;         // 利用FCT店舗（fct_stores.id）
  fctStoreFee?: number;        // この回のFCT店舗利用料（マスタ値がデフォルト・変更可）
  course?: string;             // 料金区分。未設定は「体験レッスン」
  amount?: number;             // この回だけの金額。未設定はコース単価
  status: TrialLessonStatus;
  contracted: boolean | null;
  contractPlan?: CustomerPlan;
  trainingContent?: string;    // 旧レポート自由記述（互換用・現在は未使用）
  exercises?: Exercise[];      // レポート: 種目ログ（種目名・重量・回数）
  customerImpression?: string;
  note?: string;
  createdById?: string;
  updatedById?: string;
  createdAt: string;
  updatedAt: string;
}

export const STATUS_LABEL: Record<TrialLessonStatus, string> = {
  scheduled: "予定",
  completed: "完了",
  cancelled: "キャンセル",
};

export const CONTRACT_LABEL: Record<string, string> = {
  "true":  "契約成功",
  "false": "不成立",
  "null":  "未確定",
};

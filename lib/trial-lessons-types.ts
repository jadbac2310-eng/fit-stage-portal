import type { CustomerPlan } from "./customers-types";

export type TrialLessonStatus = "scheduled" | "completed" | "cancelled";

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
  status: TrialLessonStatus;
  contracted: boolean | null;
  contractPlan?: CustomerPlan;
  trainingContent?: string;
  customerImpression?: string;
  note?: string;
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

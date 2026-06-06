import type { CustomerPlan } from "./customers-types";

export type TrialLessonStatus = "scheduled" | "completed" | "cancelled";

export interface TrialLesson {
  id: string;
  customerId: string;
  customerName: string;
  salesMemberId: string;
  salesMemberName: string;
  trainerMemberId?: string;
  trainerMemberName?: string;
  scheduledAt: string;
  location?: string;
  status: TrialLessonStatus;
  contracted: boolean | null;
  contractPlan?: CustomerPlan;
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

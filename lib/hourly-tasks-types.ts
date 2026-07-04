export type HourlyTaskStatus = "scheduled" | "completed" | "cancelled";

export const HOURLY_TASK_STATUS_LABEL: Record<HourlyTaskStatus, string> = {
  scheduled: "予定",
  completed: "完了",
  cancelled: "キャンセル",
};

export interface HourlyTask {
  id: string;
  memberId: string;       // 割り当てられた担当者
  memberName?: string;
  title: string;          // 業務内容
  scheduledAt: string;    // 開始日時
  endAt: string;          // 終了日時
  hourlyRate: number;     // 時給（円）
  location?: string;
  note?: string;
  status: HourlyTaskStatus;
  createdById?: string;
  createdByName?: string;
  updatedById?: string;
  createdAt: string;
  updatedAt: string;
}

/** 業務の稼働時間（時間単位・小数） */
export function hourlyTaskHours(task: Pick<HourlyTask, "scheduledAt" | "endAt">): number {
  const minutes = (new Date(task.endAt).getTime() - new Date(task.scheduledAt).getTime()) / 60000;
  return Math.max(0, minutes) / 60;
}

/** 業務の支払い額（時給 × 稼働時間、円未満四捨五入） */
export function hourlyTaskAmount(task: Pick<HourlyTask, "scheduledAt" | "endAt" | "hourlyRate">): number {
  return Math.round(task.hourlyRate * hourlyTaskHours(task));
}

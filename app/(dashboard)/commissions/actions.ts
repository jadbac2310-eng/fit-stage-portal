"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, updateMember } from "@/lib/members";
import { logActivity } from "@/lib/activity-logs";

// 担当者のトレーナー歩合率（％）を設定する。管理者のみ。null で既定50%に戻す。
export async function setCommissionRateAction(memberId: string, rate: number | null) {
  await requireAdmin();
  const value = rate == null || Number.isNaN(rate) ? null : Math.max(0, Math.min(100, Math.round(rate)));
  await updateMember(memberId, { commissionRate: value });
  await logActivity({
    action: "update", entityType: "member", entityId: memberId,
    summary: `トレーナー歩合率を変更: ${value == null ? "既定50%" : `${value}%`}`,
  });
  revalidatePath("/commissions");
}

"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/members";
import { setMemberCustomerRate, deleteMemberCustomerRate } from "@/lib/commission-rates";
import { logActivity } from "@/lib/activity-logs";
import { runAction, ActionError, type ActionResult } from "@/lib/action-result";

// 担当者×顧客の歩合率（％）を設定する。管理者のみ。
export async function setMemberCustomerRateAction(memberId: string, customerId: string, rate: number): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    if (!memberId || !customerId) throw new ActionError("担当者と顧客を選択してください");
    const value = Math.max(0, Math.min(100, Math.round(rate)));
    await setMemberCustomerRate(memberId, customerId, value);
    await logActivity({
      action: "update", entityType: "member", entityId: memberId,
      summary: `担当者×顧客の歩合率を設定: ${value}%`,
    });
    revalidatePath("/commissions/rates");
    revalidatePath("/commissions");
  });
}

// 担当者×顧客の歩合率設定を削除（既定50%に戻す）。管理者のみ。
export async function deleteMemberCustomerRateAction(memberId: string, customerId: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    await deleteMemberCustomerRate(memberId, customerId);
    await logActivity({
      action: "update", entityType: "member", entityId: memberId,
      summary: "担当者×顧客の歩合率設定を削除（既定50%）",
    });
    revalidatePath("/commissions/rates");
    revalidatePath("/commissions");
  });
}

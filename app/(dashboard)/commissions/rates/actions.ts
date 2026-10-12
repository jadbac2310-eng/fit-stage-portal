"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/members";
import { setMemberCustomerRate, deleteMemberCustomerRate } from "@/lib/commission-rates";
import { logActivity } from "@/lib/activity-logs";
import { runAction, ActionError, type ActionResult } from "@/lib/action-result";

// 担当者×顧客の支払い条件を設定する。管理者のみ。
// fixedAmount を渡すと「1レッスンにつき○円」の固定払いになり、歩合率は使われない。
export async function setMemberCustomerRateAction(
  memberId: string, customerId: string, rate: number, fixedAmount?: number | null,
): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    if (!memberId || !customerId) throw new ActionError("担当者と顧客を選択してください");
    const value = Math.max(0, Math.min(100, Math.round(rate)));
    const fixed = fixedAmount == null ? null : Math.max(0, Math.round(fixedAmount));
    await setMemberCustomerRate(memberId, customerId, value, fixed);
    await logActivity({
      action: "update", entityType: "member", entityId: memberId,
      summary: fixed != null
        ? `担当者×顧客の支払いを固定額に設定: 1レッスン ¥${fixed.toLocaleString("ja-JP")}`
        : `担当者×顧客の歩合率を設定: ${value}%`,
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

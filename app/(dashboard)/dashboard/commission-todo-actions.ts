"use server";

import { revalidatePath } from "next/cache";
import { getCurrentMember } from "@/lib/members";
import { setCommissionPayoutStep } from "@/lib/commission-payouts";
import type { PayoutStep } from "@/lib/commission-payouts-types";
import { logActivity } from "@/lib/activity-logs";

/**
 * 「明細を送った」「振り込んだ」の印を付ける／外す。代表か管理者だけ。
 * 失敗の理由は文字で返す（投げると本番では伏せられて、押しても何も起きないように見えるため）。
 */
export async function setCommissionPayoutStepAction(
  memberId: string, memberName: string, month: string, step: PayoutStep, done: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const me = await getCurrentMember();
  if (!me?.isOwner && !me?.isAdmin) return { ok: false, error: "権限がありません" };
  if (!memberId || !/^\d{4}-\d{2}$/.test(month)) return { ok: false, error: "対象が分かりませんでした。画面を読み込み直してください" };
  try {
    await setCommissionPayoutStep(memberId, month, step, done);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "保存できませんでした" };
  }
  const what = step === "statement" ? "明細を送った" : "振り込んだ";
  await logActivity({
    action: "update", entityType: "commission_payout", entityId: memberId,
    summary: `コミッション ${month}：${memberName} ${what}${done ? "" : "（印を外した）"}`,
  });
  revalidatePath("/dashboard");
  return { ok: true };
}

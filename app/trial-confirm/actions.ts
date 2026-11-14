"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { recordTrialConfirmed } from "@/lib/activity-logs";
import { loadTrialConfirm } from "./load";

/**
 * お客様が「予約を確認しました」を押した（ログイン不要。リンクの署名で本人の予約だと分かる）。
 * 何度押されても記録は1回（同じ日時の予約で確認済みなら、そのまま成功を返す）。
 */
export async function confirmTrialAction(token: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const st = await loadTrialConfirm(token);
  if (st.kind === "done") return { ok: true };
  if (st.kind !== "open") return { ok: false, reason: st.kind };
  const ua = (await headers()).get("user-agent") ?? undefined;
  const saved = await recordTrialConfirmed(st.lesson.id, st.lesson.customerName, st.lesson.scheduledAt, ua);
  if (!saved) return { ok: false, reason: "save" };
  revalidatePath("/lessons/trial");
  return { ok: true };
}

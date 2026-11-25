"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { recordTrialConfirmed } from "@/lib/activity-logs";
import { getMembers } from "@/lib/members";
import { notifyMembersByLine } from "@/lib/line-notify";
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
  // 代表と担当トレーナーへ LINE（2026-11-25 尚樹）。お客様の画面は待たせない（返したあとで送る）
  const lesson = st.lesson, view = st.view;
  after(() => notifyTrialConfirmed(lesson, view));
  return { ok: true };
}

/**
 * お客様が予約を確認したことを、代表（is_owner）と担当トレーナーへ LINE で知らせる。
 * 確認は予約1回につき1度しか記録されないので、知らせも1度だけ。
 * 止めるときは LINE_NOTIFY_TRIAL_CONFIRMED=off。
 */
async function notifyTrialConfirmed(
  lesson: { customerName: string; trainerMemberId?: string; trainerMemberName?: string },
  view: { slot: string; storeName?: string },
): Promise<void> {
  if ((process.env.LINE_NOTIFY_TRIAL_CONFIRMED ?? "").trim().toLowerCase() === "off") return;
  try {
    const members = await getMembers();
    const ids = [...members.filter((m) => m.isOwner).map((m) => m.id), lesson.trainerMemberId ?? ""];
    const name = lesson.customerName.trim().replace(/[\s　]+/g, " ");
    const text = [
      "✅ 体験の予約確認が届きました",
      `${name} 様`,
      view.slot,
      view.storeName,
      lesson.trainerMemberName ? `担当：${lesson.trainerMemberName}` : undefined,
      "（確定メールの「予約を確認しました」が押されました）",
    ].filter(Boolean).join("\n");
    await notifyMembersByLine(ids, text, members);
  } catch (e) {
    console.error("[trial-confirm] LINE の知らせに失敗", e);
  }
}

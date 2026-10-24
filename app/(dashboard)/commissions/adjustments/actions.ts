"use server";

import { revalidatePath } from "next/cache";
import { getCurrentMember } from "@/lib/members";
import { runAction, ActionError, type ActionResult } from "@/lib/action-result";
import {
  addCommissionAdjustment,
  updateCommissionAdjustment,
  deleteCommissionAdjustment,
} from "@/lib/commission-adjustments";

async function assertAdmin() {
  const member = await getCurrentMember();
  if (!member?.isAdmin) throw new ActionError("管理者のみ操作できます");
  return member;
}

function refresh() {
  revalidatePath("/commissions/adjustments");
  revalidatePath("/commissions");
  revalidatePath("/commissions/statement");
}

/** 入力を読んで、マイナス／プラスの符号まで確定させる */
function readInput(formData: FormData) {
  const memberId = (formData.get("memberId") as string)?.trim();
  const month    = (formData.get("month")    as string)?.trim();
  const label    = (formData.get("label")    as string)?.trim();
  const note     = (formData.get("note")     as string)?.trim() || null;
  const kind     = (formData.get("kind")     as string)?.trim(); // deduct | add
  const raw      = (formData.get("amount")   as string)?.trim();

  if (!memberId) throw new ActionError("担当者を選んでください");
  if (!/^\d{4}-\d{2}$/.test(month ?? "")) throw new ActionError("対象月を選んでください");
  if (!label) throw new ActionError("内容を入れてください");

  // 画面では金額を必ず正の数で入力させ、「引く／足す」で符号を決める。
  // マイナスを手で打たせると符号の付け忘れで逆に足してしまう。
  const abs = Number(raw);
  if (!Number.isFinite(abs) || !Number.isInteger(abs) || abs <= 0) {
    throw new ActionError("金額は1円以上の整数で入れてください");
  }
  const amount = kind === "add" ? abs : -abs;

  return { memberId, month, label, amount, note };
}

export async function addCommissionAdjustmentAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    await addCommissionAdjustment(readInput(formData));
    refresh();
  });
}

export async function updateCommissionAdjustmentAction(id: string, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    if (!id) throw new ActionError("対象が見つかりません");
    await updateCommissionAdjustment(id, readInput(formData));
    refresh();
  });
}

export async function deleteCommissionAdjustmentAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await assertAdmin();
    if (!id) throw new ActionError("対象が見つかりません");
    await deleteCommissionAdjustment(id);
    refresh();
  });
}

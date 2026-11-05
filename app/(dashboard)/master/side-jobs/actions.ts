"use server";

import { revalidatePath } from "next/cache";
import { addSideJob, updateSideJob, deleteSideJob } from "@/lib/side-jobs";
import { requireAdmin, getCurrentMember } from "@/lib/members";
import { logActivity } from "@/lib/activity-logs";
import { runAction, ActionError, type ActionResult } from "@/lib/action-result";

function toInt(raw: FormDataEntryValue | null): number {
  const s = ((raw as string) ?? "").replace(/[,，\s円¥￥]/g, "").trim();
  if (s === "") return 0;
  return parseInt(s, 10);
}

/** フォームから単発の仕事の入力値を取り出す。金額は0以上の整数のみ */
function readForm(formData: FormData) {
  const doneOn = (formData.get("doneOn") as string)?.trim();
  const title  = (formData.get("title")  as string)?.trim();
  const client = (formData.get("client") as string)?.trim() || undefined;
  const vendor = (formData.get("vendor") as string)?.trim() || undefined;
  const note   = (formData.get("note")   as string)?.trim() || undefined;
  const payMethod = (formData.get("payMethod") as string)?.trim() || undefined;
  const paidOn    = (formData.get("paidOn")    as string)?.trim() || undefined;
  const amount = toInt(formData.get("amount"));
  const cost   = toInt(formData.get("cost"));

  if (!doneOn) throw new ActionError("日付を入力してください");
  if (!title)  throw new ActionError("内容を入力してください");
  if (!Number.isFinite(amount) || amount < 0) throw new ActionError("いただいた金額は0以上の数字で入力してください");
  if (!Number.isFinite(cost)   || cost < 0)   throw new ActionError("外注費は0以上の数字で入力してください");

  return { doneOn, title, client, vendor, note, amount, cost, payMethod, paidOn };
}

function refresh() {
  revalidatePath("/master/side-jobs");
  revalidatePath("/admin/dashboard");
}

export async function createSideJobAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    const input = readForm(formData);
    const me = await getCurrentMember();
    const created = await addSideJob({ ...input, createdBy: me?.id });
    await logActivity({
      action: "create", entityType: "side_job", entityId: created.id,
      summary: `単発の仕事を追加: ${input.title}${input.client ? `（${input.client}）` : ""} 売上${input.amount}円・外注${input.cost}円`,
    });
    refresh();
  });
}

export async function updateSideJobAction(id: string, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    const input = readForm(formData);
    await updateSideJob(id, input);
    await logActivity({
      action: "update", entityType: "side_job", entityId: id,
      summary: `単発の仕事を編集: ${input.title} 売上${input.amount}円・外注${input.cost}円`,
    });
    refresh();
  });
}

export async function deleteSideJobAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    await deleteSideJob(id);
    await logActivity({ action: "delete", entityType: "side_job", entityId: id, summary: "単発の仕事を削除" });
    refresh();
  });
}

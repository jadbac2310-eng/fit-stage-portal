"use server";

import { revalidatePath } from "next/cache";
import {
  updateSalesProgress, updateSalesStatus, addSalesTarget, deleteSalesTarget,
  addSalesTargetLog, deleteSalesTargetLog, getSalesTargetName, getSalesTargetLogAuthor,
} from "@/lib/sales-targets";
import { SALES_PRIORITIES, SALES_STATUSES } from "@/lib/sales-targets-types";
import { requireAdmin, getCurrentMember } from "@/lib/members";
import { logActivity } from "@/lib/activity-logs";
import { runAction, ActionError, type ActionResult } from "@/lib/action-result";

const PATH = "/sales";

/** 営業の書き込みはログイン中のメンバーなら誰でもできる（営業担当が自分で更新するため） */
async function requireMember() {
  const me = await getCurrentMember();
  if (!me) throw new ActionError("ログインし直してください");
  return me;
}

function text(fd: FormData, key: string): string | null {
  const v = (fd.get(key) as string | null)?.trim();
  return v ? v : null;
}

function checkStatus(status: string) {
  if (!SALES_STATUSES.some((s) => s.value === status)) throw new ActionError("状況の値が正しくありません");
}

export async function updateSalesProgressAction(id: string, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireMember();
    const status = text(fd, "status") ?? "未着手";
    checkStatus(status);
    const nextActionOn = text(fd, "nextActionOn");
    if (nextActionOn && !/^\d{4}-\d{2}-\d{2}$/.test(nextActionOn)) throw new ActionError("期日の形式が正しくありません");

    await updateSalesProgress(id, {
      assigneeId:    text(fd, "assigneeId"),
      status,
      nextAction:    text(fd, "nextAction"),
      nextActionOn,
      contactPerson: text(fd, "contactPerson"),
      contactInfo:   text(fd, "contactInfo"),
      memo:          text(fd, "memo"),
    });
    const name = await getSalesTargetName(id);
    await logActivity({ action: "update", entityType: "sales_target", entityId: id, summary: `営業先を更新: ${name ?? ""}（${status}）` });
    revalidatePath(PATH);
  });
}

export async function updateSalesStatusAction(id: string, status: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireMember();
    checkStatus(status);
    await updateSalesStatus(id, status);
    const name = await getSalesTargetName(id);
    await logActivity({ action: "update", entityType: "sales_target", entityId: id, summary: `営業先の状況を変更: ${name ?? ""} → ${status}` });
    revalidatePath(PATH);
  });
}

export async function addSalesLogAction(targetId: string, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireMember();
    const body = text(fd, "body");
    if (!body) throw new ActionError("内容を入力してください");
    await addSalesTargetLog(targetId, body, me.id);
    revalidatePath(PATH);
  });
}

export async function deleteSalesLogAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireMember();
    // 自分の記録か、管理者だけ消せる
    const owner = await getSalesTargetLogAuthor(id);
    if (owner !== me.id && !me.isAdmin) throw new ActionError("自分が書いた記録だけ削除できます");
    await deleteSalesTargetLog(id);
    revalidatePath(PATH);
  });
}

export async function createSalesTargetAction(fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    const me = await getCurrentMember();
    const name = text(fd, "name");
    const priority = text(fd, "priority") ?? "次点";
    if (!name) throw new ActionError("ホテル名を入力してください");
    if (!(SALES_PRIORITIES as readonly string[]).includes(priority)) throw new ActionError("優先度の値が正しくありません");
    try {
      const created = await addSalesTarget({
        priority, name,
        area:         text(fd, "area") ?? undefined,
        contactPoint: text(fd, "contactPoint") ?? undefined,
        pitch:        text(fd, "pitch") ?? undefined,
        createdBy:    me?.id,
      });
      await logActivity({ action: "create", entityType: "sales_target", entityId: created.id, summary: `営業先を追加: ${name}` });
    } catch (e) {
      if ((e as { code?: string }).code === "23505") throw new ActionError("同じ名前の営業先がすでにあります");
      throw e;
    }
    revalidatePath(PATH);
  });
}

export async function deleteSalesTargetAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    const name = await getSalesTargetName(id);
    await deleteSalesTarget(id);
    await logActivity({ action: "delete", entityType: "sales_target", entityId: id, summary: `営業先を削除: ${name ?? ""}` });
    revalidatePath(PATH);
  });
}

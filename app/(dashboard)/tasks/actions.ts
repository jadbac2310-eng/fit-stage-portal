"use server";

import { revalidatePath } from "next/cache";
import { addTask, deleteTask, getTask, patchTask, type Task } from "@/lib/tasks";
import { TASK_CATEGORIES, TASK_STATUSES } from "@/lib/tasks-types";
import { addPersonalEvent, deletePersonalEvent, updatePersonalEvent } from "@/lib/personal-events";
import { requireAdmin, getCurrentMember, type Member } from "@/lib/members";
import { notifyMembersByLine } from "@/lib/line-notify";
import { scheduleLink } from "@/lib/line-login";
import { logActivity } from "@/lib/activity-logs";
import { runAction, ActionError, type ActionResult } from "@/lib/action-result";

const PATH = "/tasks";

/** やることの書き込みはログイン中のメンバーなら誰でもできる */
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
  if (!(TASK_STATUSES as readonly string[]).includes(status)) throw new ActionError("状況の値が正しくありません");
}

function checkCategory(category: string) {
  if (!(TASK_CATEGORIES as readonly string[]).includes(category)) throw new ActionError("ジャンルの値が正しくありません");
}

function checkDate(v: string | null) {
  if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new ActionError("期限の形式が正しくありません");
}

function isDuplicateTitle(e: unknown): boolean {
  return (e as { code?: string } | null)?.code === "23505";
}

function readFields(fd: FormData) {
  const title = text(fd, "title");
  if (!title) throw new ActionError("やることを入力してください");
  const category = text(fd, "category") ?? "その他";
  checkCategory(category);
  const dueOn = text(fd, "dueOn");
  checkDate(dueOn);
  return { title, category, dueOn, assigneeId: text(fd, "assigneeId"), memo: text(fd, "memo") };
}

/**
 * 期限と担当があればスケジュール（終日の個人予定）に入れる。
 * 完了・期限なし・担当なしなら予定を消す。予定の持ち主＝担当者。
 * 返り値は今の event_id（無ければ null）。
 */
async function syncEvent(task: Task, me: Member): Promise<string | null> {
  const wants = !!task.dueOn && !!task.assigneeId && task.status !== "完了";
  const startAt = task.dueOn ? `${task.dueOn}T00:00:00+09:00` : null;
  const title = `【やること】${task.title}`;
  const memo = [task.memo, `登録: ${me.name}（やることページ）`].filter(Boolean).join("\n");

  if (!wants) {
    if (task.eventId) {
      try { await deletePersonalEvent(task.eventId); } catch (e) { console.error("[tasks] 予定の削除に失敗", e); }
    }
    return null;
  }

  if (task.eventId) {
    // 持ち主（担当）は作り直さないと変えられないので、消して入れ直す
    const updated = await updatePersonalEvent(task.eventId, { title, startAt: startAt!, endAt: null, memo, allDay: true }).catch(() => null);
    if (updated && updated.memberId === task.assigneeId) return task.eventId;
    try { await deletePersonalEvent(task.eventId); } catch { /* 既に無い */ }
  }
  const ev = await addPersonalEvent({
    memberId: task.assigneeId!, title, allDay: true, startAt: startAt!, endAt: null,
    memo, color: "amber", participantIds: [], notify: true, isPrivate: false,
  });
  return ev.id;
}

/** 担当が自分以外の人に新しく付いたら、その人へLINEで知らせる */
async function notifyAssignee(task: Task, prevAssigneeId: string | undefined, me: Member) {
  if (!task.assigneeId || task.assigneeId === prevAssigneeId || task.assigneeId === me.id) return;
  if (task.status === "完了") return;
  const due = task.dueOn ? `\n期限: ${task.dueOn.slice(5).replace("-", "/")}` : "";
  await notifyMembersByLine([task.assigneeId], (m) =>
    `📝 やることが割り当てられました\n${task.title}${due}\n登録: ${me.name}${scheduleLink(m)}`);
}

// ─── 追加・編集 ─────────────────────────────────────

export async function createTaskAction(fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireMember();
    const input = readFields(fd);
    let created: Task;
    try { created = await addTask({ ...input, createdBy: me.id }); }
    catch (e) { if (isDuplicateTitle(e)) throw new ActionError("同じやることがすでにあります"); throw e; }

    const eventId = await syncEvent(created, me);
    if (eventId) await patchTask(created.id, { eventId });
    await notifyAssignee(created, undefined, me);
    await logActivity({ action: "create", entityType: "task", entityId: created.id, summary: `やることを追加: ${input.title}`, memberId: me.id, memberName: me.name });
    revalidatePath(PATH);
    if (eventId) revalidatePath("/schedule");
  });
}

export async function updateTaskAction(id: string, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireMember();
    const current = await getTask(id);
    if (!current) throw new ActionError("やることが見つかりません。画面を読み込み直してください");
    const input = readFields(fd);
    try { await patchTask(id, input); }
    catch (e) { if (isDuplicateTitle(e)) throw new ActionError("同じやることがすでにあります"); throw e; }

    const next: Task = { ...current, ...input, assigneeId: input.assigneeId ?? undefined, dueOn: input.dueOn ?? undefined, memo: input.memo ?? undefined };
    const eventId = await syncEvent(next, me);
    if (eventId !== (current.eventId ?? null)) await patchTask(id, { eventId });
    await notifyAssignee(next, current.assigneeId, me);
    await logActivity({ action: "update", entityType: "task", entityId: id, summary: `やることを更新: ${input.title}`, memberId: me.id, memberName: me.name });
    revalidatePath(PATH);
    revalidatePath("/schedule");
  });
}

export async function updateTaskStatusAction(id: string, status: string): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireMember();
    checkStatus(status);
    const current = await getTask(id);
    if (!current) throw new ActionError("やることが見つかりません。画面を読み込み直してください");
    const done = status === "完了";
    await patchTask(id, { status, completedAt: done ? new Date().toISOString() : null });

    const next: Task = { ...current, status };
    const eventId = await syncEvent(next, me);
    if (eventId !== (current.eventId ?? null)) await patchTask(id, { eventId });
    await logActivity({ action: "update", entityType: "task", entityId: id, summary: `やることの状況を変更: ${current.title} → ${status}`, memberId: me.id, memberName: me.name });
    revalidatePath(PATH);
    revalidatePath("/schedule");
  });
}

export async function deleteTaskAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireMember();
    const t = await getTask(id);
    if (!t) return;
    // 自分が作ったものか、管理者だけ消せる
    if (t.createdById !== me.id) await requireAdmin();
    await deleteTask(id);
    if (t.eventId) {
      try { await deletePersonalEvent(t.eventId); } catch (e) { console.error("[tasks] 予定の削除に失敗", e); }
      revalidatePath("/schedule");
    }
    await logActivity({ action: "delete", entityType: "task", entityId: id, summary: `やることを削除: ${t.title}`, memberId: me.id, memberName: me.name });
    revalidatePath(PATH);
  });
}

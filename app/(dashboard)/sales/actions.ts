"use server";

import { revalidatePath } from "next/cache";
import {
  updateSalesProgress, updateSalesInfo, patchSalesTarget, addSalesTarget, deleteSalesTarget,
  addSalesTargetLog, deleteSalesTargetLog, getSalesTarget, getSalesTargetLog,
} from "@/lib/sales-targets";
import { SALES_PRIORITIES, SALES_STATUSES, LOG_KINDS, statusAfterLog } from "@/lib/sales-targets-types";
import { addPersonalEvent, deletePersonalEvent } from "@/lib/personal-events";
import type { EventColor } from "@/lib/personal-events-types";
import { requireAdmin, getCurrentMember } from "@/lib/members";
import { notifyMembersByLine, jstDateLabel, jstTimeStr } from "@/lib/line-notify";
import { scheduleLink } from "@/lib/line-login";
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

function checkPriority(priority: string) {
  if (!(SALES_PRIORITIES as readonly string[]).includes(priority)) throw new ActionError("優先度の値が正しくありません");
}

function checkDate(v: string | null, label: string) {
  if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new ActionError(`${label}の形式が正しくありません`);
}

const EVENT_COLOR: Record<string, EventColor> = { "アポ": "amber", "訪問": "purple", "電話": "gray" };

// ─── 進み具合 ─────────────────────────────────────────

export async function updateSalesProgressAction(id: string, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireMember();
    const status = text(fd, "status") ?? "未着手";
    checkStatus(status);
    const nextActionOn = text(fd, "nextActionOn");
    checkDate(nextActionOn, "期日");

    await updateSalesProgress(id, {
      assigneeId:    text(fd, "assigneeId"),
      status,
      nextAction:    text(fd, "nextAction"),
      nextActionOn,
      contactPerson: text(fd, "contactPerson"),
      contactInfo:   text(fd, "contactInfo"),
      memo:          text(fd, "memo"),
    });
    const t = await getSalesTarget(id);
    await logActivity({ action: "update", entityType: "sales_target", entityId: id, summary: `ホテル営業を更新: ${t?.name ?? ""}（${status}）` });
    revalidatePath(PATH);
  });
}

export async function updateSalesStatusAction(id: string, status: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireMember();
    checkStatus(status);
    await patchSalesTarget(id, { status });
    const t = await getSalesTarget(id);
    await logActivity({ action: "update", entityType: "sales_target", entityId: id, summary: `ホテル営業の状況を変更: ${t?.name ?? ""} → ${status}` });
    revalidatePath(PATH);
  });
}

// ─── ホテル情報 ───────────────────────────────────────

function readInfo(fd: FormData) {
  const name = text(fd, "name");
  const priority = text(fd, "priority") ?? "中";
  if (!name) throw new ActionError("ホテル名を入力してください");
  checkPriority(priority);
  const url = text(fd, "url");
  if (url && !/^https?:\/\//.test(url)) throw new ActionError("公式サイトは https:// から入力してください");
  return {
    name, priority, url,
    area:         text(fd, "area"),
    contactPoint: text(fd, "contactPoint"),
    pitch:        text(fd, "pitch"),
    hotelInfo:    text(fd, "hotelInfo"),
  };
}

function isDuplicateName(e: unknown): boolean {
  return (e as { code?: string } | null)?.code === "23505";
}

export async function updateSalesInfoAction(id: string, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireMember();
    const input = readInfo(fd);
    try { await updateSalesInfo(id, input); }
    catch (e) { if (isDuplicateName(e)) throw new ActionError("同じ名前のホテルがすでにあります"); throw e; }
    await logActivity({ action: "update", entityType: "sales_target", entityId: id, summary: `ホテル情報を更新: ${input.name}` });
    revalidatePath(PATH);
  });
}

export async function createSalesTargetAction(fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireMember();
    const input = readInfo(fd);
    try {
      const created = await addSalesTarget({
        priority:     input.priority,
        name:         input.name,
        area:         input.area ?? undefined,
        contactPoint: input.contactPoint ?? undefined,
        pitch:        input.pitch ?? undefined,
        hotelInfo:    input.hotelInfo ?? undefined,
        url:          input.url ?? undefined,
        createdBy:    me.id,
      });
      await logActivity({ action: "create", entityType: "sales_target", entityId: created.id, summary: `ホテル営業に追加: ${input.name}` });
    } catch (e) {
      if (isDuplicateName(e)) throw new ActionError("同じ名前のホテルがすでにあります");
      throw e;
    }
    revalidatePath(PATH);
  });
}

export async function deleteSalesTargetAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    const t = await getSalesTarget(id);
    await deleteSalesTarget(id);
    await logActivity({ action: "delete", entityType: "sales_target", entityId: id, summary: `ホテル営業から削除: ${t?.name ?? ""}` });
    revalidatePath(PATH);
  });
}

// ─── やりとりの記録（引き継ぎ） ─────────────────────────────

export async function addSalesLogAction(targetId: string, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireMember();
    const target = await getSalesTarget(targetId);
    if (!target) throw new ActionError("ホテルが見つかりません。画面を読み込み直してください");

    const kind = text(fd, "kind") ?? "メモ";
    const kindDef = LOG_KINDS.find((k) => k.value === kind);
    if (!kindDef) throw new ActionError("種類の値が正しくありません");

    const date = text(fd, "date");
    const time = text(fd, "time");
    checkDate(date, "日付");
    if (time && !/^\d{2}:\d{2}$/.test(time)) throw new ActionError("時刻の形式が正しくありません");
    if (kind === "アポ" && (!date || !time)) throw new ActionError("アポの日付と時刻を入れてください");
    const occurredAt = date ? `${date}T${time ?? "00:00"}:00+09:00` : null;

    const person = text(fd, "person");
    const body = text(fd, "body") ?? (kind === "メモ" ? null : kind);
    if (!body) throw new ActionError("内容を入力してください");

    const nextAction = text(fd, "nextAction");
    const nextActionOn = text(fd, "nextActionOn");
    checkDate(nextActionOn, "次にやることの期日");

    // 電話・アポ・訪問はスケジュールにも入れる（担当者の予定。記録した人が別なら参加者に入れる）
    let eventId: string | null = null;
    if (kindDef.schedule && occurredAt && time) {
      const ownerId = target.assigneeId ?? me.id;
      const participantIds = ownerId === me.id ? [] : [me.id];
      const isFuture = new Date(occurredAt).getTime() > Date.now();
      const title = `【営業】${target.name} ${kind}`;
      const memo = [person ? `先方: ${person}` : null, body !== kind ? body : null, `記録: ${me.name}（ホテル営業ページ）`]
        .filter(Boolean).join("\n");
      const location = kind === "電話" ? null : target.name;
      const ev = await addPersonalEvent({
        memberId: ownerId, title, allDay: false, startAt: occurredAt,
        endAt: kind === "電話" ? null : new Date(new Date(occurredAt).getTime() + 60 * 60 * 1000).toISOString(),
        location, memo, color: EVENT_COLOR[kind] ?? "blue",
        participantIds, notify: isFuture, isPrivate: false,
      });
      eventId = ev.id;

      // これからの予定なら、記録した本人以外へLINEで知らせる
      if (isFuture) {
        await notifyMembersByLine(
          [ownerId, ...participantIds].filter((id) => id !== me.id),
          (m) => `🗓 予定に追加されました\n${title}\n${jstDateLabel(occurredAt)} ${jstTimeStr(occurredAt)}${location ? `\n＠${location}` : ""}\n登録: ${me.name}${scheduleLink(m)}`,
        );
      }
    }

    await addSalesTargetLog({ targetId, kind, occurredAt, person, body, eventId, createdBy: me.id });

    // 状況を進める・次にやることを書き換える・先方の担当者が空なら入れる
    const nextStatus = statusAfterLog(target.status, kind);
    await patchSalesTarget(targetId, {
      ...(nextStatus ? { status: nextStatus } : {}),
      ...(nextAction || nextActionOn ? { nextAction, nextActionOn } : {}),
      ...(person && !target.contactPerson ? { contactPerson: person } : {}),
    });

    await logActivity({ action: "create", entityType: "sales_target_log", entityId: targetId, summary: `ホテル営業の記録: ${target.name}（${kind}）` });
    revalidatePath(PATH);
    if (eventId) revalidatePath("/schedule");
  });
}

export async function deleteSalesLogAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireMember();
    const log = await getSalesTargetLog(id);
    if (!log) return;
    // 自分の記録か、管理者だけ消せる
    if (log.createdById !== me.id && !me.isAdmin) throw new ActionError("自分が書いた記録だけ削除できます");
    await deleteSalesTargetLog(id);
    // スケジュールに入れた予定も消す
    if (log.eventId) {
      try { await deletePersonalEvent(log.eventId); } catch (e) { console.error("[sales] 予定の削除に失敗", e); }
      revalidatePath("/schedule");
    }
    revalidatePath(PATH);
  });
}

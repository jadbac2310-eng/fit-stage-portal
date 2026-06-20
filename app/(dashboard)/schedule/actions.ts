"use server";

import { revalidatePath } from "next/cache";
import { getCurrentMember } from "@/lib/members";
import { logActivity } from "@/lib/activity-logs";
import {
  addPersonalEvent, updatePersonalEvent, deletePersonalEvent, getPersonalEvent,
} from "@/lib/personal-events";
import { normalizeColor } from "@/lib/personal-events-types";
import { notifyMembersByLine, jstDateLabel, jstTimeStr } from "@/lib/line-notify";
import { scheduleLink } from "@/lib/line-login";

// 予定の日時ラベル（日本時間）
function whenLabel(startAt: string, allDay: boolean): string {
  return allDay ? `${jstDateLabel(startAt)} 終日` : `${jstDateLabel(startAt)} ${jstTimeStr(startAt)}`;
}

// 日付(YYYY-MM-DD)＋時刻(HH:MM)をJST固定のISO文字列にする
function toIso(date: string, time: string): string {
  return `${date}T${time}:00+09:00`;
}

// 参加者(担当者id)の配列を hidden input(JSON) から取り出す
function parseParticipantIds(formData: FormData): string[] {
  try {
    const raw = JSON.parse((formData.get("participantIds") as string) || "[]");
    return Array.isArray(raw) ? raw.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function buildTimes(formData: FormData): { allDay: boolean; startAt: string; endAt: string | null } {
  const allDay    = formData.get("allDay") === "on";
  const startDate = (formData.get("startDate") as string)?.trim();
  const startTime = (formData.get("startTime") as string)?.trim() || "00:00";
  const endDate   = (formData.get("endDate")   as string)?.trim() || startDate;
  const endTime   = (formData.get("endTime")   as string)?.trim();

  if (!startDate) throw new Error("開始日を入力してください");

  if (allDay) {
    return { allDay: true, startAt: toIso(startDate, "00:00"), endAt: toIso(endDate, "00:00") };
  }
  const startAt = toIso(startDate, startTime);
  const endAt   = endTime ? toIso(endDate, endTime) : null;
  return { allDay: false, startAt, endAt };
}

export async function createPersonalEventAction(formData: FormData) {
  const member = await getCurrentMember();
  if (!member) throw new Error("ログインが必要です");

  const title = (formData.get("title") as string)?.trim();
  if (!title) throw new Error("タイトルを入力してください");

  const { allDay, startAt, endAt } = buildTimes(formData);
  const location = (formData.get("location") as string)?.trim() || null;
  const memo     = (formData.get("memo")     as string)?.trim() || null;
  const color    = normalizeColor((formData.get("color") as string)?.trim());
  const participantIds = parseParticipantIds(formData);

  const created = await addPersonalEvent({ memberId: member.id, title, allDay, startAt, endAt, location, memo, color, participantIds });
  await logActivity({ action: "create", entityType: "personal_event", entityId: created.id, summary: `個人予定を追加: ${title}`, memberId: member.id, memberName: member.name });

  // 参加者へ LINE 通知（作成者本人は除く）
  await notifyMembersByLine(
    participantIds.filter((id) => id !== member.id),
    (m) => `🗓 予定に追加されました\n${title}\n${whenLabel(startAt, allDay)}${location ? `\n＠${location}` : ""}\n登録: ${member.name}${scheduleLink(m)}`,
  );
  revalidatePath("/schedule");
}

export async function updatePersonalEventAction(id: string, formData: FormData) {
  const [member, event] = await Promise.all([getCurrentMember(), getPersonalEvent(id)]);
  if (!member) throw new Error("ログインが必要です");
  if (!event)  throw new Error("予定が見つかりません");
  if (event.memberId !== member.id && !member.isAdmin) {
    throw new Error("この予定を編集できるのは作成者または管理者のみです");
  }

  const title = (formData.get("title") as string)?.trim();
  if (!title) throw new Error("タイトルを入力してください");

  const { allDay, startAt, endAt } = buildTimes(formData);
  const location = (formData.get("location") as string)?.trim() || null;
  const memo     = (formData.get("memo")     as string)?.trim() || null;
  const color    = normalizeColor((formData.get("color") as string)?.trim());
  const participantIds = parseParticipantIds(formData);

  await updatePersonalEvent(id, { title, allDay, startAt, endAt, location, memo, color, participantIds });
  await logActivity({ action: "update", entityType: "personal_event", entityId: id, summary: `個人予定を編集: ${title}`, memberId: member.id, memberName: member.name });

  // 参加者（変更後）へ LINE 通知（編集者本人は除く）
  await notifyMembersByLine(
    participantIds.filter((pid) => pid !== member.id),
    (m) => `✏️ 予定が変更されました\n${title}\n${whenLabel(startAt, allDay)}${location ? `\n＠${location}` : ""}\n変更: ${member.name}${scheduleLink(m)}`,
  );
  revalidatePath("/schedule");
}

export async function deletePersonalEventAction(id: string) {
  const [member, event] = await Promise.all([getCurrentMember(), getPersonalEvent(id)]);
  if (!member) throw new Error("ログインが必要です");
  if (!event)  throw new Error("予定が見つかりません");
  if (event.memberId !== member.id && !member.isAdmin) {
    throw new Error("この予定を削除できるのは作成者または管理者のみです");
  }

  await deletePersonalEvent(id);
  await logActivity({ action: "delete", entityType: "personal_event", entityId: id, summary: `個人予定を削除: ${event.title}`, memberId: member.id, memberName: member.name });

  // 参加者へ LINE 通知（削除した本人は除く）
  await notifyMembersByLine(
    event.participantIds.filter((pid) => pid !== member.id),
    (m) => `❌ 予定が削除されました\n${event.title}\n${whenLabel(event.startAt, event.allDay)}\n削除: ${member.name}${scheduleLink(m)}`,
  );
  revalidatePath("/schedule");
}

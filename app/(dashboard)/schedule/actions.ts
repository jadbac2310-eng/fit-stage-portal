"use server";

import { revalidatePath } from "next/cache";
import { getCurrentMember, requireAdmin, getMember } from "@/lib/members";
import { logActivity } from "@/lib/activity-logs";
import {
  addPersonalEvent, updatePersonalEvent, deletePersonalEvent, getPersonalEvent,
} from "@/lib/personal-events";
import { normalizeColor } from "@/lib/personal-events-types";
import { notifyMembersByLine, jstDateLabel, jstTimeStr } from "@/lib/line-notify";
import { scheduleLink } from "@/lib/line-login";
import {
  addHourlyTask, updateHourlyTask, deleteHourlyTask, getHourlyTask,
} from "@/lib/hourly-tasks";
import type { HourlyTaskStatus } from "@/lib/hourly-tasks-types";

// 予定の日時ラベル（日本時間）
function whenLabel(startAt: string, allDay: boolean): string {
  return allDay ? `${jstDateLabel(startAt)} 終日` : `${jstDateLabel(startAt)} ${jstTimeStr(startAt)}`;
}

// 日付(YYYY-MM-DD)＋時刻(HH:MM)をJST固定のISO文字列にする
function toIso(date: string, time: string): string {
  return `${date}T${time}:00+09:00`;
}

// 明示的な日時値から開始/終了ISOを組み立てる（複数日時作成で使う）
function toTimes(
  allDay: boolean,
  startDate: string,
  startTime?: string,
  endDate?: string,
  endTime?: string,
): { allDay: boolean; startAt: string; endAt: string | null } {
  if (!startDate) throw new Error("開始日を入力してください");
  const ed = endDate || startDate;
  if (allDay) return { allDay: true, startAt: toIso(startDate, "00:00"), endAt: toIso(ed, "00:00") };
  const startAt = toIso(startDate, startTime || "00:00");
  const endAt = endTime ? toIso(ed, endTime) : null;
  return { allDay: false, startAt, endAt };
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
  const notify   = formData.get("notify") === "on";
  const isPrivate = formData.get("isPrivate") === "on";

  const created = await addPersonalEvent({ memberId: member.id, title, allDay, startAt, endAt, location, memo, color, participantIds, notify, isPrivate });
  await logActivity({ action: "create", entityType: "personal_event", entityId: created.id, summary: `個人予定を追加: ${title}`, memberId: member.id, memberName: member.name });

  // 参加者へ LINE 通知（作成者本人は除く）。通知OFFのときは送らない
  if (notify) {
    await notifyMembersByLine(
      participantIds.filter((id) => id !== member.id),
      (m) => `🗓 予定に追加されました\n${title}\n${whenLabel(startAt, allDay)}${location ? `\n＠${location}` : ""}\n登録: ${member.name}${scheduleLink(m)}`,
    );
  }
  revalidatePath("/schedule");
}

type Slot = { startDate: string; startTime?: string; endDate?: string; endTime?: string };

// 同じ内容の個人予定を複数日時に一括作成する（手動の複数日時・繰り返しの両方で使う）。
// slots は [{startDate, startTime, endDate, endTime}, ...] の JSON。
export async function createPersonalEventsAction(formData: FormData) {
  const member = await getCurrentMember();
  if (!member) throw new Error("ログインが必要です");

  const title = (formData.get("title") as string)?.trim();
  if (!title) throw new Error("タイトルを入力してください");

  const allDay   = formData.get("allDay") === "on";
  const location = (formData.get("location") as string)?.trim() || null;
  const memo     = (formData.get("memo")     as string)?.trim() || null;
  const color    = normalizeColor((formData.get("color") as string)?.trim());
  const participantIds = parseParticipantIds(formData);
  const notify   = formData.get("notify") === "on";
  const isPrivate = formData.get("isPrivate") === "on";

  let slots: Slot[] = [];
  try {
    const raw = JSON.parse((formData.get("slots") as string) || "[]");
    if (Array.isArray(raw)) slots = raw.filter((s) => s && typeof s.startDate === "string" && s.startDate);
  } catch {
    slots = [];
  }
  if (slots.length === 0) throw new Error("日時を入力してください");
  if (slots.length > 200) throw new Error("作成できる日時は最大200件です。繰り返しの終了日を見直してください。");

  const starts: string[] = [];
  for (const s of slots) {
    const t = toTimes(allDay, s.startDate, s.startTime, s.endDate, s.endTime);
    await addPersonalEvent({ memberId: member.id, title, allDay: t.allDay, startAt: t.startAt, endAt: t.endAt, location, memo, color, participantIds, notify, isPrivate });
    starts.push(t.startAt);
  }
  await logActivity({ action: "create", entityType: "personal_event", entityId: member.id, summary: `個人予定を${starts.length}件追加: ${title}`, memberId: member.id, memberName: member.name });

  // 参加者へ LINE 通知（作成者本人は除く）。通知OFFのときは送らない。複数日時はまとめて1通。
  if (notify) {
    const dates = starts.slice().sort().map((iso) => whenLabel(iso, allDay));
    const body = `🗓 予定に追加されました\n${title}\n${dates.join("\n")}${location ? `\n＠${location}` : ""}\n登録: ${member.name}`;
    await notifyMembersByLine(
      participantIds.filter((id) => id !== member.id),
      (m) => `${body}${scheduleLink(m)}`,
    );
  }
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
  const notify   = formData.get("notify") === "on";
  const isPrivate = formData.get("isPrivate") === "on";

  await updatePersonalEvent(id, { title, allDay, startAt, endAt, location, memo, color, participantIds, notify, isPrivate });
  await logActivity({ action: "update", entityType: "personal_event", entityId: id, summary: `個人予定を編集: ${title}`, memberId: member.id, memberName: member.name });

  // 参加者（変更後）へ LINE 通知（編集者本人は除く）。通知OFFのときは送らない
  if (notify) {
    await notifyMembersByLine(
      participantIds.filter((pid) => pid !== member.id),
      (m) => `✏️ 予定が変更されました\n${title}\n${whenLabel(startAt, allDay)}${location ? `\n＠${location}` : ""}\n変更: ${member.name}${scheduleLink(m)}`,
    );
  }
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

  // 参加者へ LINE 通知（削除した本人は除く）。通知OFFの予定は送らない
  if (event.notify) {
    await notifyMembersByLine(
      event.participantIds.filter((pid) => pid !== member.id),
      (m) => `❌ 予定が削除されました\n${event.title}\n${whenLabel(event.startAt, event.allDay)}\n削除: ${member.name}${scheduleLink(m)}`,
    );
  }
  revalidatePath("/schedule");
}

// ─── 時給業務（管理者のみ・スケジュールから割り当てる） ───────
function hourlyTaskTimes(formData: FormData): { scheduledAt: string; endAt: string } {
  const startDate = (formData.get("startDate") as string)?.trim();
  const startTime = (formData.get("startTime") as string)?.trim();
  const endDate   = (formData.get("endDate")   as string)?.trim() || startDate;
  const endTime   = (formData.get("endTime")   as string)?.trim();
  if (!startDate || !startTime || !endTime) throw new Error("開始・終了の日時を入力してください");
  return { scheduledAt: toIso(startDate, startTime), endAt: toIso(endDate, endTime) };
}

export async function createHourlyTaskAction(formData: FormData) {
  await requireAdmin();
  const admin = await getCurrentMember();

  const memberId   = (formData.get("memberId")   as string)?.trim();
  const title      = (formData.get("title")      as string)?.trim();
  const rateRaw    = (formData.get("hourlyRate")  as string)?.trim();
  const hourlyRate = parseInt(rateRaw, 10);
  const location   = (formData.get("location")    as string)?.trim() || undefined;
  const note       = (formData.get("note")        as string)?.trim() || undefined;

  if (!memberId || !title || !Number.isFinite(hourlyRate)) {
    throw new Error("必須項目が未入力です");
  }
  const { scheduledAt, endAt } = hourlyTaskTimes(formData);

  const assignee = await getMember(memberId);
  const created = await addHourlyTask({ memberId, title, scheduledAt, endAt, hourlyRate, location, note, createdBy: admin?.id });
  await logActivity({
    action: "create", entityType: "hourly_task", entityId: created.id,
    summary: `時給業務を追加: ${assignee?.name ?? ""} ${title}`,
  });
  revalidatePath("/schedule");
}

export async function updateHourlyTaskAction(id: string, formData: FormData) {
  await requireAdmin();

  const memberId   = (formData.get("memberId")   as string)?.trim();
  const title      = (formData.get("title")      as string)?.trim();
  const rateRaw    = (formData.get("hourlyRate")  as string)?.trim();
  const hourlyRate = parseInt(rateRaw, 10);
  const location   = (formData.get("location")    as string)?.trim() || null;
  const note       = (formData.get("note")        as string)?.trim() || null;
  const status     = (formData.get("status")      as string)?.trim() as HourlyTaskStatus;

  if (!memberId || !title || !Number.isFinite(hourlyRate)) {
    throw new Error("必須項目が未入力です");
  }
  const { scheduledAt, endAt } = hourlyTaskTimes(formData);

  await updateHourlyTask(id, { memberId, title, scheduledAt, endAt, hourlyRate, location, note, status });
  await logActivity({ action: "update", entityType: "hourly_task", entityId: id, summary: `時給業務を編集: ${title}` });
  revalidatePath("/schedule");
}

export async function deleteHourlyTaskAction(id: string) {
  await requireAdmin();
  const task = await getHourlyTask(id);
  await deleteHourlyTask(id);
  await logActivity({ action: "delete", entityType: "hourly_task", entityId: id, summary: `時給業務を削除: ${task?.title ?? ""}` });
  revalidatePath("/schedule");
}

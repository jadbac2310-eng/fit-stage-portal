"use server";

import { revalidatePath } from "next/cache";
import { addLesson, updateLesson, deleteLesson, getLesson } from "@/lib/lessons";
import { addSessionPass, deleteSessionPass, decrementSessionPass, incrementSessionPass } from "@/lib/session-passes";
import { courseToPaymentType } from "@/lib/lessons-types";
import { requireAdmin, getCurrentMember } from "@/lib/members";
import { logActivity } from "@/lib/activity-logs";
import type { Lesson, LessonStatus } from "@/lib/lessons-types";

// レッスンの編集/削除は「管理者」または「追加した本人」のみ許可する。
// 作成者が記録されていない（旧データ）場合は管理者のみ。
async function assertCanEditLesson(id: string): Promise<{ lesson: Lesson; isAdmin: boolean }> {
  const [member, lesson] = await Promise.all([getCurrentMember(), getLesson(id)]);
  if (!member) throw new Error("ログインが必要です");
  if (!lesson) throw new Error("レッスンが見つかりません");
  const canEdit = member.isAdmin || (!!lesson.createdById && lesson.createdById === member.id);
  if (!canEdit) throw new Error("このレッスンを編集できるのは追加した本人または管理者のみです");
  return { lesson, isAdmin: member.isAdmin };
}

// ─── レッスン ─────────────────────────────────────────
export async function createLessonAction(formData: FormData) {
  const member = await getCurrentMember();
  if (!member) throw new Error("ログインが必要です");

  const customerId      = (formData.get("customerId")      as string)?.trim();
  const trainerMemberId = (formData.get("trainerMemberId") as string)?.trim() || undefined;
  const scheduledAt     = (formData.get("scheduledAt")     as string)?.trim();
  const endAt           = (formData.get("endAt")           as string)?.trim() || null;
  const location        = (formData.get("location")        as string)?.trim() || undefined;
  const course          = (formData.get("course")          as string)?.trim() || undefined;
  const sessionPassId   = (formData.get("sessionPassId")   as string)?.trim() || undefined;
  const note            = (formData.get("note")            as string)?.trim() || undefined;
  const rentalGymId     = (formData.get("rentalGymId")     as string)?.trim() || null;
  const rgfRaw          = (formData.get("rentalGymFee")    as string)?.trim();
  const rentalGymFee    = rentalGymId && rgfRaw ? parseInt(rgfRaw, 10) : null;
  const storeId         = (formData.get("storeId")         as string)?.trim() || null;
  const sfRaw           = (formData.get("storeFee")        as string)?.trim();
  const storeFee        = storeId && sfRaw ? parseInt(sfRaw, 10) : null;
  const amtRaw          = (formData.get("amount")          as string)?.trim();
  const amount          = amtRaw ? parseInt(amtRaw, 10) : null;

  if (!customerId || !scheduledAt) return;

  const paymentType = courseToPaymentType(course) ?? undefined;

  const created = await addLesson({ customerId, trainerMemberId, scheduledAt, endAt, location, course, paymentType, sessionPassId, amount, note, createdBy: member.id, rentalGymId, rentalGymFee, storeId, storeFee });

  if (paymentType === "session_pass" && sessionPassId) {
    await decrementSessionPass(sessionPassId);
  }

  await logActivity({ action: "create", entityType: "lesson", entityId: created.id, summary: `通常レッスンを追加: ${created.customerName}`, memberId: member.id, memberName: member.name });
  revalidatePath("/lessons/regular");
  revalidatePath("/schedule");
}

export async function updateLessonAction(id: string, formData: FormData) {
  const { lesson: existing } = await assertCanEditLesson(id);
  const trainerMemberId = (formData.get("trainerMemberId") as string)?.trim() || null;
  const scheduledAt     = (formData.get("scheduledAt")     as string)?.trim();
  const endAt           = (formData.get("endAt")           as string)?.trim() || null;
  const location        = (formData.get("location")        as string)?.trim() || null;
  const course          = (formData.get("course")          as string)?.trim() || null;
  const sessionPassId   = (formData.get("sessionPassId")   as string)?.trim() || null;
  const status          = (formData.get("status")          as string)?.trim() as LessonStatus;
  const note            = (formData.get("note")            as string)?.trim() || null;
  const rentalGymId     = (formData.get("rentalGymId")     as string)?.trim() || null;
  const rgfRaw          = (formData.get("rentalGymFee")    as string)?.trim();
  const rentalGymFee    = rentalGymId && rgfRaw ? parseInt(rgfRaw, 10) : null;
  const storeId         = (formData.get("storeId")         as string)?.trim() || null;
  const sfRaw           = (formData.get("storeFee")        as string)?.trim();
  const storeFee        = storeId && sfRaw ? parseInt(sfRaw, 10) : null;
  const amtRaw          = (formData.get("amount")          as string)?.trim();
  const amount          = amtRaw ? parseInt(amtRaw, 10) : null;

  if (!scheduledAt) return;

  const paymentType = courseToPaymentType(course ?? undefined) ?? null;

  const oldPassId = existing?.sessionPassId ?? null;

  if (oldPassId !== sessionPassId) {
    if (oldPassId) await incrementSessionPass(oldPassId);
    if (sessionPassId && paymentType === "session_pass") await decrementSessionPass(sessionPassId);
  }

  await updateLesson(id, { trainerMemberId, scheduledAt, endAt, location, course, paymentType, status, sessionPassId, amount, note, rentalGymId, rentalGymFee, storeId, storeFee });
  await logActivity({ action: "update", entityType: "lesson", entityId: id, summary: `通常レッスンを編集: ${existing.customerName}` });
  revalidatePath("/lessons/regular");
  revalidatePath("/schedule");
}

// スケジュール画面などからレッスンの状態だけを変更する（完了/予定に戻す等）。
// 完了/予定戻しができるのは「担当トレーナー本人」のみ。
export async function setLessonStatusAction(id: string, status: LessonStatus) {
  const [member, lesson] = await Promise.all([getCurrentMember(), getLesson(id)]);
  if (!member) throw new Error("ログインが必要です");
  if (!lesson) throw new Error("レッスンが見つかりません");
  if (!lesson.trainerMemberId || lesson.trainerMemberId !== member.id) {
    throw new Error("完了にできるのは担当者本人のみです");
  }
  await updateLesson(id, { status });
  const label = status === "completed" ? "完了" : status === "cancelled" ? "キャンセル" : "予定";
  await logActivity({ action: "update", entityType: "lesson", entityId: id, summary: `レッスンを${label}に変更: ${lesson.customerName}` });
  revalidatePath("/lessons/regular");
  revalidatePath("/schedule");
}

export async function deleteLessonAction(id: string) {
  const { lesson: existing } = await assertCanEditLesson(id);
  if (existing?.sessionPassId && existing.paymentType === "session_pass") {
    await incrementSessionPass(existing.sessionPassId);
  }
  await deleteLesson(id);
  await logActivity({ action: "delete", entityType: "lesson", entityId: id, summary: `通常レッスンを削除: ${existing.customerName}` });
  revalidatePath("/lessons/regular");
  revalidatePath("/schedule");
}

// ─── 回数券 ───────────────────────────────────────────
export async function createSessionPassAction(formData: FormData) {
  await requireAdmin();
  const customerId  = (formData.get("customerId")  as string)?.trim();
  const totalCount  = parseInt((formData.get("totalCount") as string)?.trim(), 10);
  const purchasedAt = (formData.get("purchasedAt") as string)?.trim();
  const expiredAt   = (formData.get("expiredAt")   as string)?.trim() || undefined;
  const note        = (formData.get("note")        as string)?.trim() || undefined;

  if (!customerId || !totalCount || !purchasedAt) return;

  await addSessionPass({ customerId, totalCount, purchasedAt, expiredAt, note });
  await logActivity({ action: "create", entityType: "session_pass", summary: `回数券を追加（${totalCount}回）` });
  revalidatePath("/lessons/regular");
}

export async function deleteSessionPassAction(id: string) {
  await requireAdmin();
  await deleteSessionPass(id);
  await logActivity({ action: "delete", entityType: "session_pass", entityId: id, summary: "回数券を削除" });
  revalidatePath("/lessons/regular");
}

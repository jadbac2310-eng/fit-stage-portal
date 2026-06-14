"use server";

import { revalidatePath } from "next/cache";
import { addLesson, updateLesson, deleteLesson, getLesson } from "@/lib/lessons";
import { addSessionPass, deleteSessionPass, decrementSessionPass, incrementSessionPass } from "@/lib/session-passes";
import { courseToPaymentType } from "@/lib/lessons-types";
import { requireAdmin, getCurrentMember } from "@/lib/members";
import { parseExercises, cleanExercises } from "@/lib/exercise-types";
import type { LessonStatus } from "@/lib/lessons-types";

// ─── レッスン ─────────────────────────────────────────
export async function createLessonAction(formData: FormData) {
  const customerId      = (formData.get("customerId")      as string)?.trim();
  const trainerMemberId = (formData.get("trainerMemberId") as string)?.trim() || undefined;
  const scheduledAt     = (formData.get("scheduledAt")     as string)?.trim();
  const location        = (formData.get("location")        as string)?.trim() || undefined;
  const course          = (formData.get("course")          as string)?.trim() || undefined;
  const sessionPassId   = (formData.get("sessionPassId")   as string)?.trim() || undefined;
  const note            = (formData.get("note")            as string)?.trim() || undefined;

  if (!customerId || !scheduledAt) return;

  const paymentType = courseToPaymentType(course) ?? undefined;

  await addLesson({ customerId, trainerMemberId, scheduledAt, location, course, paymentType, sessionPassId, note });

  if (paymentType === "session_pass" && sessionPassId) {
    await decrementSessionPass(sessionPassId);
  }

  revalidatePath("/lessons/regular");
}

export async function updateLessonAction(id: string, formData: FormData) {
  await requireAdmin();
  const trainerMemberId = (formData.get("trainerMemberId") as string)?.trim() || null;
  const scheduledAt     = (formData.get("scheduledAt")     as string)?.trim();
  const location        = (formData.get("location")        as string)?.trim() || null;
  const course          = (formData.get("course")          as string)?.trim() || null;
  const sessionPassId   = (formData.get("sessionPassId")   as string)?.trim() || null;
  const status          = (formData.get("status")          as string)?.trim() as LessonStatus;
  const note            = (formData.get("note")            as string)?.trim() || null;

  if (!scheduledAt) return;

  const paymentType = courseToPaymentType(course ?? undefined) ?? null;

  const existing = await getLesson(id);
  const oldPassId = existing?.sessionPassId ?? null;

  if (oldPassId !== sessionPassId) {
    if (oldPassId) await incrementSessionPass(oldPassId);
    if (sessionPassId && paymentType === "session_pass") await decrementSessionPass(sessionPassId);
  }

  await updateLesson(id, { trainerMemberId, scheduledAt, location, course, paymentType, status, sessionPassId, note });
  revalidatePath("/lessons/regular");
}

export async function saveLessonReportAction(id: string, formData: FormData) {
  // レポート入力は「管理者」または「その通常レッスンの担当トレーナー」のみ
  const [lesson, member] = await Promise.all([getLesson(id), getCurrentMember()]);
  if (!member) throw new Error("ログインが必要です");
  if (!lesson) throw new Error("レッスンが見つかりません");
  const isAssignedTrainer = !!lesson.trainerMemberId && lesson.trainerMemberId === member.id;
  if (!isAssignedTrainer) {
    throw new Error("レポートを入力できるのは担当トレーナーのみです");
  }
  if (new Date(lesson.scheduledAt).getTime() > Date.now()) {
    throw new Error("予定日時を過ぎたレッスンのみレポートを入力できます");
  }

  const customerImpression = (formData.get("customerImpression") as string)?.trim() || null;
  const note               = (formData.get("note")               as string)?.trim() || null;
  let exercises: ReturnType<typeof cleanExercises> = [];
  try { exercises = cleanExercises(parseExercises(JSON.parse((formData.get("exercises") as string) || "[]"))); } catch {}

  await updateLesson(id, { exercises, trainingContent: null, customerImpression, note, status: "completed" });
  revalidatePath("/lessons/regular");
}

export async function deleteLessonAction(id: string) {
  await requireAdmin();
  const existing = await getLesson(id);
  if (existing?.sessionPassId && existing.paymentType === "session_pass") {
    await incrementSessionPass(existing.sessionPassId);
  }
  await deleteLesson(id);
  revalidatePath("/lessons/regular");
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
  revalidatePath("/lessons/regular");
}

export async function deleteSessionPassAction(id: string) {
  await requireAdmin();
  await deleteSessionPass(id);
  revalidatePath("/lessons/regular");
}

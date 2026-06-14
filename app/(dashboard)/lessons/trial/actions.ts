"use server";

import { revalidatePath } from "next/cache";
import { addTrialLesson, updateTrialLesson, deleteTrialLesson, getTrialLesson } from "@/lib/trial-lessons";
import { updateCustomer } from "@/lib/customers";
import { requireAdmin, getCurrentMember } from "@/lib/members";
import { parseExercises, cleanExercises } from "@/lib/exercise-types";

export async function createTrialLessonAction(formData: FormData) {
  const customerId      = (formData.get("customerId")      as string)?.trim();
  const salesMemberId   = (formData.get("salesMemberId")   as string)?.trim();
  const trainerMemberId = (formData.get("trainerMemberId") as string)?.trim() || undefined;
  const scheduledAt     = (formData.get("scheduledAt")     as string)?.trim();
  const location        = (formData.get("location")        as string)?.trim() || undefined;
  const note            = (formData.get("note")            as string)?.trim() || undefined;

  if (!customerId || !salesMemberId || !scheduledAt) return;

  await addTrialLesson({ customerId, salesMemberId, trainerMemberId, scheduledAt, location, note });
  revalidatePath("/lessons/trial");
}

export async function updateTrialLessonAction(id: string, formData: FormData) {
  await requireAdmin();
  const customerId      = (formData.get("customerId")      as string)?.trim();
  const salesMemberId   = (formData.get("salesMemberId")   as string)?.trim();
  const trainerMemberId = (formData.get("trainerMemberId") as string)?.trim() || null;
  const scheduledAt     = (formData.get("scheduledAt")     as string)?.trim();
  const location        = (formData.get("location")        as string)?.trim() || null;
  const note            = (formData.get("note")            as string)?.trim() || null;

  if (!customerId || !salesMemberId || !scheduledAt) return;

  await updateTrialLesson(id, { customerId, salesMemberId, trainerMemberId, scheduledAt, location, note });
  revalidatePath("/lessons/trial");
}

export async function saveReportAction(id: string, formData: FormData) {
  // レポート入力は「管理者」または「その体験レッスンの担当トレーナー」のみ
  const [lesson, member] = await Promise.all([getTrialLesson(id), getCurrentMember()]);
  if (!member) throw new Error("ログインが必要です");
  if (!lesson) throw new Error("体験レッスンが見つかりません");
  const isAssignedTrainer = !!lesson.trainerMemberId && lesson.trainerMemberId === member.id;
  if (!isAssignedTrainer) {
    throw new Error("レポートを入力できるのは担当トレーナーのみです");
  }
  if (new Date(lesson.scheduledAt).getTime() > Date.now()) {
    throw new Error("予定日時を過ぎたレッスンのみレポートを入力できます");
  }

  const customerImpression = (formData.get("customerImpression") as string)?.trim() || null;
  const contractedRaw      = (formData.get("contracted")         as string)?.trim();
  const note               = (formData.get("note")               as string)?.trim() || null;
  let exercises: ReturnType<typeof cleanExercises> = [];
  try { exercises = cleanExercises(parseExercises(JSON.parse((formData.get("exercises") as string) || "[]"))); } catch {}

  const contracted: boolean | null =
    contractedRaw === "true"  ? true  :
    contractedRaw === "false" ? false : null;

  await updateTrialLesson(id, {
    exercises, trainingContent: null, customerImpression, contracted, contractPlan: null, note,
    status: "completed",
  });

  // 契約成功 → 顧客ステータスを「審査中」へ自動変更
  if (contracted === true && lesson?.customerId) {
    await updateCustomer(lesson.customerId, { status: "pending" });
  }

  revalidatePath("/lessons/trial");
  revalidatePath("/master/customers");
}

export async function deleteTrialLessonAction(id: string) {
  await requireAdmin();
  await deleteTrialLesson(id);
  revalidatePath("/lessons/trial");
}

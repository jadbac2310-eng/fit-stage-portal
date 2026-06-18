"use server";

import { revalidatePath } from "next/cache";
import { addTrialLesson, updateTrialLesson, deleteTrialLesson, getTrialLesson } from "@/lib/trial-lessons";
import { updateCustomer } from "@/lib/customers";
import { requireAdmin, getCurrentMember } from "@/lib/members";
import { logActivity } from "@/lib/activity-logs";

export async function createTrialLessonAction(formData: FormData) {
  const customerId      = (formData.get("customerId")      as string)?.trim();
  const salesMemberId   = (formData.get("salesMemberId")   as string)?.trim();
  const trainerMemberId = (formData.get("trainerMemberId") as string)?.trim() || undefined;
  const scheduledAt     = (formData.get("scheduledAt")     as string)?.trim();
  const location        = (formData.get("location")        as string)?.trim() || undefined;
  const note            = (formData.get("note")            as string)?.trim() || undefined;

  if (!customerId || !salesMemberId || !scheduledAt) return;

  const created = await addTrialLesson({ customerId, salesMemberId, trainerMemberId, scheduledAt, location, note });
  await logActivity({ action: "create", entityType: "trial_lesson", entityId: created.id, summary: `体験レッスンを追加: ${created.customerName}` });
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
  await logActivity({ action: "update", entityType: "trial_lesson", entityId: id, summary: "体験レッスンを編集" });
  revalidatePath("/lessons/trial");
}

// 体験レッスンの契約結果（成約/不成立）を記録する。
// 記録できるのは管理者・担当トレーナー・担当営業。種目ログ等のレポートは扱わない。
export async function saveContractResultAction(id: string, formData: FormData) {
  const [lesson, member] = await Promise.all([getTrialLesson(id), getCurrentMember()]);
  if (!member) throw new Error("ログインが必要です");
  if (!lesson) throw new Error("体験レッスンが見つかりません");
  const allowed = member.isAdmin
    || (!!lesson.trainerMemberId && lesson.trainerMemberId === member.id)
    || (!!lesson.salesMemberId && lesson.salesMemberId === member.id);
  if (!allowed) {
    throw new Error("契約結果を記録できるのは担当トレーナー・担当営業または管理者のみです");
  }

  const contractedRaw = (formData.get("contracted") as string)?.trim();
  const note          = (formData.get("note")       as string)?.trim() || null;

  const contracted: boolean | null =
    contractedRaw === "true"  ? true  :
    contractedRaw === "false" ? false : null;

  await updateTrialLesson(id, { contracted, note, status: "completed" });

  // 契約成功 → 顧客ステータスを「審査中」へ自動変更
  if (contracted === true && lesson.customerId) {
    await updateCustomer(lesson.customerId, { status: "pending" });
  }

  await logActivity({ action: "report", entityType: "trial_lesson", entityId: id, summary: `体験の契約結果を記録: ${lesson.customerName}${contracted === true ? "（成約）" : ""}`, memberId: member.id, memberName: member.name });
  revalidatePath("/lessons/trial");
  revalidatePath("/master/customers");
}

export async function deleteTrialLessonAction(id: string) {
  await requireAdmin();
  await deleteTrialLesson(id);
  await logActivity({ action: "delete", entityType: "trial_lesson", entityId: id, summary: "体験レッスンを削除" });
  revalidatePath("/lessons/trial");
}

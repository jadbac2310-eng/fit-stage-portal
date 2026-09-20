"use server";

import { revalidatePath } from "next/cache";
import { addTrialLesson, updateTrialLesson, deleteTrialLesson, getTrialLesson } from "@/lib/trial-lessons";
import { updateCustomer } from "@/lib/customers";
import { requireAdmin, getCurrentMember } from "@/lib/members";
import { logActivity } from "@/lib/activity-logs";
import { TRIAL_LESSON_COURSE_NAME } from "@/lib/commissions-types";

/**
 * 場所（店舗・レンタルジム）と料金区分をフォームから読む。
 * 料金区分が「体験レッスン」のときは course を null で保存する（既定と同じ意味なので）。
 * レンタルジム代はジムを選んだときだけ保持する。
 */
function readPlaceAndCourse(formData: FormData) {
  const rentalGymId = (formData.get("rentalGymId") as string)?.trim() || null;
  const rgfRaw      = (formData.get("rentalGymFee") as string)?.trim();
  const courseRaw   = (formData.get("course") as string)?.trim();
  const amtRaw      = (formData.get("amount") as string)?.trim();
  return {
    rentalGymId,
    rentalGymFee: rentalGymId && rgfRaw ? parseInt(rgfRaw, 10) : null,
    storeId:      (formData.get("storeId") as string)?.trim() || null,
    course:       courseRaw && courseRaw !== TRIAL_LESSON_COURSE_NAME ? courseRaw : null,
    amount:       amtRaw ? parseInt(amtRaw, 10) : null,
  };
}

export async function createTrialLessonAction(formData: FormData) {
  const customerId      = (formData.get("customerId")      as string)?.trim();
  const salesMemberId   = (formData.get("salesMemberId")   as string)?.trim();
  const trainerMemberId = (formData.get("trainerMemberId") as string)?.trim() || undefined;
  const scheduledAt     = (formData.get("scheduledAt")     as string)?.trim();
  const location        = (formData.get("location")        as string)?.trim() || undefined;
  const note            = (formData.get("note")            as string)?.trim() || undefined;
  const { rentalGymId, rentalGymFee, storeId, course, amount } = readPlaceAndCourse(formData);

  if (!customerId || !salesMemberId || !scheduledAt) return;

  const created = await addTrialLesson({
    customerId, salesMemberId, trainerMemberId, scheduledAt, location, note,
    rentalGymId, rentalGymFee, storeId, course, amount,
  });
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
  const { rentalGymId, rentalGymFee, storeId, course, amount } = readPlaceAndCourse(formData);

  if (!customerId || !salesMemberId || !scheduledAt) return;

  await updateTrialLesson(id, {
    customerId, salesMemberId, trainerMemberId, scheduledAt, location, note,
    rentalGymId, rentalGymFee, storeId, course, amount,
  });
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

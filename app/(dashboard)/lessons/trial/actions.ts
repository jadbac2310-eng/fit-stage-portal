"use server";

import { toDeliveryMode } from "@/lib/lessons-types";

import { revalidatePath } from "next/cache";
import { addTrialLesson, updateTrialLesson, deleteTrialLesson, getTrialLesson } from "@/lib/trial-lessons";
import type { TrialLessonStatus } from "@/lib/trial-lessons-types";
import { updateCustomer } from "@/lib/customers";
import { requireAdmin, getCurrentMember } from "@/lib/members";
import { logActivity } from "@/lib/activity-logs";
import { notifyLessonAdded } from "@/lib/lesson-notify";
import { TRIAL_LESSON_COURSE_NAME } from "@/lib/commissions-types";
import { runAction, ActionError, type ActionResult } from "@/lib/action-result";

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
  const fctStoreId = (formData.get("fctStoreId") as string)?.trim() || null;
  const fsfRaw     = (formData.get("fctStoreFee") as string)?.trim();
  return {
    rentalGymId,
    rentalGymFee: rentalGymId && rgfRaw ? parseInt(rgfRaw, 10) : null,
    storeId:      (formData.get("storeId") as string)?.trim() || null,
    deliveryMode: toDeliveryMode(formData.get("deliveryMode") as string),
    fctStoreId,
    fctStoreFee:  fctStoreId && fsfRaw ? parseInt(fsfRaw, 10) : null,
    course:       courseRaw && courseRaw !== TRIAL_LESSON_COURSE_NAME ? courseRaw : null,
    amount:       amtRaw ? parseInt(amtRaw, 10) : null,
  };
}

export async function createTrialLessonAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const customerId      = (formData.get("customerId")      as string)?.trim();
    const salesMemberId   = (formData.get("salesMemberId")   as string)?.trim();
    const trainerMemberId = (formData.get("trainerMemberId") as string)?.trim() || undefined;
    const scheduledAt     = (formData.get("scheduledAt")     as string)?.trim();
    const location        = (formData.get("location")        as string)?.trim() || undefined;
    const note            = (formData.get("note")            as string)?.trim() || undefined;
    const { rentalGymId, rentalGymFee, storeId, fctStoreId, fctStoreFee, course, amount } = readPlaceAndCourse(formData);

    if (!customerId || !salesMemberId || !scheduledAt) return;

    const created = await addTrialLesson({
      customerId, salesMemberId, trainerMemberId, scheduledAt, location, note,
      rentalGymId, rentalGymFee, storeId, fctStoreId, fctStoreFee, course, amount,
    });
    await logActivity({ action: "create", entityType: "trial_lesson", entityId: created.id, summary: `体験レッスンを追加: ${created.customerName}` });
    const member = await getCurrentMember();
    if (member) {
      await notifyLessonAdded(member, "体験レッスン", [{
        customerName: created.customerName,
        scheduledAt:  created.scheduledAt,
        course:       created.course,
        trainerName:  created.trainerMemberName,
        location:     created.location,
      }]);
    }
    revalidatePath("/lessons/trial");
  });
}

export async function updateTrialLessonAction(id: string, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    const customerId      = (formData.get("customerId")      as string)?.trim();
    const salesMemberId   = (formData.get("salesMemberId")   as string)?.trim();
    const trainerMemberId = (formData.get("trainerMemberId") as string)?.trim() || null;
    const scheduledAt     = (formData.get("scheduledAt")     as string)?.trim();
    const location        = (formData.get("location")        as string)?.trim() || null;
    const note            = (formData.get("note")            as string)?.trim() || null;
    const { rentalGymId, rentalGymFee, storeId, fctStoreId, fctStoreFee, course, amount } = readPlaceAndCourse(formData);

    if (!customerId || !salesMemberId || !scheduledAt) return;

    await updateTrialLesson(id, {
      customerId, salesMemberId, trainerMemberId, scheduledAt, location, note,
      rentalGymId, rentalGymFee, storeId, fctStoreId, fctStoreFee, course, amount,
    });
    await logActivity({ action: "update", entityType: "trial_lesson", entityId: id, summary: "体験レッスンを編集" });
    revalidatePath("/lessons/trial");
  });
}

// 体験レッスンの契約結果（成約/不成立）を記録する。
// 記録できるのは管理者・担当トレーナー・担当営業。種目ログ等のレポートは扱わない。
export async function saveContractResultAction(id: string, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const [lesson, member] = await Promise.all([getTrialLesson(id), getCurrentMember()]);
    if (!member) throw new ActionError("ログインが必要です");
    if (!lesson) throw new ActionError("体験レッスンが見つかりません");
    const allowed = member.isAdmin
      || (!!lesson.trainerMemberId && lesson.trainerMemberId === member.id)
      || (!!lesson.salesMemberId && lesson.salesMemberId === member.id);
    if (!allowed) {
      throw new ActionError("契約結果を記録できるのは担当トレーナー・担当営業または管理者のみです");
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
  });
}

/**
 * 体験レッスンのステータスだけを切り替える。
 *
 * これまでは「契約結果を記録」したときだけ完了になったため、実施直後に
 * スケジュールから完了にできなかった。完了にならないと
 *  - 体験の売上が請求書・コミッションに乗らない
 *  - 追客のリマインド（結果が未入力のものを知らせる）も動かない
 * ため、通常レッスンや業務と同じようにその場で押せるようにする。
 *
 * 契約結果（成約・未成約）は触らない。完了にしただけなら未入力のままなので、
 * 数日後に追客のリマインドが届く。
 */
export async function setTrialLessonStatusAction(id: string, status: TrialLessonStatus): Promise<ActionResult> {
  return runAction(async () => {
    const [lesson, member] = await Promise.all([getTrialLesson(id), getCurrentMember()]);
    if (!member) throw new ActionError("ログインが必要です");
    if (!lesson) throw new ActionError("体験レッスンが見つかりません");
    const allowed = member.isAdmin
      || (!!lesson.trainerMemberId && lesson.trainerMemberId === member.id)
      || (!!lesson.salesMemberId   && lesson.salesMemberId   === member.id);
    if (!allowed) {
      throw new ActionError("変更できるのは担当トレーナー・担当営業または管理者のみです");
    }

    await updateTrialLesson(id, { status });
    const label = status === "completed" ? "完了" : status === "cancelled" ? "キャンセル" : "予定";
    await logActivity({
      action: "update", entityType: "trial_lesson", entityId: id,
      summary: `体験レッスンを${label}に変更: ${lesson.customerName}`,
      memberId: member.id, memberName: member.name,
    });
    revalidatePath("/lessons/trial");
    revalidatePath("/schedule");
    revalidatePath("/commissions");
  });
}

export async function deleteTrialLessonAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    await deleteTrialLesson(id);
    await logActivity({ action: "delete", entityType: "trial_lesson", entityId: id, summary: "体験レッスンを削除" });
    revalidatePath("/lessons/trial");
  });
}

"use server";

import { toDeliveryMode } from "@/lib/lessons-types";

import { revalidatePath } from "next/cache";
import { addTrialLesson, updateTrialLesson, deleteTrialLesson, getTrialLesson } from "@/lib/trial-lessons";
import type { TrialLessonStatus } from "@/lib/trial-lessons-types";
import { updateCustomer } from "@/lib/customers";
import { requireAdmin, getCurrentMember } from "@/lib/members";
import { logActivity, getTrialConfirmMailSent, TRIAL_CONFIRM_MAIL_ENTITY } from "@/lib/activity-logs";
import { isMailConfigured, sendMail } from "@/lib/mailer";
import { notifyLessonAdded, notifyContracted } from "@/lib/lesson-notify";
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
  const storeFeeRaw = (formData.get("storeFee") as string)?.trim();
  const fctStoreId = (formData.get("fctStoreId") as string)?.trim() || null;
  const fsfRaw     = (formData.get("fctStoreFee") as string)?.trim();
  const avenirStoreId = (formData.get("avenirStoreId") as string)?.trim() || null;
  const asfRaw        = (formData.get("avenirStoreFee") as string)?.trim();
  return {
    rentalGymId,
    rentalGymFee: rentalGymId && rgfRaw ? parseInt(rgfRaw, 10) : null,
    storeId:      (formData.get("storeId") as string)?.trim() || null,
    storeFee:     (formData.get("storeId") as string)?.trim() && storeFeeRaw ? parseInt(storeFeeRaw, 10) : null,
    deliveryMode: toDeliveryMode(formData.get("deliveryMode") as string),
    fctStoreId,
    fctStoreFee:  fctStoreId && fsfRaw ? parseInt(fsfRaw, 10) : null,
    avenirStoreId,
    avenirStoreFee: avenirStoreId && asfRaw ? parseInt(asfRaw, 10) : null,
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
    const { rentalGymId, rentalGymFee, storeId, storeFee, fctStoreId, fctStoreFee, avenirStoreId, avenirStoreFee, course, amount } = readPlaceAndCourse(formData);

    if (!customerId || !salesMemberId || !scheduledAt) return;

    // 金額を決められるのは管理者だけ。トレーナーが入れても無視して料金区分の単価に従わせる
    const member = await getCurrentMember();
    const created = await addTrialLesson({
      customerId, salesMemberId, trainerMemberId, scheduledAt, location, note,
      rentalGymId, rentalGymFee, storeId, storeFee, fctStoreId, fctStoreFee, avenirStoreId, avenirStoreFee, course,
      amount: member?.isAdmin ? amount : null,
    });
    await logActivity({ action: "create", entityType: "trial_lesson", entityId: created.id, summary: `体験レッスンを追加: ${created.customerName}` });
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
    const { rentalGymId, rentalGymFee, storeId, storeFee, fctStoreId, fctStoreFee, avenirStoreId, avenirStoreFee, course, amount } = readPlaceAndCourse(formData);

    if (!customerId || !salesMemberId || !scheduledAt) return;

    await updateTrialLesson(id, {
      customerId, salesMemberId, trainerMemberId, scheduledAt, location, note,
      rentalGymId, rentalGymFee, storeId, storeFee, fctStoreId, fctStoreFee, avenirStoreId, avenirStoreFee, course, amount,
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

    // 成約の瞬間は全員に知らせる（もともと成約だったものを編集しただけなら送らない）
    if (contracted === true && lesson.contracted !== true) {
      await notifyContracted({
        customerName: lesson.customerName,
        salesName:    lesson.salesMemberName,
        trainerName:  lesson.trainerMemberName,
        byName:       member.name,
      });
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

/**
 * 体験レッスンの「ご予約確定」メールを送る（2026-11-14〜）。
 * 文面は画面で組み立て・編集したものをそのまま送る（lib/trial-confirm-mail.ts）。
 * 送れるのは管理者・担当トレーナー・担当営業。送信元は店舗用のアカウント（info@fitstage.jp。lib/mailer.ts の store）。
 * 10分以内に同じ宛先へ送っていたら、二重送信を止めて確認を求める（force で送れる）。
 */
export async function sendTrialConfirmMailAction(
  id: string,
  mail: { to: string; subject: string; body: string },
  opts?: { force?: boolean },
): Promise<{ ok: true; to: string } | { ok: false; error: string; duplicate?: boolean }> {
  const [lesson, member] = await Promise.all([getTrialLesson(id), getCurrentMember()]);
  if (!member) return { ok: false, error: "ログインが必要です" };
  if (!lesson) return { ok: false, error: "体験レッスンが見つかりません" };
  const allowed = member.isAdmin
    || (!!lesson.trainerMemberId && lesson.trainerMemberId === member.id)
    || (!!lesson.salesMemberId && lesson.salesMemberId === member.id);
  if (!allowed) return { ok: false, error: "送れるのは担当トレーナー・担当営業または管理者のみです" };

  const to = mail.to.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { ok: false, error: "宛先のメールアドレスを確認してください" };
  if (!mail.subject.trim()) return { ok: false, error: "件名が空です" };
  if (!mail.body.trim()) return { ok: false, error: "本文が空です" };
  if (/（ここに場所を入れてください）/.test(mail.body)) return { ok: false, error: "本文の「場所」がまだ空です" };
  if (!isMailConfigured("store")) return { ok: false, error: "Gmail の送信設定がまだありません（Vercel に STORE_GMAIL_USER と STORE_GMAIL_APP_PASSWORD を入れてください）" };

  if (!opts?.force) {
    const last = (await getTrialConfirmMailSent())[id];
    if (last) {
      const minutes = Math.floor((Date.now() - new Date(last.at).getTime()) / 60000);
      if (minutes < 10) {
        return { ok: false, duplicate: true, error: `${minutes < 1 ? "ついさっき" : `${minutes}分前に`}このお客様へ確定メールを送っています。もう一度送りますか？` };
      }
    }
  }

  const sent = await sendMail({ to, subject: mail.subject.trim(), text: mail.body, account: "store" });
  if (!sent.ok) return sent;
  await logActivity({
    action: "create", entityType: TRIAL_CONFIRM_MAIL_ENTITY, entityId: id,
    summary: `体験の確定メールを送信: ${lesson.customerName} → ${to}`,
    memberId: member.id, memberName: member.name,
  });
  revalidatePath("/lessons/trial");
  return { ok: true, to };
}

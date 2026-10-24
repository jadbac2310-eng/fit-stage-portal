"use server";

import { toDeliveryMode, canWriteLessonNote } from "@/lib/lessons-types";

import { revalidatePath } from "next/cache";
import { addLesson, updateLesson, deleteLesson, getLesson } from "@/lib/lessons";
import { addSessionPass, deleteSessionPass, reserveSessionPass, releaseSessionPass } from "@/lib/session-passes";
import { passHeldByStatus } from "@/lib/session-passes-types";
import { courseToPaymentType } from "@/lib/lessons-types";
import { requireAdmin, getCurrentMember } from "@/lib/members";
import { logActivity } from "@/lib/activity-logs";
import { notifyLessonAdded } from "@/lib/lesson-notify";
import type { Lesson, LessonStatus } from "@/lib/lessons-types";
import { runAction, ActionError, type ActionResult } from "@/lib/action-result";

// レッスンの編集/削除は「管理者」または「追加した本人」のみ許可する。
// 作成者が記録されていない（旧データ）場合は管理者のみ。
async function assertCanEditLesson(id: string): Promise<{ lesson: Lesson; isAdmin: boolean }> {
  const [member, lesson] = await Promise.all([getCurrentMember(), getLesson(id)]);
  if (!member) throw new ActionError("ログインが必要です");
  if (!lesson) throw new ActionError("レッスンが見つかりません");
  const canEdit = member.isAdmin || (!!lesson.createdById && lesson.createdById === member.id);
  if (!canEdit) throw new ActionError("このレッスンを編集できるのは追加した本人または管理者のみです");
  return { lesson, isAdmin: member.isAdmin };
}

/**
 * 備考（レッスンの記録）だけを書き換える。
 *
 * レッスン全体の編集は「管理者か、追加した本人」に限っているが、
 * それだと担当トレーナーが自分の回の記録を書けない。
 * 同じお客さまを複数のトレーナーで見るとき、記録が書けないと引き継ぎが成立しないので、
 * 担当トレーナーにも備考だけは書けるようにする。
 *
 * 日時・金額・お客さま・コースなどは、この経路では一切変えられない。
 * 完了したあとでも書ける（記録はレッスンが終わってから書くもの）。
 */
export async function saveLessonNoteAction(id: string, note: string): Promise<ActionResult> {
  return runAction(async () => {
    const [member, lesson] = await Promise.all([getCurrentMember(), getLesson(id)]);
    if (!member) throw new ActionError("ログインが必要です");
    if (!lesson) throw new ActionError("レッスンが見つかりません");

    if (!canWriteLessonNote(member, lesson)) {
      throw new ActionError("記録を書けるのは、担当トレーナーか追加した本人、管理者だけです");
    }

    // 「誰が更新したか」は updateLesson が自分で記録する
    await updateLesson(id, { note: note.trim() || null });
    await logActivity({
      action: "update", entityType: "lesson", entityId: id,
      summary: `レッスンの記録を更新: ${lesson.customerName}`,
    });
    revalidatePath("/lessons/regular");
    revalidatePath("/schedule");
    revalidatePath(`/schedule/${id}`);
  });
}

// ─── レッスン ─────────────────────────────────────────
export async function createLessonAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const member = await getCurrentMember();
    if (!member) throw new ActionError("ログインが必要です");

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
    const deliveryMode    = toDeliveryMode(formData.get("deliveryMode") as string);
    const fctStoreId      = (formData.get("fctStoreId")      as string)?.trim() || null;
    const fsfRaw          = (formData.get("fctStoreFee")     as string)?.trim();
    const fctStoreFee     = fctStoreId && fsfRaw ? parseInt(fsfRaw, 10) : null;
    const avenirStoreId   = (formData.get("avenirStoreId")   as string)?.trim() || null;
    const asfRaw          = (formData.get("avenirStoreFee")  as string)?.trim();
    const avenirStoreFee  = avenirStoreId && asfRaw ? parseInt(asfRaw, 10) : null;
    const amtRaw          = (formData.get("amount")          as string)?.trim();
    // 金額を決められるのは管理者だけ。トレーナーが入れても無視して顧客の都度単価に従わせる
    const amount          = member.isAdmin && amtRaw ? parseInt(amtRaw, 10) : null;

    if (!customerId || !scheduledAt) return;
    // コース未設定のレッスンは請求書の明細に載らない（請求漏れになる）ため受け付けない
    if (!course) throw new ActionError("コースを選択してください");

    const paymentType = courseToPaymentType(course) ?? undefined;

    // 回数券は「先に確保してからレッスンを作る」。あとから消費すると、残数0でもレッスンだけが
    // 登録されてしまい、回数券に紐づくレッスン数が総回数を超える（残数表示がズレる）ため。
    const usesPass = paymentType === "session_pass" && !!sessionPassId;
    if (usesPass) await reserveSessionPass(sessionPassId!, 1);

    let created;
    try {
      created = await addLesson({ customerId, trainerMemberId, scheduledAt, endAt, location, course, paymentType, sessionPassId, amount, note, createdBy: member.id, rentalGymId, rentalGymFee, storeId, storeFee, fctStoreId, fctStoreFee, avenirStoreId, avenirStoreFee, deliveryMode });
    } catch (e) {
      if (usesPass) await releaseSessionPass(sessionPassId!, 1); // 作成に失敗したぶんは戻す
      throw e;
    }

    await logActivity({ action: "create", entityType: "lesson", entityId: created.id, summary: `通常レッスンを追加: ${created.customerName}`, memberId: member.id, memberName: member.name });
    await notifyLessonAdded(member, "レッスン", [{
      customerName: created.customerName,
      scheduledAt:  created.scheduledAt,
      course:       created.course,
      trainerName:  created.trainerMemberName,
      location:     created.location,
    }]);
    revalidatePath("/lessons/regular");
    revalidatePath("/schedule");
  });
}

// 同じ内容の通常レッスンを複数日時に一括作成する（複数日時・繰り返しの両方で使う）。
// slots は [{scheduledAt, endAt}] の JSON（ISO文字列）。
export async function createLessonsAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const member = await getCurrentMember();
    if (!member) throw new ActionError("ログインが必要です");

    const customerId      = (formData.get("customerId")      as string)?.trim();
    const trainerMemberId = (formData.get("trainerMemberId") as string)?.trim() || undefined;
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
    const deliveryMode    = toDeliveryMode(formData.get("deliveryMode") as string);
    const fctStoreId      = (formData.get("fctStoreId")      as string)?.trim() || null;
    const fsfRaw          = (formData.get("fctStoreFee")     as string)?.trim();
    const fctStoreFee     = fctStoreId && fsfRaw ? parseInt(fsfRaw, 10) : null;
    const avenirStoreId   = (formData.get("avenirStoreId")   as string)?.trim() || null;
    const asfRaw          = (formData.get("avenirStoreFee")  as string)?.trim();
    const avenirStoreFee  = avenirStoreId && asfRaw ? parseInt(asfRaw, 10) : null;
    const amtRaw          = (formData.get("amount")          as string)?.trim();
    // 金額を決められるのは管理者だけ。トレーナーが入れても無視して顧客の都度単価に従わせる
    const amount          = member.isAdmin && amtRaw ? parseInt(amtRaw, 10) : null;

    if (!customerId) return;
    if (!course) throw new ActionError("コースを選択してください");

    let slots: { scheduledAt?: string; endAt?: string | null }[] = [];
    try {
      const raw = JSON.parse((formData.get("slots") as string) || "[]");
      if (Array.isArray(raw)) slots = raw.filter((s) => s && typeof s.scheduledAt === "string" && s.scheduledAt);
    } catch { slots = []; }
    if (slots.length === 0) return;
    if (slots.length > 200) throw new ActionError("一度に作成できるレッスンは最大200件です。繰り返しの終了日を見直してください。");

    const paymentType = courseToPaymentType(course) ?? undefined;
    // 作成前に「件数ぶんまとめて」確保する。1件ずつ消費すると、残数が尽きたあとのレッスンが
    // 0消費で登録され、16回券に17レッスンが紐づくような状態になってしまう。
    const usesPass = paymentType === "session_pass" && !!sessionPassId;
    if (usesPass) await reserveSessionPass(sessionPassId!, slots.length);

    let count = 0;
    const created: Lesson[] = [];
    try {
      for (const s of slots) {
        created.push(await addLesson({ customerId, trainerMemberId, scheduledAt: s.scheduledAt!, endAt: s.endAt ?? null, location, course, paymentType, sessionPassId, amount, note, createdBy: member.id, rentalGymId, rentalGymFee, storeId, storeFee, fctStoreId, fctStoreFee, avenirStoreId, avenirStoreFee, deliveryMode }));
        count++;
      }
    } catch (e) {
      if (usesPass) await releaseSessionPass(sessionPassId!, slots.length - count); // 作れなかったぶんを戻す
      throw e;
    }
    await logActivity({ action: "create", entityType: "lesson", entityId: customerId, summary: `通常レッスンを${count}件追加`, memberId: member.id, memberName: member.name });
    // 何件入れても1通にまとめる（無料枠を一括登録で食い潰さないため）
    await notifyLessonAdded(member, "レッスン", created.map((l) => ({
      customerName: l.customerName,
      scheduledAt:  l.scheduledAt,
      course:       l.course,
      trainerName:  l.trainerMemberName,
      location:     l.location,
    })));
    revalidatePath("/lessons/regular");
    revalidatePath("/schedule");
  });
}

export async function updateLessonAction(id: string, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { lesson: existing, isAdmin } = await assertCanEditLesson(id);
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
    const deliveryMode    = toDeliveryMode(formData.get("deliveryMode") as string);
    const fctStoreId      = (formData.get("fctStoreId")      as string)?.trim() || null;
    const fsfRaw          = (formData.get("fctStoreFee")     as string)?.trim();
    const fctStoreFee     = fctStoreId && fsfRaw ? parseInt(fsfRaw, 10) : null;
    const avenirStoreId   = (formData.get("avenirStoreId")   as string)?.trim() || null;
    const asfRaw          = (formData.get("avenirStoreFee")  as string)?.trim();
    const avenirStoreFee  = avenirStoreId && asfRaw ? parseInt(asfRaw, 10) : null;
    const amtRaw          = (formData.get("amount")          as string)?.trim();
    // 金額を変えられるのは管理者だけ。トレーナーの編集では今の金額を据え置く
    const amount          = isAdmin ? (amtRaw ? parseInt(amtRaw, 10) : null) : (existing.amount ?? null);

    if (!scheduledAt) return;
    if (!course) throw new ActionError("コースを選択してください");

    const paymentType = courseToPaymentType(course ?? undefined) ?? null;

    const oldPassId = existing?.sessionPassId ?? null;

    // 回数券を押さえているかどうかは「どの回数券か」と「状態」の両方で決まる。
    // 状態がキャンセルに変わったときも戻さないと、残回数が減ったままになる。
    const wasHeld  = !!oldPassId && existing.paymentType === "session_pass" && passHeldByStatus(existing.status);
    const willHold = !!sessionPassId && paymentType === "session_pass" && passHeldByStatus(status);

    if (wasHeld && willHold && oldPassId !== sessionPassId) {
      // 付け替え。新しいほうの確保を先に行う（残数不足ならここで中断し、元の回数券は押さえたまま保つ）
      await reserveSessionPass(sessionPassId!, 1);
      await releaseSessionPass(oldPassId!, 1);
    } else if (!wasHeld && willHold) {
      await reserveSessionPass(sessionPassId!, 1);
    } else if (wasHeld && !willHold) {
      await releaseSessionPass(oldPassId!, 1);
    }

    await updateLesson(id, { trainerMemberId, scheduledAt, endAt, location, course, paymentType, status, sessionPassId, amount, note, rentalGymId, rentalGymFee, storeId, storeFee, fctStoreId, fctStoreFee, avenirStoreId, avenirStoreFee, deliveryMode });
    await logActivity({ action: "update", entityType: "lesson", entityId: id, summary: `通常レッスンを編集: ${existing.customerName}` });
    revalidatePath("/lessons/regular");
    revalidatePath("/schedule");
  });
}

// スケジュール画面などからレッスンの状態だけを変更する（完了/予定に戻す等）。
// 完了/予定戻しができるのは「担当トレーナー本人」のみ。
export async function setLessonStatusAction(id: string, status: LessonStatus): Promise<ActionResult> {
  return runAction(async () => {
    const [member, lesson] = await Promise.all([getCurrentMember(), getLesson(id)]);
    if (!member) throw new ActionError("ログインが必要です");
    if (!lesson) throw new ActionError("レッスンが見つかりません");
    if (!lesson.trainerMemberId || lesson.trainerMemberId !== member.id) {
      throw new ActionError("完了にできるのは担当者本人のみです");
    }
    // キャンセルにしたら回数券を1回ぶん戻す。キャンセルから戻したら取り直す。
    // 当日キャンセルは消費する約束なので、押さえたままにする。
    if (lesson.sessionPassId && lesson.paymentType === "session_pass") {
      const was  = passHeldByStatus(lesson.status);
      const will = passHeldByStatus(status);
      if (was && !will) await releaseSessionPass(lesson.sessionPassId, 1);
      if (!was && will) await reserveSessionPass(lesson.sessionPassId, 1);
    }

    await updateLesson(id, { status });
    const label = status === "completed" ? "完了"
      : status === "cancelled" ? "キャンセル"
      : status === "cancelled_same_day" ? "当日キャンセル" : "予定";
    await logActivity({ action: "update", entityType: "lesson", entityId: id, summary: `レッスンを${label}に変更: ${lesson.customerName}` });
    revalidatePath("/lessons/regular");
    revalidatePath("/schedule");
  });
}

export async function deleteLessonAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const { lesson: existing } = await assertCanEditLesson(id);
    // すでにキャンセルで戻してあるぶんを、削除でもう一度戻すと二重に増えてしまう
    if (existing?.sessionPassId && existing.paymentType === "session_pass"
        && passHeldByStatus(existing.status)) {
      await releaseSessionPass(existing.sessionPassId, 1);
    }
    await deleteLesson(id);
    await logActivity({ action: "delete", entityType: "lesson", entityId: id, summary: `通常レッスンを削除: ${existing.customerName}` });
    revalidatePath("/lessons/regular");
    revalidatePath("/schedule");
  });
}

// ─── 回数券 ───────────────────────────────────────────
export async function createSessionPassAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
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
  });
}

export async function deleteSessionPassAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    await deleteSessionPass(id);
    await logActivity({ action: "delete", entityType: "session_pass", entityId: id, summary: "回数券を削除" });
    revalidatePath("/lessons/regular");
  });
}

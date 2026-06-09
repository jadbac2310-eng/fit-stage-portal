"use server";

import { revalidatePath } from "next/cache";
import { addTrialLesson, updateTrialLesson, deleteTrialLesson, getTrialLesson } from "@/lib/trial-lessons";
import { updateCustomer } from "@/lib/customers";
import { requireAdmin } from "@/lib/members";

export async function createTrialLessonAction(formData: FormData) {
  const customerId      = (formData.get("customerId")      as string)?.trim();
  const salesMemberId   = (formData.get("salesMemberId")   as string)?.trim();
  const trainerMemberId = (formData.get("trainerMemberId") as string)?.trim() || undefined;
  const scheduledAt     = (formData.get("scheduledAt")     as string)?.trim();
  const location        = (formData.get("location")        as string)?.trim() || undefined;

  if (!customerId || !salesMemberId || !scheduledAt) return;

  await addTrialLesson({ customerId, salesMemberId, trainerMemberId, scheduledAt, location });
  revalidatePath("/lessons/trial");
}

export async function updateTrialLessonAction(id: string, formData: FormData) {
  await requireAdmin();
  const customerId      = (formData.get("customerId")      as string)?.trim();
  const salesMemberId   = (formData.get("salesMemberId")   as string)?.trim();
  const trainerMemberId = (formData.get("trainerMemberId") as string)?.trim() || null;
  const scheduledAt     = (formData.get("scheduledAt")     as string)?.trim();
  const location        = (formData.get("location")        as string)?.trim() || null;

  if (!customerId || !salesMemberId || !scheduledAt) return;

  await updateTrialLesson(id, { customerId, salesMemberId, trainerMemberId, scheduledAt, location });
  revalidatePath("/lessons/trial");
}

export async function saveReportAction(id: string, formData: FormData) {
  await requireAdmin();
  const trainingContent    = (formData.get("trainingContent")    as string)?.trim() || null;
  const customerImpression = (formData.get("customerImpression") as string)?.trim() || null;
  const contractedRaw      = (formData.get("contracted")         as string)?.trim();
  const note               = (formData.get("note")               as string)?.trim() || null;

  const contracted: boolean | null =
    contractedRaw === "true"  ? true  :
    contractedRaw === "false" ? false : null;

  await updateTrialLesson(id, {
    trainingContent, customerImpression, contracted, contractPlan: null, note,
    status: "completed",
  });

  // 契約成功 → 顧客ステータスを「審査中」へ自動変更
  if (contracted === true) {
    const lesson = await getTrialLesson(id);
    if (lesson?.customerId) {
      await updateCustomer(lesson.customerId, { status: "pending" });
    }
  }

  revalidatePath("/lessons/trial");
  revalidatePath("/master/customers");
}

export async function deleteTrialLessonAction(id: string) {
  await requireAdmin();
  await deleteTrialLesson(id);
  revalidatePath("/lessons/trial");
}

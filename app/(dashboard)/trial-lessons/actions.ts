"use server";

import { revalidatePath } from "next/cache";
import { addTrialLesson, updateTrialLesson, deleteTrialLesson } from "@/lib/trial-lessons";
import type { CustomerPlan } from "@/lib/customers-types";

export async function createTrialLessonAction(formData: FormData) {
  const customerId      = (formData.get("customerId")      as string)?.trim();
  const salesMemberId   = (formData.get("salesMemberId")   as string)?.trim();
  const trainerMemberId = (formData.get("trainerMemberId") as string)?.trim() || undefined;
  const scheduledAt     = (formData.get("scheduledAt")     as string)?.trim();
  const location        = (formData.get("location")        as string)?.trim() || undefined;

  if (!customerId || !salesMemberId || !scheduledAt) return;

  await addTrialLesson({ customerId, salesMemberId, trainerMemberId, scheduledAt, location });
  revalidatePath("/trial-lessons");
}

export async function updateTrialLessonAction(id: string, formData: FormData) {
  const customerId      = (formData.get("customerId")      as string)?.trim();
  const salesMemberId   = (formData.get("salesMemberId")   as string)?.trim();
  const trainerMemberId = (formData.get("trainerMemberId") as string)?.trim() || null;
  const scheduledAt     = (formData.get("scheduledAt")     as string)?.trim();
  const location        = (formData.get("location")        as string)?.trim() || null;

  if (!customerId || !salesMemberId || !scheduledAt) return;

  await updateTrialLesson(id, { customerId, salesMemberId, trainerMemberId, scheduledAt, location });
  revalidatePath("/trial-lessons");
}

export async function saveReportAction(id: string, formData: FormData) {
  const trainingContent    = (formData.get("trainingContent")    as string)?.trim() || null;
  const customerImpression = (formData.get("customerImpression") as string)?.trim() || null;
  const contractedRaw      = (formData.get("contracted")         as string)?.trim();
  const contractPlanRaw    = (formData.get("contractPlan")       as string)?.trim();
  const note               = (formData.get("note")               as string)?.trim() || null;

  const contracted: boolean | null =
    contractedRaw === "true"  ? true  :
    contractedRaw === "false" ? false : null;

  const contractPlan: CustomerPlan | null =
    contracted === true && contractPlanRaw ? contractPlanRaw as CustomerPlan : null;

  await updateTrialLesson(id, {
    trainingContent,
    customerImpression,
    contracted,
    contractPlan,
    note,
    status: "completed",
  });
  revalidatePath("/trial-lessons");
}

export async function deleteTrialLessonAction(id: string) {
  await deleteTrialLesson(id);
  revalidatePath("/trial-lessons");
}

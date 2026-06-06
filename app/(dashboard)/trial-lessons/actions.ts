"use server";

import { revalidatePath } from "next/cache";
import { addTrialLesson, updateTrialLesson, deleteTrialLesson } from "@/lib/trial-lessons";
import type { TrialLessonStatus } from "@/lib/trial-lessons-types";
import type { CustomerPlan } from "@/lib/customers-types";

function parseContracted(value: string): boolean | null {
  if (value === "true")  return true;
  if (value === "false") return false;
  return null;
}

export async function createTrialLessonAction(formData: FormData) {
  const customerId       = (formData.get("customerId")       as string)?.trim();
  const salesMemberId    = (formData.get("salesMemberId")    as string)?.trim();
  const trainerMemberId  = (formData.get("trainerMemberId")  as string)?.trim() || undefined;
  const scheduledAt      = (formData.get("scheduledAt")      as string)?.trim();
  const location         = (formData.get("location")         as string)?.trim() || undefined;
  const status           = ((formData.get("status")          as string)?.trim() || "scheduled") as TrialLessonStatus;
  const contractedRaw    = (formData.get("contracted")       as string)?.trim() ?? "null";
  const contracted       = parseContracted(contractedRaw);
  const contractPlan     = (formData.get("contractPlan")     as string)?.trim() as CustomerPlan | undefined;
  const note             = (formData.get("note")             as string)?.trim() || undefined;

  if (!customerId || !salesMemberId || !scheduledAt) return;

  await addTrialLesson({
    customerId,
    salesMemberId,
    trainerMemberId,
    scheduledAt,
    location,
    status,
    contracted,
    contractPlan: contracted === true ? contractPlan : undefined,
    note,
  });
  revalidatePath("/trial-lessons");
}

export async function updateTrialLessonAction(id: string, formData: FormData) {
  const customerId       = (formData.get("customerId")       as string)?.trim();
  const salesMemberId    = (formData.get("salesMemberId")    as string)?.trim();
  const trainerMemberId  = (formData.get("trainerMemberId")  as string)?.trim() || null;
  const scheduledAt      = (formData.get("scheduledAt")      as string)?.trim();
  const location         = (formData.get("location")         as string)?.trim() || null;
  const status           = (formData.get("status")           as string)?.trim() as TrialLessonStatus;
  const contractedRaw    = (formData.get("contracted")       as string)?.trim() ?? "null";
  const contracted       = parseContracted(contractedRaw);
  const contractPlan     = (formData.get("contractPlan")     as string)?.trim() as CustomerPlan | null;
  const note             = (formData.get("note")             as string)?.trim() || null;

  if (!customerId || !salesMemberId || !scheduledAt) return;

  await updateTrialLesson(id, {
    customerId,
    salesMemberId,
    trainerMemberId,
    scheduledAt,
    location,
    status,
    contracted,
    contractPlan: contracted === true ? contractPlan : null,
    note,
  });
  revalidatePath("/trial-lessons");
}

export async function deleteTrialLessonAction(id: string) {
  await deleteTrialLesson(id);
  revalidatePath("/trial-lessons");
}

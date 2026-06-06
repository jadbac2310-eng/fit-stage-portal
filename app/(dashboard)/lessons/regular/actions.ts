"use server";

import { revalidatePath } from "next/cache";
import { addLesson, updateLesson, deleteLesson } from "@/lib/lessons";
import type { LessonPaymentType, LessonStatus } from "@/lib/lessons-types";

export async function createLessonAction(formData: FormData) {
  const customerId      = (formData.get("customerId")      as string)?.trim();
  const trainerMemberId = (formData.get("trainerMemberId") as string)?.trim() || undefined;
  const scheduledAt     = (formData.get("scheduledAt")     as string)?.trim();
  const location        = (formData.get("location")        as string)?.trim() || undefined;
  const course          = (formData.get("course")          as string)?.trim() || undefined;
  const paymentTypeRaw  = (formData.get("paymentType")     as string)?.trim();
  const paymentType     = paymentTypeRaw ? paymentTypeRaw as LessonPaymentType : undefined;
  const note            = (formData.get("note")            as string)?.trim() || undefined;

  if (!customerId || !scheduledAt) return;

  await addLesson({ customerId, trainerMemberId, scheduledAt, location, course, paymentType, note });
  revalidatePath("/lessons/regular");
}

export async function updateLessonAction(id: string, formData: FormData) {
  const trainerMemberId = (formData.get("trainerMemberId") as string)?.trim() || null;
  const scheduledAt     = (formData.get("scheduledAt")     as string)?.trim();
  const location        = (formData.get("location")        as string)?.trim() || null;
  const course          = (formData.get("course")          as string)?.trim() || null;
  const paymentTypeRaw  = (formData.get("paymentType")     as string)?.trim();
  const paymentType     = paymentTypeRaw ? paymentTypeRaw as LessonPaymentType : null;
  const status          = (formData.get("status")          as string)?.trim() as LessonStatus;
  const note            = (formData.get("note")            as string)?.trim() || null;

  if (!scheduledAt) return;

  await updateLesson(id, { trainerMemberId, scheduledAt, location, course, paymentType, status, note });
  revalidatePath("/lessons/regular");
}

export async function deleteLessonAction(id: string) {
  await deleteLesson(id);
  revalidatePath("/lessons/regular");
}

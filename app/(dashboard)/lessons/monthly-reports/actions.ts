"use server";

import { revalidatePath } from "next/cache";
import { upsertMonthlyReport, deleteMonthlyReport } from "@/lib/monthly-reports";

export async function saveMonthlyReportAction(formData: FormData) {
  const customerId       = (formData.get("customerId")       as string)?.trim();
  const trainerMemberId  = (formData.get("trainerMemberId")  as string)?.trim() || null;
  const yearMonth        = (formData.get("yearMonth")        as string)?.trim();
  const content          = (formData.get("content")          as string)?.trim() || null;
  const note             = (formData.get("note")             as string)?.trim() || null;

  if (!customerId || !yearMonth) return;

  await upsertMonthlyReport({ customerId, trainerMemberId, yearMonth, content, note });
  revalidatePath("/lessons/monthly-reports");
}

export async function deleteMonthlyReportAction(id: string) {
  await deleteMonthlyReport(id);
  revalidatePath("/lessons/monthly-reports");
}

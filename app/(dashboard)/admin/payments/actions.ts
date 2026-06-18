"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/members";
import { logActivity } from "@/lib/activity-logs";
import { recordPayment, deletePayment } from "@/lib/payments";
import type { PaymentSourceType } from "@/lib/payments-types";
import { SOURCE_TYPE_LABEL } from "@/lib/payments-types";

export async function recordPaymentAction(formData: FormData) {
  await requireAdmin();
  const sourceType = (formData.get("sourceType") as string)?.trim() as PaymentSourceType;
  const sourceId   = (formData.get("sourceId")   as string)?.trim();
  const customerId = (formData.get("customerId") as string)?.trim() || undefined;
  const amountRaw  = (formData.get("amount")     as string)?.trim();
  const amount     = amountRaw ? parseInt(amountRaw, 10) : 0;
  const paidAt     = (formData.get("paidAt")     as string)?.trim() || null;
  const method     = (formData.get("method")     as string)?.trim() || null;
  const note       = (formData.get("note")       as string)?.trim() || null;

  if (!sourceType || !sourceId) return;

  await recordPayment({ sourceType, sourceId, customerId, amount: Number.isFinite(amount) ? amount : 0, paidAt, method, note });
  await logActivity({
    action: "create", entityType: "payment", entityId: sourceId,
    summary: `入金記録: ${SOURCE_TYPE_LABEL[sourceType]} ¥${(Number.isFinite(amount) ? amount : 0).toLocaleString("ja-JP")}`,
  });
  revalidatePath("/admin/payments");
}

export async function unrecordPaymentAction(sourceType: PaymentSourceType, sourceId: string) {
  await requireAdmin();
  await deletePayment(sourceType, sourceId);
  await logActivity({ action: "delete", entityType: "payment", entityId: sourceId, summary: `入金取消: ${SOURCE_TYPE_LABEL[sourceType]}` });
  revalidatePath("/admin/payments");
}

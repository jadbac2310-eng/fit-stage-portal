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

/** 同じ会社・顧客の複数の未入金項目を、同じ入金日・方法・メモでまとめて入金済みにする。 */
export async function recordPaymentsBulkAction(formData: FormData) {
  await requireAdmin();
  const paidAt = (formData.get("paidAt") as string)?.trim() || null;
  const method = (formData.get("method") as string)?.trim() || null;
  const note   = (formData.get("note")   as string)?.trim() || null;

  let items: { sourceType: PaymentSourceType; sourceId: string; customerId?: string; amount: number }[] = [];
  try {
    const parsed = JSON.parse((formData.get("items") as string) || "[]");
    if (Array.isArray(parsed)) {
      items = parsed.filter((i) => i && typeof i.sourceType === "string" && typeof i.sourceId === "string");
    }
  } catch { items = []; }
  if (items.length === 0) return;

  for (const it of items) {
    await recordPayment({
      sourceType: it.sourceType, sourceId: it.sourceId, customerId: it.customerId,
      amount: Number.isFinite(it.amount) ? it.amount : 0, paidAt, method, note,
    });
  }
  const total = items.reduce((s, i) => s + (Number.isFinite(i.amount) ? i.amount : 0), 0);
  await logActivity({
    action: "create", entityType: "payment",
    summary: `入金記録(まとめて): ${items.length}件 ¥${total.toLocaleString("ja-JP")}`,
  });
  revalidatePath("/admin/payments");
}

export async function unrecordPaymentAction(sourceType: PaymentSourceType, sourceId: string) {
  await requireAdmin();
  await deletePayment(sourceType, sourceId);
  await logActivity({ action: "delete", entityType: "payment", entityId: sourceId, summary: `入金取消: ${SOURCE_TYPE_LABEL[sourceType]}` });
  revalidatePath("/admin/payments");
}

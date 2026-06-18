"use server";

import { revalidatePath } from "next/cache";
import { updateCustomer } from "@/lib/customers";
import { requireAdmin } from "@/lib/members";
import { logActivity } from "@/lib/activity-logs";

// 請求書の宛名（billing_name）を更新する。空なら氏名に戻す。
export async function updateBillingNameAction(customerId: string, name: string) {
  await requireAdmin();
  await updateCustomer(customerId, { billingName: name.trim() || null });
  await logActivity({ action: "update", entityType: "invoice", entityId: customerId, summary: `請求書の宛名を変更: ${name.trim() || "（氏名に戻す）"}` });
  revalidatePath("/invoices");
  revalidatePath("/master/customers");
}

"use server";

import { revalidatePath } from "next/cache";
import { updateCustomer } from "@/lib/customers";
import { requireAdmin } from "@/lib/members";

// 請求書の宛名（billing_name）を更新する。空なら氏名に戻す。
export async function updateBillingNameAction(customerId: string, name: string) {
  await requireAdmin();
  await updateCustomer(customerId, { billingName: name.trim() || null });
  revalidatePath("/invoices");
  revalidatePath("/master/customers");
}

"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/members";
import { logActivity } from "@/lib/activity-logs";
import { runAction, ActionError, type ActionResult } from "@/lib/action-result";
import {
  addCustomerMonthlyItem, updateCustomerMonthlyItem, deleteCustomerMonthlyItem,
} from "@/lib/customer-monthly-items";

function read(formData: FormData) {
  const name      = (formData.get("name")      as string)?.trim();
  const amtRaw    = (formData.get("amount")    as string)?.trim();
  const startedOn = (formData.get("startedOn") as string)?.trim() || null;
  const endedOn   = (formData.get("endedOn")   as string)?.trim() || null;
  const amount    = amtRaw ? parseInt(amtRaw, 10) : NaN;
  if (!name) throw new ActionError("項目名を入力してください");
  if (!Number.isFinite(amount) || amount < 0) throw new ActionError("金額を入力してください");
  if (startedOn && endedOn && startedOn > endedOn) {
    throw new ActionError("終了日は開始日より後にしてください");
  }
  return { name, amount, startedOn, endedOn };
}

export async function createMonthlyItemAction(customerId: string, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    if (!customerId) throw new ActionError("顧客を選択してください");
    const input = read(formData);
    const created = await addCustomerMonthlyItem({ customerId, ...input });
    await logActivity({
      action: "create", entityType: "customer", entityId: customerId,
      summary: `毎月の請求項目を追加: ${created.name} ¥${created.amount.toLocaleString("ja-JP")}`,
    });
    revalidatePath("/master/monthly-items");
    revalidatePath("/invoices");
  });
}

export async function updateMonthlyItemAction(id: string, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    const input = read(formData);
    await updateCustomerMonthlyItem(id, input);
    await logActivity({
      action: "update", entityType: "customer", entityId: id,
      summary: `毎月の請求項目を編集: ${input.name} ¥${input.amount.toLocaleString("ja-JP")}`,
    });
    revalidatePath("/master/monthly-items");
    revalidatePath("/invoices");
  });
}

export async function deleteMonthlyItemAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    await deleteCustomerMonthlyItem(id);
    await logActivity({ action: "delete", entityType: "customer", entityId: id, summary: "毎月の請求項目を削除" });
    revalidatePath("/master/monthly-items");
    revalidatePath("/invoices");
  });
}

"use server";

import { revalidatePath } from "next/cache";
import { addExpense, updateExpense, deleteExpense } from "@/lib/expenses";
import { requireAdmin, getCurrentMember } from "@/lib/members";
import { logActivity } from "@/lib/activity-logs";
import { runAction, ActionError, type ActionResult } from "@/lib/action-result";

/** フォームから経費の入力値を取り出す。金額は0以上の整数のみ受け付ける */
function readForm(formData: FormData) {
  const incurredOn = (formData.get("incurredOn") as string)?.trim();
  const category   = (formData.get("category")   as string)?.trim() || "その他";
  const title      = (formData.get("title")      as string)?.trim();
  const amountRaw  = (formData.get("amount")     as string)?.trim();
  const note       = (formData.get("note")       as string)?.trim() || undefined;
  const amount     = parseInt(amountRaw, 10);

  if (!incurredOn) throw new ActionError("日付を入力してください");
  if (!title)      throw new ActionError("内容を入力してください");
  if (!Number.isFinite(amount) || amount < 0) throw new ActionError("金額は0以上の数字で入力してください");

  return { incurredOn, category, title, amount, note };
}

export async function createExpenseAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    const input = readForm(formData);
    const me = await getCurrentMember();

    const created = await addExpense({ ...input, createdBy: me?.id });
    await logActivity({
      action: "create", entityType: "expense", entityId: created.id,
      summary: `経費を追加: ${input.title}（${input.amount}円）`,
    });
    revalidatePath("/master/expenses");
    revalidatePath("/admin/dashboard");
  });
}

export async function updateExpenseAction(id: string, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    const input = readForm(formData);

    await updateExpense(id, { ...input, note: input.note ?? null });
    await logActivity({
      action: "update", entityType: "expense", entityId: id,
      summary: `経費を編集: ${input.title}（${input.amount}円）`,
    });
    revalidatePath("/master/expenses");
    revalidatePath("/admin/dashboard");
  });
}

export async function deleteExpenseAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    await deleteExpense(id);
    await logActivity({ action: "delete", entityType: "expense", entityId: id, summary: "経費を削除" });
    revalidatePath("/master/expenses");
    revalidatePath("/admin/dashboard");
  });
}

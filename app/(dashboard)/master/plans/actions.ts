"use server";

import { revalidatePath } from "next/cache";
import { updatePlanAmount, updateSessionPassPriceAmount } from "@/lib/plans-master";
import { getCurrentIsAdmin } from "@/lib/members";

function parseAmount(formData: FormData): number | null {
  const raw = (formData.get("amount") as string)?.trim();
  const amount = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

export async function updatePlanAmountAction(id: string, formData: FormData) {
  if (!(await getCurrentIsAdmin())) throw new Error("権限がありません");

  const amount = parseAmount(formData);
  if (amount === null) return;

  await updatePlanAmount(id, amount);
  revalidatePath("/master/plans");
  // 金額変更は売上・歩合の単価に影響するため関連画面も再検証
  revalidatePath("/commissions");
  revalidatePath("/dashboard");
  revalidatePath("/plans");
}

export async function updateSessionPassPriceAmountAction(id: string, formData: FormData) {
  if (!(await getCurrentIsAdmin())) throw new Error("権限がありません");

  const amount = parseAmount(formData);
  if (amount === null) return;

  await updateSessionPassPriceAmount(id, amount);
  revalidatePath("/master/plans");
  revalidatePath("/plans");
}

"use server";

import { revalidatePath } from "next/cache";
import {
  addCustomerPlan, updateCustomerPlan, deleteCustomerPlan,
  getCustomerPlans,
} from "@/lib/customer-plans";
import { plansOverlap } from "@/lib/customer-plans-types";
import type { CustomerPlan } from "@/lib/customer-plans-types";

async function checkOverlap(
  customerId: string,
  startedAt: string,
  endedAt: string | null,
  excludeId?: string,
): Promise<string | null> {
  const existing = await getCustomerPlans(customerId);
  const conflict = existing.find((p) => {
    if (p.id === excludeId) return false;
    return plansOverlap(startedAt, endedAt, p.startedAt, p.endedAt ?? null);
  });
  if (!conflict) return null;
  const label = conflict.endedAt
    ? `${conflict.startedAt} ～ ${conflict.endedAt}`
    : `${conflict.startedAt} ～ 現在`;
  return `期間が重複しています（既存プラン: ${label}）`;
}

export async function createPlanAction(formData: FormData) {
  const customerId = (formData.get("customerId") as string)?.trim();
  const plan       = (formData.get("plan")       as string)?.trim() as CustomerPlan;
  const startedAt  = (formData.get("startedAt")  as string)?.trim();
  const endedAt    = (formData.get("endedAt")    as string)?.trim() || null;
  const note       = (formData.get("note")       as string)?.trim() || undefined;

  if (!customerId || !plan || !startedAt) return;

  const err = await checkOverlap(customerId, startedAt, endedAt);
  if (err) throw new Error(err);

  await addCustomerPlan({ customerId, plan, startedAt, endedAt: endedAt ?? undefined, note });
  revalidatePath("/plans");
}

export async function updatePlanAction(id: string, customerId: string, formData: FormData) {
  const plan      = (formData.get("plan")      as string)?.trim() as CustomerPlan;
  const startedAt = (formData.get("startedAt") as string)?.trim();
  const endedAt   = (formData.get("endedAt")   as string)?.trim() || null;
  const note      = (formData.get("note")      as string)?.trim() || null;

  if (!plan || !startedAt) return;

  const err = await checkOverlap(customerId, startedAt, endedAt, id);
  if (err) throw new Error(err);

  await updateCustomerPlan(id, { plan, startedAt, endedAt, note });
  revalidatePath("/plans");
}

export async function deletePlanAction(id: string) {
  await deleteCustomerPlan(id);
  revalidatePath("/plans");
}

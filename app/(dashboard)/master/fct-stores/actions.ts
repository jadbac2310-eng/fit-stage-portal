"use server";

import { revalidatePath } from "next/cache";
import { addFctStore, updateFctStore, deleteFctStore, FCT_DEFAULT_RATE } from "@/lib/fct-stores";
import { requireAdmin } from "@/lib/members";
import { logActivity } from "@/lib/activity-logs";

/** 歩合率（%）。未入力・範囲外は既定の45% */
function readRate(formData: FormData): number {
  const raw = (formData.get("rate") as string)?.trim();
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : FCT_DEFAULT_RATE;
}

export async function createFctStoreAction(formData: FormData) {
  await requireAdmin();
  const name    = (formData.get("name")    as string)?.trim();
  const address = (formData.get("address") as string)?.trim() || undefined;
  const feeRaw  = (formData.get("fee")     as string)?.trim();
  const fee     = feeRaw ? parseInt(feeRaw, 10) : 0;
  if (!name) return;

  const created = await addFctStore({ name, address, fee: Number.isFinite(fee) ? fee : 0, rate: readRate(formData) });
  await logActivity({ action: "create", entityType: "fct_store", entityId: created.id, summary: `FCT店舗を追加: ${name}` });
  revalidatePath("/master/fct-stores");
}

export async function updateFctStoreAction(id: string, formData: FormData) {
  await requireAdmin();
  const name    = (formData.get("name")    as string)?.trim();
  const address = (formData.get("address") as string)?.trim() || null;
  const feeRaw  = (formData.get("fee")     as string)?.trim();
  const fee     = feeRaw ? parseInt(feeRaw, 10) : 0;
  if (!name) return;

  await updateFctStore(id, { name, address, fee: Number.isFinite(fee) ? fee : 0, rate: readRate(formData) });
  await logActivity({ action: "update", entityType: "fct_store", entityId: id, summary: `FCT店舗を編集: ${name}` });
  revalidatePath("/master/fct-stores");
}

export async function deleteFctStoreAction(id: string) {
  await requireAdmin();
  await deleteFctStore(id);
  await logActivity({ action: "delete", entityType: "fct_store", entityId: id, summary: "FCT店舗を削除" });
  revalidatePath("/master/fct-stores");
}

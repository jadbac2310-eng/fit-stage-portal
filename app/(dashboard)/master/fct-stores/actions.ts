"use server";

import { revalidatePath } from "next/cache";
import { addFctStore, updateFctStore, deleteFctStore } from "@/lib/fct-stores";
import { requireAdmin } from "@/lib/members";
import { logActivity } from "@/lib/activity-logs";

export async function createFctStoreAction(formData: FormData) {
  await requireAdmin();
  const name    = (formData.get("name")    as string)?.trim();
  const address = (formData.get("address") as string)?.trim() || undefined;
  const feeRaw  = (formData.get("fee")     as string)?.trim();
  const fee     = feeRaw ? parseInt(feeRaw, 10) : 0;
  if (!name) return;

  const created = await addFctStore({ name, address, fee: Number.isFinite(fee) ? fee : 0 });
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

  await updateFctStore(id, { name, address, fee: Number.isFinite(fee) ? fee : 0 });
  await logActivity({ action: "update", entityType: "fct_store", entityId: id, summary: `FCT店舗を編集: ${name}` });
  revalidatePath("/master/fct-stores");
}

export async function deleteFctStoreAction(id: string) {
  await requireAdmin();
  await deleteFctStore(id);
  await logActivity({ action: "delete", entityType: "fct_store", entityId: id, summary: "FCT店舗を削除" });
  revalidatePath("/master/fct-stores");
}

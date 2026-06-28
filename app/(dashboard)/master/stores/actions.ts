"use server";

import { revalidatePath } from "next/cache";
import { addStore, updateStore, deleteStore, DEFAULT_STORE_FEE } from "@/lib/stores";
import { requireAdmin } from "@/lib/members";
import { logActivity } from "@/lib/activity-logs";

export async function createStoreAction(formData: FormData) {
  await requireAdmin();
  const name    = (formData.get("name")    as string)?.trim();
  const address = (formData.get("address") as string)?.trim() || undefined;
  const feeRaw  = (formData.get("fee")     as string)?.trim();
  const fee     = feeRaw ? parseInt(feeRaw, 10) : DEFAULT_STORE_FEE;
  if (!name) return;

  const created = await addStore({ name, address, fee: Number.isFinite(fee) ? fee : DEFAULT_STORE_FEE });
  await logActivity({ action: "create", entityType: "store", entityId: created.id, summary: `店舗を追加: ${name}` });
  revalidatePath("/master/stores");
}

export async function updateStoreAction(id: string, formData: FormData) {
  await requireAdmin();
  const name    = (formData.get("name")    as string)?.trim();
  const address = (formData.get("address") as string)?.trim() || null;
  const feeRaw  = (formData.get("fee")     as string)?.trim();
  const fee     = feeRaw ? parseInt(feeRaw, 10) : DEFAULT_STORE_FEE;
  if (!name) return;

  await updateStore(id, { name, address, fee: Number.isFinite(fee) ? fee : DEFAULT_STORE_FEE });
  await logActivity({ action: "update", entityType: "store", entityId: id, summary: `店舗を編集: ${name}` });
  revalidatePath("/master/stores");
}

export async function deleteStoreAction(id: string) {
  await requireAdmin();
  await deleteStore(id);
  await logActivity({ action: "delete", entityType: "store", entityId: id, summary: "店舗を削除" });
  revalidatePath("/master/stores");
}

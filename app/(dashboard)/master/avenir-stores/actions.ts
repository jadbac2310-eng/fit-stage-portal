"use server";

import { revalidatePath } from "next/cache";
import { addAvenirStore, updateAvenirStore, deleteAvenirStore } from "@/lib/avenir-stores";
import { requireAdmin } from "@/lib/members";
import { logActivity } from "@/lib/activity-logs";

export async function createAvenirStoreAction(formData: FormData) {
  await requireAdmin();
  const name    = (formData.get("name")    as string)?.trim();
  const address = (formData.get("address") as string)?.trim() || undefined;
  const feeRaw  = (formData.get("fee")     as string)?.trim();
  const fee     = feeRaw ? parseInt(feeRaw, 10) : 0;
  if (!name) return;

  const created = await addAvenirStore({ name, address, fee: Number.isFinite(fee) ? fee : 0 });
  await logActivity({ action: "create", entityType: "avenir_store", entityId: created.id, summary: `アヴニール店舗を追加: ${name}` });
  revalidatePath("/master/avenir-stores");
}

export async function updateAvenirStoreAction(id: string, formData: FormData) {
  await requireAdmin();
  const name    = (formData.get("name")    as string)?.trim();
  const address = (formData.get("address") as string)?.trim() || null;
  const feeRaw  = (formData.get("fee")     as string)?.trim();
  const fee     = feeRaw ? parseInt(feeRaw, 10) : 0;
  if (!name) return;

  await updateAvenirStore(id, { name, address, fee: Number.isFinite(fee) ? fee : 0 });
  await logActivity({ action: "update", entityType: "avenir_store", entityId: id, summary: `アヴニール店舗を編集: ${name}` });
  revalidatePath("/master/avenir-stores");
}

export async function deleteAvenirStoreAction(id: string) {
  await requireAdmin();
  await deleteAvenirStore(id);
  await logActivity({ action: "delete", entityType: "avenir_store", entityId: id, summary: "アヴニール店舗を削除" });
  revalidatePath("/master/avenir-stores");
}

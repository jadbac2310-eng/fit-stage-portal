"use server";

import { revalidatePath } from "next/cache";
import { addRentalGym, updateRentalGym, deleteRentalGym } from "@/lib/rental-gyms";
import { requireAdmin } from "@/lib/members";
import { logActivity } from "@/lib/activity-logs";

export async function createRentalGymAction(formData: FormData) {
  await requireAdmin();
  const name    = (formData.get("name")    as string)?.trim();
  const address = (formData.get("address") as string)?.trim() || undefined;
  const feeRaw  = (formData.get("fee")     as string)?.trim();
  const fee     = feeRaw ? parseInt(feeRaw, 10) : 0;
  if (!name) return;

  const created = await addRentalGym({ name, address, fee: Number.isFinite(fee) ? fee : 0 });
  await logActivity({ action: "create", entityType: "rental_gym", entityId: created.id, summary: `レンタルジムを追加: ${name}` });
  revalidatePath("/master/rental-gyms");
}

export async function updateRentalGymAction(id: string, formData: FormData) {
  await requireAdmin();
  const name    = (formData.get("name")    as string)?.trim();
  const address = (formData.get("address") as string)?.trim() || null;
  const feeRaw  = (formData.get("fee")     as string)?.trim();
  const fee     = feeRaw ? parseInt(feeRaw, 10) : 0;
  if (!name) return;

  await updateRentalGym(id, { name, address, fee: Number.isFinite(fee) ? fee : 0 });
  await logActivity({ action: "update", entityType: "rental_gym", entityId: id, summary: `レンタルジムを編集: ${name}` });
  revalidatePath("/master/rental-gyms");
}

export async function deleteRentalGymAction(id: string) {
  await requireAdmin();
  await deleteRentalGym(id);
  await logActivity({ action: "delete", entityType: "rental_gym", entityId: id, summary: "レンタルジムを削除" });
  revalidatePath("/master/rental-gyms");
}

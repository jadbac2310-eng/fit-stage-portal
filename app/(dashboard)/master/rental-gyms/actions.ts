"use server";

import { revalidatePath } from "next/cache";
import { addRentalGym, updateRentalGym, deleteRentalGym } from "@/lib/rental-gyms";
import { requireAdmin } from "@/lib/members";

export async function createRentalGymAction(formData: FormData) {
  await requireAdmin();
  const name    = (formData.get("name")    as string)?.trim();
  const address = (formData.get("address") as string)?.trim() || undefined;
  const feeRaw  = (formData.get("fee")     as string)?.trim();
  const fee     = feeRaw ? parseInt(feeRaw, 10) : 0;
  if (!name) return;

  await addRentalGym({ name, address, fee: Number.isFinite(fee) ? fee : 0 });
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
  revalidatePath("/master/rental-gyms");
}

export async function deleteRentalGymAction(id: string) {
  await requireAdmin();
  await deleteRentalGym(id);
  revalidatePath("/master/rental-gyms");
}

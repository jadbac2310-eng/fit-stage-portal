"use server";

import { revalidatePath } from "next/cache";
import { addMaterial, updateMaterial, deleteMaterial, getMaterial } from "@/lib/materials";
import { saveMaterialImage, deleteMaterialImage } from "@/lib/upload";
import { getCurrentIsAdmin, getCurrentMember } from "@/lib/members";

export async function createMaterialAction(formData: FormData) {
  if (!(await getCurrentIsAdmin())) throw new Error("権限がありません");

  const name        = (formData.get("name")        as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || undefined;
  if (!name) return;

  const imageFile = formData.get("image") as File | null;
  if (!imageFile || imageFile.size === 0) return;

  const imageUrl = await saveMaterialImage(imageFile, crypto.randomUUID());
  if (!imageUrl) return;

  const currentMember = await getCurrentMember();
  await addMaterial({ name, description, imageUrl, createdById: currentMember?.id });
  revalidatePath("/master/materials");
}

export async function updateMaterialAction(id: string, formData: FormData) {
  if (!(await getCurrentIsAdmin())) throw new Error("権限がありません");

  const name        = (formData.get("name")        as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || undefined;
  if (!name) return;

  const patch: Parameters<typeof updateMaterial>[1] = { name, description };

  const imageFile = formData.get("image") as File | null;
  if (imageFile && imageFile.size > 0) {
    const existing = await getMaterial(id);
    if (existing?.imageUrl) await deleteMaterialImage(existing.imageUrl);
    const imageUrl = await saveMaterialImage(imageFile, id);
    if (imageUrl) patch.imageUrl = imageUrl;
  }

  await updateMaterial(id, patch);
  revalidatePath("/master/materials");
}

export async function deleteMaterialAction(id: string) {
  if (!(await getCurrentIsAdmin())) throw new Error("権限がありません");
  const existing = await getMaterial(id);
  if (existing?.imageUrl) await deleteMaterialImage(existing.imageUrl);
  await deleteMaterial(id);
  revalidatePath("/master/materials");
}

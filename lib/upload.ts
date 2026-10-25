import { createAdminClient } from "./supabase";

const BUCKET = "member-avatars";
/** 受け付ける写真の形式。画面のエラー文言でも使うので外に出してある */
export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const AVATAR_MAX_SIZE = 5 * 1024 * 1024; // 5MB

// ─── 素材画像 ─────────────────────────────────────────
const MATERIAL_BUCKET = "material-images";
const MATERIAL_ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
const MATERIAL_MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function saveMaterialImage(
  file: File,
  materialId: string
): Promise<string | null> {
  if (!MATERIAL_ALLOWED.includes(file.type)) return null;
  if (file.size > MATERIAL_MAX_SIZE) return null;

  const supabase = createAdminClient();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${materialId}.${ext}`;

  const { error } = await supabase.storage
    .from(MATERIAL_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) return null;

  const { publicUrl } = supabase.storage.from(MATERIAL_BUCKET).getPublicUrl(path).data;
  return `${publicUrl}?t=${Date.now()}`;
}

export async function deleteMaterialImage(imageUrl: string): Promise<void> {
  const supabase = createAdminClient();
  const marker = `/object/public/${MATERIAL_BUCKET}/`;
  const idx = imageUrl.indexOf(marker);
  if (idx === -1) return;
  const filePath = imageUrl.slice(idx + marker.length);
  await supabase.storage.from(MATERIAL_BUCKET).remove([filePath]);
}

export async function saveMemberAvatar(
  file: File,
  memberId: string
): Promise<string | null> {
  if (!AVATAR_TYPES.includes(file.type)) return null;
  if (file.size > AVATAR_MAX_SIZE) return null;

  const supabase = createAdminClient();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${memberId}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) return null;

  const { publicUrl } = supabase.storage.from(BUCKET).getPublicUrl(path).data;
  return `${publicUrl}?t=${Date.now()}`;
}

export async function deleteMemberAvatar(avatarUrl: string): Promise<void> {
  const supabase = createAdminClient();
  const marker = `/object/public/${BUCKET}/`;
  const idx = avatarUrl.indexOf(marker);
  if (idx === -1) return;
  const filePath = avatarUrl.slice(idx + marker.length);
  await supabase.storage.from(BUCKET).remove([filePath]);
}

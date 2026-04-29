import { createAdminClient } from "./supabase";

const BUCKET = "member-avatars";
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function saveMemberAvatar(
  file: File,
  memberId: string
): Promise<string | null> {
  if (!ALLOWED.includes(file.type)) return null;
  if (file.size > MAX_SIZE) return null;

  const supabase = createAdminClient();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${memberId}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) return null;

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function deleteMemberAvatar(avatarUrl: string): Promise<void> {
  const supabase = createAdminClient();
  const marker = `/object/public/${BUCKET}/`;
  const idx = avatarUrl.indexOf(marker);
  if (idx === -1) return;
  const filePath = avatarUrl.slice(idx + marker.length);
  await supabase.storage.from(BUCKET).remove([filePath]);
}

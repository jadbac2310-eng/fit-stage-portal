import { createAdminClient } from "./supabase";

export interface MaterialMember {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface Material {
  id: string;
  name: string;
  description?: string;
  imageUrl: string;
  createdAt: string;
  createdBy?: MaterialMember;
}

type DbRow = {
  id: string;
  name: string;
  description: string | null;
  image_url: string;
  created_at: string;
  members: { id: string; name: string; avatar_url: string | null } | null;
};

function fromDb(row: DbRow): Material {
  return {
    id:          row.id,
    name:        row.name,
    description: row.description ?? undefined,
    imageUrl:    row.image_url,
    createdAt:   row.created_at,
    createdBy:   row.members
      ? { id: row.members.id, name: row.members.name, avatarUrl: row.members.avatar_url ?? undefined }
      : undefined,
  };
}

const SELECT = "*, members(id, name, avatar_url)";

export async function getMaterials({
  page = 1,
  pageSize = 12,
}: { page?: number; pageSize?: number } = {}): Promise<{ materials: Material[]; total: number }> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await createAdminClient()
    .from("materials")
    .select(SELECT, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;
  return {
    materials: (data as DbRow[]).map(fromDb),
    total: count ?? 0,
  };
}

export async function getMaterialsCount(): Promise<number> {
  const { count, error } = await createAdminClient()
    .from("materials")
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function getMaterial(id: string): Promise<Material | null> {
  const { data, error } = await createAdminClient()
    .from("materials")
    .select(SELECT)
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return fromDb(data as DbRow);
}

export async function addMaterial(
  data: Omit<Material, "id" | "createdAt" | "createdBy"> & { createdById?: string }
): Promise<Material> {
  const { data: row, error } = await createAdminClient()
    .from("materials")
    .insert({
      name:        data.name,
      description: data.description ?? null,
      image_url:   data.imageUrl,
      created_by:  data.createdById ?? null,
    })
    .select(SELECT)
    .single();
  if (error) throw error;
  return fromDb(row as DbRow);
}

export async function updateMaterial(
  id: string,
  data: Partial<Omit<Material, "id" | "createdAt" | "createdBy">>
): Promise<Material | null> {
  const patch: Record<string, unknown> = {};
  if (data.name        !== undefined) patch.name        = data.name;
  if (data.description !== undefined) patch.description = data.description ?? null;
  if (data.imageUrl    !== undefined) patch.image_url   = data.imageUrl;

  const { data: row, error } = await createAdminClient()
    .from("materials")
    .update(patch)
    .eq("id", id)
    .select(SELECT)
    .single();
  if (error) throw error;
  return fromDb(row as DbRow);
}

export async function deleteMaterial(id: string): Promise<void> {
  const { error } = await createAdminClient()
    .from("materials")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

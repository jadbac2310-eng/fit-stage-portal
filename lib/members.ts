import { createAdminClient, createAuthClient } from "./supabase";

export interface Member {
  id: string;
  name: string;
  email?: string;
  role?: string;
  note?: string;
  avatarUrl?: string;
  authUserId?: string;
  isAdmin: boolean;
  createdAt: string;
}

type DbRow = {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  note: string | null;
  avatar_url: string | null;
  auth_user_id: string | null;
  is_admin: boolean;
  created_at: string;
};

function fromDb(row: DbRow): Member {
  return {
    id:         row.id,
    name:       row.name,
    email:      row.email        ?? undefined,
    role:       row.role         ?? undefined,
    note:       row.note         ?? undefined,
    avatarUrl:  row.avatar_url   ?? undefined,
    authUserId: row.auth_user_id ?? undefined,
    isAdmin:    row.is_admin,
    createdAt:  row.created_at,
  };
}

export async function getMembers(): Promise<Member[]> {
  const { data, error } = await createAdminClient()
    .from("members")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  const members = (data as DbRow[]).map(fromDb);
  const president = members.filter((m) => m.role?.includes("社長"));
  const others    = members.filter((m) => !m.role?.includes("社長"));
  return [...president, ...others];
}

export async function getMember(id: string): Promise<Member | null> {
  const { data, error } = await createAdminClient()
    .from("members")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return fromDb(data as DbRow);
}

export async function getMemberByEmail(email: string): Promise<Member | null> {
  const { data, error } = await createAdminClient()
    .from("members")
    .select("*")
    .eq("email", email)
    .single();
  if (error || !data) return null;
  return fromDb(data as DbRow);
}

export async function addMember(
  data: Omit<Member, "id" | "createdAt">
): Promise<Member> {
  const { data: row, error } = await createAdminClient()
    .from("members")
    .insert({
      name:         data.name,
      email:        data.email      ?? null,
      role:         data.role       ?? null,
      note:         data.note       ?? null,
      avatar_url:   data.avatarUrl  ?? null,
      auth_user_id: data.authUserId ?? null,
      is_admin:     data.isAdmin,
    })
    .select()
    .single();
  if (error) throw error;
  return fromDb(row as DbRow);
}

export async function updateMember(
  id: string,
  data: Partial<Omit<Member, "id" | "createdAt">>
): Promise<Member | null> {
  const patch: Record<string, unknown> = {};
  if (data.name       !== undefined) patch.name         = data.name;
  if (data.email      !== undefined) patch.email        = data.email      ?? null;
  if (data.role       !== undefined) patch.role         = data.role       ?? null;
  if (data.note       !== undefined) patch.note         = data.note       ?? null;
  if (data.avatarUrl  !== undefined) patch.avatar_url   = data.avatarUrl  ?? null;
  if (data.authUserId !== undefined) patch.auth_user_id = data.authUserId ?? null;
  if (data.isAdmin    !== undefined) patch.is_admin     = data.isAdmin;

  const { data: row, error } = await createAdminClient()
    .from("members")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return fromDb(row as DbRow);
}

export async function getMemberByAuthUserId(authUserId: string): Promise<Member | null> {
  const { data, error } = await createAdminClient()
    .from("members")
    .select("*")
    .eq("auth_user_id", authUserId)
    .single();
  if (error || !data) return null;
  return fromDb(data as DbRow);
}

export async function getCurrentMember(): Promise<Member | null> {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return getMemberByAuthUserId(user.id);
}

export async function getCurrentIsAdmin(): Promise<boolean> {
  const member = await getCurrentMember();
  return member?.isAdmin ?? false;
}

export async function deleteMember(id: string): Promise<void> {
  const { error } = await createAdminClient()
    .from("members")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

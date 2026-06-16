import { createAdminClient } from "./supabase";

export interface RentalGym {
  id:        string;
  name:      string;
  address?:  string;
  fee:       number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

type DbRow = {
  id:         string;
  name:       string;
  address:    string | null;
  fee:        number;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function fromDb(row: DbRow): RentalGym {
  return {
    id:        row.id,
    name:      row.name,
    address:   row.address ?? undefined,
    fee:       row.fee,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getRentalGyms(): Promise<RentalGym[]> {
  const { data, error } = await createAdminClient()
    .from("rental_gyms")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    // テーブル未作成（マイグレーション未適用）の場合は空で耐える
    if (error.code === "42P01" || /does not exist|could not find the table/i.test(error.message)) return [];
    throw error;
  }
  return (data as DbRow[]).map(fromDb);
}

export async function addRentalGym(input: { name: string; address?: string; fee: number }): Promise<RentalGym> {
  const { data, error } = await createAdminClient()
    .from("rental_gyms")
    .insert({ name: input.name, address: input.address ?? null, fee: input.fee })
    .select()
    .single();
  if (error) throw error;
  return fromDb(data as DbRow);
}

export async function updateRentalGym(
  id: string,
  input: Partial<{ name: string; address: string | null; fee: number }>,
): Promise<RentalGym> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name    !== undefined) patch.name    = input.name;
  if (input.address !== undefined) patch.address = input.address;
  if (input.fee     !== undefined) patch.fee     = input.fee;

  const { data, error } = await createAdminClient()
    .from("rental_gyms")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return fromDb(data as DbRow);
}

export async function deleteRentalGym(id: string): Promise<void> {
  const { error } = await createAdminClient().from("rental_gyms").delete().eq("id", id);
  if (error) throw error;
}

export async function getRentalGymsCount(): Promise<number> {
  const { count, error } = await createAdminClient()
    .from("rental_gyms")
    .select("*", { count: "exact", head: true });
  if (error) return 0;
  return count ?? 0;
}

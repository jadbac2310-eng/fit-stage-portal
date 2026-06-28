import { createAdminClient } from "./supabase";

// 店舗の既定利用料（一律2000円）
export const DEFAULT_STORE_FEE = 2000;

export interface Store {
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

function fromDb(row: DbRow): Store {
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

export async function getStores(): Promise<Store[]> {
  const { data, error } = await createAdminClient()
    .from("stores")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    if (error.code === "42P01" || /does not exist|could not find the table/i.test(error.message)) return [];
    throw error;
  }
  return (data as DbRow[]).map(fromDb);
}

export async function addStore(input: { name: string; address?: string; fee: number }): Promise<Store> {
  const { data, error } = await createAdminClient()
    .from("stores")
    .insert({ name: input.name, address: input.address ?? null, fee: input.fee })
    .select()
    .single();
  if (error) throw error;
  return fromDb(data as DbRow);
}

export async function updateStore(
  id: string,
  input: Partial<{ name: string; address: string | null; fee: number }>,
): Promise<Store> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name    !== undefined) patch.name    = input.name;
  if (input.address !== undefined) patch.address = input.address;
  if (input.fee     !== undefined) patch.fee     = input.fee;

  const { data, error } = await createAdminClient()
    .from("stores")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return fromDb(data as DbRow);
}

export async function deleteStore(id: string): Promise<void> {
  const { error } = await createAdminClient().from("stores").delete().eq("id", id);
  if (error) throw error;
}

export async function getStoresCount(): Promise<number> {
  const { count, error } = await createAdminClient()
    .from("stores")
    .select("*", { count: "exact", head: true });
  if (error) return 0;
  return count ?? 0;
}

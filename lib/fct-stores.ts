import { createAdminClient } from "./supabase";

// FCT店舗。レンタルジムと同じく1回あたりの利用料を持ち、利益計算で差し引く。
// 店舗マスタ(stores)は利用料が無い別概念。
export interface FctStore {
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

function fromDb(row: DbRow): FctStore {
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

export async function getFctStores(): Promise<FctStore[]> {
  const { data, error } = await createAdminClient()
    .from("fct_stores")
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

export async function addFctStore(input: { name: string; address?: string; fee: number }): Promise<FctStore> {
  const { data, error } = await createAdminClient()
    .from("fct_stores")
    .insert({ name: input.name, address: input.address ?? null, fee: input.fee })
    .select()
    .single();
  if (error) throw error;
  return fromDb(data as DbRow);
}

export async function updateFctStore(
  id: string,
  input: Partial<{ name: string; address: string | null; fee: number }>,
): Promise<FctStore> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name    !== undefined) patch.name    = input.name;
  if (input.address !== undefined) patch.address = input.address;
  if (input.fee     !== undefined) patch.fee     = input.fee;

  const { data, error } = await createAdminClient()
    .from("fct_stores")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return fromDb(data as DbRow);
}

export async function deleteFctStore(id: string): Promise<void> {
  const { error } = await createAdminClient().from("fct_stores").delete().eq("id", id);
  if (error) throw error;
}

export async function getFctStoresCount(): Promise<number> {
  const { count, error } = await createAdminClient()
    .from("fct_stores")
    .select("*", { count: "exact", head: true });
  if (error) return 0;
  return count ?? 0;
}

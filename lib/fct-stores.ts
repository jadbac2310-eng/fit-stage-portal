import { createAdminClient } from "./supabase";
import { FCT_DEFAULT_RATE } from "./fct-types";
export { FCT_DEFAULT_RATE } from "./fct-types";

// FCT店舗。レンタルジムと同じく1回あたりの利用料を持ち、利益計算で差し引く。
// 店舗マスタ(stores)は利用料が無い別概念。
export interface FctStore {
  id:        string;
  name:      string;
  address?:  string;
  fee:       number;
  /** FCTが払ってくれる歩合率（%）。お客さまの単価の税抜にこれをかけた額が入る */
  rate:      number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

type DbRow = {
  id:         string;
  name:       string;
  address:    string | null;
  fee:        number;
  rate?:      number | null;
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
    rate:      row.rate ?? FCT_DEFAULT_RATE,
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

export async function addFctStore(input: { name: string; address?: string; fee: number; rate?: number }): Promise<FctStore> {
  const client = createAdminClient();
  const row = {
    name: input.name, address: input.address ?? null, fee: input.fee,
    rate: input.rate ?? FCT_DEFAULT_RATE,
  };
  let { data, error } = await client.from("fct_stores").insert(row).select().single();
  // rate 列が未適用の環境では、その列を外して再試行
  if (error && isMissingRate(error)) {
    const { rate, ...rest } = row;
    void rate;
    ({ data, error } = await client.from("fct_stores").insert(rest).select().single());
  }
  if (error) throw error;
  return fromDb(data as DbRow);
}

/** rate 列がまだ無い環境か（マイグレーション未適用） */
function isMissingRate(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  return /\brate\b/i.test(error.message ?? "") &&
         (error.code === "42703" || error.code === "PGRST204" || /column/i.test(error.message ?? ""));
}

export async function updateFctStore(
  id: string,
  input: Partial<{ name: string; address: string | null; fee: number; rate: number }>,
): Promise<FctStore> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name    !== undefined) patch.name    = input.name;
  if (input.address !== undefined) patch.address = input.address;
  if (input.fee     !== undefined) patch.fee     = input.fee;
  if (input.rate    !== undefined) patch.rate    = input.rate;

  const client = createAdminClient();
  let { data, error } = await client.from("fct_stores").update(patch).eq("id", id).select().single();
  if (error && isMissingRate(error)) {
    const { rate, ...rest } = patch;
    void rate;
    ({ data, error } = await client.from("fct_stores").update(rest).eq("id", id).select().single());
  }
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

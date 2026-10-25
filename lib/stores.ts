import { cache } from "react";
import { createAdminClient } from "./supabase";

// 店舗（自社/提携の店舗）。店舗によっては1回あたりの利用料がかかる（江坂店は0円、庄内店・曽根城山店は2,500円など）
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
  fee?:       number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function fromDb(row: DbRow): Store {
  return {
    id:        row.id,
    name:      row.name,
    address:   row.address ?? undefined,
    fee:       row.fee ?? 0,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getStoresUncached(): Promise<Store[]> {
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

export async function addStore(input: { name: string; address?: string; fee?: number }): Promise<Store> {
  const client = createAdminClient();
  const row = { name: input.name, address: input.address ?? null };
  // fee 列（マイグレーション 20261014000001）。未適用の環境では列を落として再試行する
  let { data, error } = await client.from("stores").insert({ ...row, fee: input.fee ?? 0 }).select().single();
  if (error && isMissingFee(error)) {
    ({ data, error } = await client.from("stores").insert(row).select().single());
  }
  if (error) throw error;
  return fromDb(data as DbRow);
}

function isMissingFee(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return err.code === "42703" || err.code === "PGRST204" || /fee/i.test(err.message ?? "");
}

export async function updateStore(
  id: string,
  input: Partial<{ name: string; address: string | null; fee: number }>,
): Promise<Store> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name    !== undefined) patch.name    = input.name;
  if (input.address !== undefined) patch.address = input.address;

  const client = createAdminClient();
  let { data, error } = await client.from("stores")
    .update(input.fee !== undefined ? { ...patch, fee: input.fee } : patch)
    .eq("id", id).select().single();
  if (error && isMissingFee(error)) {
    ({ data, error } = await client.from("stores").update(patch).eq("id", id).select().single());
  }
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

/**
 * 同じリクエストの中では1回だけ読む（React の cache）。
 *
 * 1ページ表示するのに、レイアウト・ページ・サーバーアクションが
 * それぞれ同じ表を取りに行っていた。中身は同じなので、最初の1回を使い回す。
 * 次のリクエストでは必ず読み直すので、画面が古くなることはない。
 */
export const getStores = cache(getStoresUncached);

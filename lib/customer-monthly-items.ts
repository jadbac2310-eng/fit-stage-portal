import { createAdminClient, fetchAllRows } from "./supabase";
import type { CustomerMonthlyItem } from "./customer-monthly-items-types";

export type { CustomerMonthlyItem } from "./customer-monthly-items-types";
export { isMonthlyItemActive } from "./customer-monthly-items-types";

type DbRow = {
  id:          string;
  customer_id: string;
  name:        string;
  amount:      number;
  started_on:  string | null;
  ended_on:    string | null;
  sort_order:  number;
  created_at:  string;
  updated_at:  string;
};

function fromDb(row: DbRow): CustomerMonthlyItem {
  return {
    id:         row.id,
    customerId: row.customer_id,
    name:       row.name,
    amount:     row.amount,
    startedOn:  row.started_on ?? undefined,
    endedOn:    row.ended_on ?? undefined,
    sortOrder:  row.sort_order,
    createdAt:  row.created_at,
    updatedAt:  row.updated_at,
  };
}

// テーブル未作成（マイグレーション未適用）でも請求書画面を落とさないための判定
function isMissingTable(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return err.code === "42P01" || err.code === "PGRST205"
    || /customer_monthly_items|does not exist|could not find the table/i.test(err.message ?? "");
}

export async function getCustomerMonthlyItems(): Promise<CustomerMonthlyItem[]> {
  const client = createAdminClient();
  // 1000行ずつ全件読む。id を並び順の最後に足して、ページの境目で行がぶれないようにする
  const { data, error } = await fetchAllRows((from, to) => client
    .from("customer_monthly_items")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .range(from, to));
  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
  return (data as DbRow[]).map(fromDb);
}

export async function addCustomerMonthlyItem(input: {
  customerId: string; name: string; amount: number;
  startedOn?: string | null; endedOn?: string | null;
}): Promise<CustomerMonthlyItem> {
  const { data, error } = await createAdminClient()
    .from("customer_monthly_items")
    .insert({
      customer_id: input.customerId,
      name:        input.name,
      amount:      input.amount,
      started_on:  input.startedOn ?? null,
      ended_on:    input.endedOn ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return fromDb(data as DbRow);
}

export async function updateCustomerMonthlyItem(
  id: string,
  input: Partial<{ name: string; amount: number; startedOn: string | null; endedOn: string | null }>,
): Promise<void> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name      !== undefined) patch.name       = input.name;
  if (input.amount    !== undefined) patch.amount     = input.amount;
  if (input.startedOn !== undefined) patch.started_on = input.startedOn;
  if (input.endedOn   !== undefined) patch.ended_on   = input.endedOn;

  const { error } = await createAdminClient()
    .from("customer_monthly_items").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteCustomerMonthlyItem(id: string): Promise<void> {
  const { error } = await createAdminClient()
    .from("customer_monthly_items").delete().eq("id", id);
  if (error) throw error;
}

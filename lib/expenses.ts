import { createAdminClient } from "./supabase";
import type { Expense } from "./expenses-types";

// 一般経費のDBアクセス。型と集計は expenses-types.ts に置く
// （クライアントコンポーネントから supabase を巻き込まないため）。
export type { Expense } from "./expenses-types";
export { EXPENSE_CATEGORIES, expensesInMonth, expenseTotal } from "./expenses-types";

type DbRow = {
  id:          string;
  incurred_on: string;
  category:    string;
  title:       string;
  amount:      number;
  note:        string | null;
  created_by:  string | null;
  created_at:  string;
  updated_at:  string;
};

function fromDb(row: DbRow): Expense {
  return {
    id:          row.id,
    incurredOn:  row.incurred_on,
    category:    row.category,
    title:       row.title,
    amount:      row.amount,
    note:        row.note ?? undefined,
    createdById: row.created_by ?? undefined,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  };
}

export async function getExpenses(): Promise<Expense[]> {
  const { data, error } = await createAdminClient()
    .from("expenses")
    .select("*")
    .order("incurred_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) {
    // テーブル未作成（マイグレーション未適用）の場合は空で耐える
    if (error.code === "42P01" || /does not exist|could not find the table/i.test(error.message)) return [];
    throw error;
  }
  return (data as DbRow[]).map(fromDb);
}

export async function addExpense(input: {
  incurredOn: string; category: string; title: string; amount: number; note?: string; createdBy?: string;
}): Promise<Expense> {
  const { data, error } = await createAdminClient()
    .from("expenses")
    .insert({
      incurred_on: input.incurredOn,
      category:    input.category,
      title:       input.title,
      amount:      input.amount,
      note:        input.note ?? null,
      created_by:  input.createdBy ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return fromDb(data as DbRow);
}

export async function updateExpense(
  id: string,
  input: Partial<{ incurredOn: string; category: string; title: string; amount: number; note: string | null }>,
): Promise<Expense> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.incurredOn !== undefined) patch.incurred_on = input.incurredOn;
  if (input.category   !== undefined) patch.category    = input.category;
  if (input.title      !== undefined) patch.title       = input.title;
  if (input.amount     !== undefined) patch.amount      = input.amount;
  if (input.note       !== undefined) patch.note        = input.note;

  const { data, error } = await createAdminClient()
    .from("expenses")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return fromDb(data as DbRow);
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await createAdminClient().from("expenses").delete().eq("id", id);
  if (error) throw error;
}


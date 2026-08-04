import { createAdminClient } from "./supabase";

/**
 * 請求書ごとの支払期限の上書き（まとめ先の顧客 × 対象月）。
 * 行が無ければ既定（対象月の翌月10日 = lib/invoices.ts の defaultDueDate）を使う。
 * テーブル未作成でも請求書は必ず表示したいので、読み取りは失敗しても既定に倒す。
 */

type DbRow = { customer_id: string; month: string; due_date: string };

function isMissingTable(error: { code?: string; message?: string }): boolean {
  return error.code === "42P01" || /does not exist|could not find the table/i.test(error.message ?? "");
}

/** 1件ぶんの支払期限（YYYY-MM-DD）。未設定なら null。 */
export async function getInvoiceDueDate(customerId: string, month: string): Promise<string | null> {
  const { data, error } = await createAdminClient()
    .from("invoice_due_dates")
    .select("due_date")
    .eq("customer_id", customerId)
    .eq("month", month)
    .maybeSingle();
  if (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
  return (data as { due_date: string } | null)?.due_date ?? null;
}

/** 対象月ぶんをまとめて取得（一覧用）。customerId → YYYY-MM-DD。 */
export async function getInvoiceDueDatesByMonth(month: string): Promise<Map<string, string>> {
  const { data, error } = await createAdminClient()
    .from("invoice_due_dates")
    .select("customer_id, month, due_date")
    .eq("month", month);
  if (error) {
    if (isMissingTable(error)) return new Map();
    throw error;
  }
  return new Map((data as DbRow[]).map((r) => [r.customer_id, r.due_date]));
}

/** 支払期限を設定する。null を渡すと設定を消して既定（翌月10日）に戻す。 */
export async function setInvoiceDueDate(customerId: string, month: string, dueDate: string | null): Promise<void> {
  const db = createAdminClient();
  if (!dueDate) {
    const { error } = await db.from("invoice_due_dates").delete().eq("customer_id", customerId).eq("month", month);
    if (error) throw error;
    return;
  }
  const { error } = await db
    .from("invoice_due_dates")
    .upsert(
      { customer_id: customerId, month, due_date: dueDate, updated_at: new Date().toISOString() },
      { onConflict: "customer_id,month" },
    );
  if (error) throw error;
}

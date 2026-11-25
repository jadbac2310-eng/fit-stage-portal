import { createAdminClient } from "./supabase";
import { currentMemberId } from "./audit";

/** 請求書の「完了」の印（請求先×対象月）。FCT分は bill_key = "fct" */
export const FCT_BILL_KEY = "fct";

/** 表がまだ無い（SQLを流していない）ときのエラーかどうか */
function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42P01" || error.code === "PGRST205" ||
    (/invoice_done/.test(error.message ?? "") && /not (exist|find)|does not exist|schema cache/i.test(error.message ?? ""));
}

/**
 * その月の完了の印を読む（bill_key → 付けた時刻）。
 * ready=false は表がまだ無いとき。画面は「印を付けられない」と出すだけで、一覧は今までどおり出る。
 */
export async function getInvoiceDone(month: string): Promise<{ done: Record<string, string>; ready: boolean }> {
  try {
    const { data, error } = await createAdminClient()
      .from("invoice_done")
      .select("bill_key, done_at")
      .eq("month", month);
    if (error) return { done: {}, ready: !isMissingTable(error) };
    const done: Record<string, string> = {};
    for (const r of (data ?? []) as { bill_key: string; done_at: string }[]) done[r.bill_key] = r.done_at;
    return { done, ready: true };
  } catch {
    return { done: {}, ready: false };
  }
}

/** 完了の印を付ける／外す */
export async function setInvoiceDone(billKey: string, month: string, done: boolean): Promise<void> {
  const client = createAdminClient();
  if (done) {
    const by = await currentMemberId().catch(() => null);
    const { error } = await client.from("invoice_done")
      .upsert({ bill_key: billKey, month, done_at: new Date().toISOString(), done_by: by ?? null }, { onConflict: "bill_key,month" });
    if (error) throw new Error(isMissingTable(error)
      ? "記録する表がまだありません。SQL（20261125000001_invoice_done.sql）を Supabase で流してください"
      : error.message);
  } else {
    const { error } = await client.from("invoice_done").delete().eq("bill_key", billKey).eq("month", month);
    if (error && !isMissingTable(error)) throw new Error(error.message);
  }
}

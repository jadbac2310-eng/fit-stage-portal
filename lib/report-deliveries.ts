import { createAdminClient } from "./supabase";
import { currentMemberId } from "./audit";
import type { ReportDelivery } from "./report-deliveries-types";
export type { ReportDelivery } from "./report-deliveries-types";

type DbRow = {
  id:          string;
  customer_id: string;
  period:      string;
  sent_at:     string;
  sent_by:     string | null;
  channel:     string | null;
  note:        string | null;
};

function fromDb(row: DbRow): ReportDelivery {
  return {
    id:        row.id,
    customerId: row.customer_id,
    period:    row.period,
    sentAt:    row.sent_at,
    sentById:  row.sent_by ?? undefined,
    channel:   row.channel ?? undefined,
    note:      row.note ?? undefined,
  };
}

// テーブル未作成（マイグレーション未適用）でもアプリが落ちないようにする
function isMissingTable(error: { code?: string; message?: string }): boolean {
  return error.code === "42P01" || /does not exist|could not find the table/i.test(error.message ?? "");
}

/** 送付記録を取得（period 指定時はその月のみ）。 */
export async function getReportDeliveries(period?: string): Promise<ReportDelivery[]> {
  let query = createAdminClient().from("report_deliveries").select("*");
  if (period) query = query.eq("period", period);
  const { data, error } = await query;
  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
  return (data as DbRow[]).map(fromDb);
}

/** 顧客×月のレポートを「送付済み」にする（顧客×月で upsert）。 */
export async function markReportSent(input: {
  customerId: string;
  period: string;
  channel?: string | null;
  note?: string | null;
}): Promise<void> {
  const { error } = await createAdminClient()
    .from("report_deliveries")
    .upsert({
      customer_id: input.customerId,
      period:      input.period,
      sent_at:     new Date().toISOString(),
      sent_by:     (await currentMemberId()) ?? null,
      channel:     input.channel ?? "line",
      note:        input.note ?? null,
      updated_at:  new Date().toISOString(),
    }, { onConflict: "customer_id,period" });
  if (error && !isMissingTable(error)) throw error;
}

/** 送付記録を取り消す（未送付に戻す）。 */
export async function unmarkReportSent(customerId: string, period: string): Promise<void> {
  const { error } = await createAdminClient()
    .from("report_deliveries")
    .delete()
    .eq("customer_id", customerId)
    .eq("period", period);
  if (error && !isMissingTable(error)) throw error;
}

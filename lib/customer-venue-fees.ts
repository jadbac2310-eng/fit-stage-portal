import { createAdminClient } from "./supabase";
import type { VenueKind } from "./lessons-types";
import type { CustomerVenueFee } from "./customer-venue-fees-types";

export type { CustomerVenueFee } from "./customer-venue-fees-types";
export { resolveVenueFee } from "./customer-venue-fees-types";

type DbRow = {
  id:          string;
  customer_id: string;
  venue_kind:  VenueKind;
  venue_id:    string;
  fee:         number;
  created_at:  string;
  updated_at:  string;
};

function fromDb(row: DbRow): CustomerVenueFee {
  return {
    id:         row.id,
    customerId: row.customer_id,
    venueKind:  row.venue_kind,
    venueId:    row.venue_id,
    fee:        row.fee,
    createdAt:  row.created_at,
    updatedAt:  row.updated_at,
  };
}

// テーブル未作成（マイグレーション未適用）でも画面を落とさないための判定
function isMissingTable(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return err.code === "42P01" || err.code === "PGRST205"
    || /customer_venue_fees|does not exist|could not find the table/i.test(err.message ?? "");
}

export async function getCustomerVenueFees(): Promise<CustomerVenueFee[]> {
  const { data, error } = await createAdminClient()
    .from("customer_venue_fees")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
  return (data as DbRow[]).map(fromDb);
}

/** 顧客×会場の料金を設定（同じ組み合わせがあれば上書き） */
export async function setCustomerVenueFee(
  customerId: string, venueKind: VenueKind, venueId: string, fee: number,
): Promise<void> {
  const { error } = await createAdminClient()
    .from("customer_venue_fees")
    .upsert(
      {
        customer_id: customerId, venue_kind: venueKind, venue_id: venueId,
        fee: Math.max(0, Math.round(fee)), updated_at: new Date().toISOString(),
      },
      { onConflict: "customer_id,venue_kind,venue_id" },
    );
  if (error) throw error;
}

/** 設定を削除（マスタの料金に戻す） */
export async function deleteCustomerVenueFee(id: string): Promise<void> {
  const { error } = await createAdminClient().from("customer_venue_fees").delete().eq("id", id);
  if (error) throw error;
}

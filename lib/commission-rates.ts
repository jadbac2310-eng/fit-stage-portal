import { createAdminClient } from "./supabase";

/** 担当者×顧客の組み合わせごとのトレーナー歩合率（％）。設定が無い組み合わせは既定50%。 */
export interface MemberCustomerRate {
  id:         string;
  memberId:   string;
  customerId: string;
  rate:       number; // ％（0〜100）
  createdAt:  string;
  updatedAt:  string;
}

type DbRow = {
  id:          string;
  member_id:   string;
  customer_id: string;
  rate:        number;
  created_at:  string;
  updated_at:  string;
};

function fromDb(row: DbRow): MemberCustomerRate {
  return {
    id:         row.id,
    memberId:   row.member_id,
    customerId: row.customer_id,
    rate:       row.rate,
    createdAt:  row.created_at,
    updatedAt:  row.updated_at,
  };
}

// テーブル未作成（マイグレーション未適用）でもダッシュボード等を落とさないための判定
function isMissingTable(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return err.code === "42P01" || err.code === "PGRST205" || /member_customer_commission_rates/i.test(err.message ?? "");
}

/** 全組み合わせの歩合率を取得。テーブル未作成時は空配列（既定50%扱い）。 */
export async function getMemberCustomerRates(): Promise<MemberCustomerRate[]> {
  const { data, error } = await createAdminClient()
    .from("member_customer_commission_rates")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
  return (data as DbRow[]).map(fromDb);
}

/** 担当者×顧客の歩合率を設定（既存の組み合わせは上書き） */
export async function setMemberCustomerRate(
  memberId: string,
  customerId: string,
  rate: number,
): Promise<void> {
  const value = Math.max(0, Math.min(100, Math.round(rate)));
  const { error } = await createAdminClient()
    .from("member_customer_commission_rates")
    .upsert(
      { member_id: memberId, customer_id: customerId, rate: value, updated_at: new Date().toISOString() },
      { onConflict: "member_id,customer_id" },
    );
  if (error) throw error;
}

/** 担当者×顧客の歩合率設定を削除（既定50%に戻す） */
export async function deleteMemberCustomerRate(memberId: string, customerId: string): Promise<void> {
  const { error } = await createAdminClient()
    .from("member_customer_commission_rates")
    .delete()
    .eq("member_id", memberId)
    .eq("customer_id", customerId);
  if (error) throw error;
}

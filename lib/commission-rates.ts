import { cache } from "react";
import { createAdminClient } from "./supabase";

/**
 * 担当者×顧客の組み合わせごとの支払い条件。設定が無い組み合わせは既定50%。
 *
 * fixedAmount が入っているときは「1レッスンにつき○円」の固定払い。
 * こちらの請求額と切り離して払う契約（京阪総合サービスなど）で使う。
 */
export interface MemberCustomerRate {
  id:          string;
  memberId:    string;
  customerId:  string;
  rate:        number;  // ％（0〜100）。fixedAmount があるときは使わない
  fixedAmount?: number; // 1レッスンあたりの固定額（円）
  createdAt:   string;
  updatedAt:   string;
}

type DbRow = {
  id:           string;
  member_id:    string;
  customer_id:  string;
  rate:         number;
  fixed_amount?: number | null;
  created_at:   string;
  updated_at:   string;
};

function fromDb(row: DbRow): MemberCustomerRate {
  return {
    id:          row.id,
    memberId:    row.member_id,
    customerId:  row.customer_id,
    rate:        row.rate,
    fixedAmount: row.fixed_amount ?? undefined,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  };
}

// テーブル未作成（マイグレーション未適用）でもダッシュボード等を落とさないための判定
function isMissingTable(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return err.code === "42P01" || err.code === "PGRST205" || /member_customer_commission_rates/i.test(err.message ?? "");
}

/** 全組み合わせの歩合率を取得。テーブル未作成時は空配列（既定50%扱い）。 */
async function getMemberCustomerRatesUncached(): Promise<MemberCustomerRate[]> {
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

/**
 * 担当者×顧客の支払い条件を設定（既存の組み合わせは上書き）。
 * fixedAmount を渡すと「1レッスンにつき○円」の固定払いになり、歩合率は使われない。
 */
export async function setMemberCustomerRate(
  memberId: string,
  customerId: string,
  rate: number,
  fixedAmount?: number | null,
): Promise<void> {
  const value = Math.max(0, Math.min(100, Math.round(rate)));
  const fixed = fixedAmount == null ? null : Math.max(0, Math.round(fixedAmount));
  const row = { member_id: memberId, customer_id: customerId, rate: value, updated_at: new Date().toISOString() };
  const client = createAdminClient();
  let { error } = await client
    .from("member_customer_commission_rates")
    .upsert({ ...row, fixed_amount: fixed }, { onConflict: "member_id,customer_id" });
  // fixed_amount 列（マイグレーション 20261012000001）が未適用の環境では、列を落として従来どおり保存する
  if (error && isMissingFixedAmount(error)) {
    ({ error } = await client
      .from("member_customer_commission_rates")
      .upsert(row, { onConflict: "member_id,customer_id" }));
  }
  if (error) throw error;
}

function isMissingFixedAmount(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return err.code === "42703" || err.code === "PGRST204" || /fixed_amount/i.test(err.message ?? "");
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

/**
 * 同じリクエストの中では1回だけ読む（React の cache）。
 *
 * 1ページ表示するのに、レイアウト・ページ・サーバーアクションが
 * それぞれ同じ表を取りに行っていた。中身は同じなので、最初の1回を使い回す。
 * 次のリクエストでは必ず読み直すので、画面が古くなることはない。
 */
export const getMemberCustomerRates = cache(getMemberCustomerRatesUncached);

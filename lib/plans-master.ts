import { cache } from "react";
import { createAdminClient } from "./supabase";
export type { PlanMaster, PlanPaymentType, SessionPassPrice } from "./plans-master-types";
export {
  planUnitPrice, buildLessonFeeMap, buildSessionPassPriceMap, PLAN_PAYMENT_TYPE_LABEL,
} from "./plans-master-types";
import type { PlanMaster, SessionPassPrice } from "./plans-master-types";

type DbRow = {
  id: string;
  name: string;
  payment_type: PlanMaster["paymentType"];
  sessions: number;
  amount: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function fromDb(row: DbRow): PlanMaster {
  return {
    id:          row.id,
    name:        row.name,
    paymentType: row.payment_type,
    sessions:    row.sessions,
    amount:      row.amount,
    sortOrder:   row.sort_order,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  };
}

async function getAllPlansUncached(): Promise<PlanMaster[]> {
  const { data, error } = await createAdminClient()
    .from("plans")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data as DbRow[]).map(fromDb);
}

/** 標準金額の更新（コース構成は固定のため amount のみ変更可能） */
export async function updatePlanAmount(id: string, amount: number): Promise<PlanMaster> {
  const { data, error } = await createAdminClient()
    .from("plans")
    .update({ amount, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return fromDb(data as DbRow);
}

// ─── 回数券の標準金額（人数 × 回数） ──────────────────────
type SppDbRow = {
  id: string;
  person_count: number;
  total_count: number;
  amount: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function sppFromDb(row: SppDbRow): SessionPassPrice {
  return {
    id:          row.id,
    personCount: row.person_count,
    totalCount:  row.total_count,
    amount:      row.amount,
    sortOrder:   row.sort_order,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  };
}

async function getAllSessionPassPricesUncached(): Promise<SessionPassPrice[]> {
  const { data, error } = await createAdminClient()
    .from("session_pass_prices")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data as SppDbRow[]).map(sppFromDb);
}

export async function updateSessionPassPriceAmount(id: string, amount: number): Promise<SessionPassPrice> {
  const { data, error } = await createAdminClient()
    .from("session_pass_prices")
    .update({ amount, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return sppFromDb(data as SppDbRow);
}

/**
 * 同じリクエストの中では1回だけ読む（React の cache）。
 *
 * 1ページ表示するのに、レイアウト・ページ・サーバーアクションが
 * それぞれ同じ表を取りに行っていた。中身は同じなので、最初の1回を使い回す。
 * 次のリクエストでは必ず読み直すので、画面が古くなることはない。
 */
export const getAllPlans = cache(getAllPlansUncached);

/**
 * 同じリクエストの中では1回だけ読む（React の cache）。
 *
 * 1ページ表示するのに、レイアウト・ページ・サーバーアクションが
 * それぞれ同じ表を取りに行っていた。中身は同じなので、最初の1回を使い回す。
 * 次のリクエストでは必ず読み直すので、画面が古くなることはない。
 */
export const getAllSessionPassPrices = cache(getAllSessionPassPricesUncached);

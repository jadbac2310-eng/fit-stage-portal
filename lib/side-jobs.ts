import { cache } from "react";
import { createAdminClient, fetchAllRows } from "./supabase";
import type { SideJob } from "./side-jobs-types";

// 単発の仕事のDBアクセス。型と集計は side-jobs-types.ts に置く
// （クライアントコンポーネントから supabase を巻き込まないため）。
export type { SideJob } from "./side-jobs-types";
export { sideJobsInMonth, sideJobTotals } from "./side-jobs-types";

type DbRow = {
  id:         string;
  done_on:    string;
  title:      string;
  client:     string | null;
  amount:     number;
  cost:       number;
  vendor:     string | null;
  note:       string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

function fromDb(row: DbRow): SideJob {
  return {
    id:          row.id,
    doneOn:      row.done_on,
    title:       row.title,
    client:      row.client ?? undefined,
    amount:      row.amount,
    cost:        row.cost,
    vendor:      row.vendor ?? undefined,
    note:        row.note ?? undefined,
    createdById: row.created_by ?? undefined,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  };
}

async function getSideJobsUncached(): Promise<SideJob[]> {
  const client = createAdminClient();
  const { data, error } = await fetchAllRows((from, to) => client
    .from("side_jobs")
    .select("*")
    .order("done_on", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(from, to));
  if (error) {
    // テーブル未作成（SQL 未適用）の場合は空で耐える。売上の画面ごと落とさないため
    if (error.code === "42P01" || /does not exist|could not find the table/i.test(error.message)) return [];
    throw error;
  }
  return (data as DbRow[]).map(fromDb);
}

export interface SideJobInput {
  doneOn: string; title: string; client?: string; amount: number; cost: number; vendor?: string; note?: string;
}

export async function addSideJob(input: SideJobInput & { createdBy?: string }): Promise<SideJob> {
  const { data, error } = await createAdminClient()
    .from("side_jobs")
    .insert({
      done_on: input.doneOn, title: input.title, client: input.client ?? null,
      amount: input.amount, cost: input.cost, vendor: input.vendor ?? null, note: input.note ?? null,
      created_by: input.createdBy ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return fromDb(data as DbRow);
}

export async function updateSideJob(id: string, input: SideJobInput): Promise<SideJob> {
  const { data, error } = await createAdminClient()
    .from("side_jobs")
    .update({
      done_on: input.doneOn, title: input.title, client: input.client ?? null,
      amount: input.amount, cost: input.cost, vendor: input.vendor ?? null, note: input.note ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return fromDb(data as DbRow);
}

export async function deleteSideJob(id: string): Promise<void> {
  const { error } = await createAdminClient().from("side_jobs").delete().eq("id", id);
  if (error) throw error;
}

/** 同じリクエストの中では1回だけ読む */
export const getSideJobs = cache(getSideJobsUncached);

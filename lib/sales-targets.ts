import { createAdminClient, fetchAllRows } from "./supabase";
import type { SalesTarget, SalesTargetLog } from "./sales-targets-types";

// 営業先リストのDBアクセス。型と定数は sales-targets-types.ts に置く
// （クライアントコンポーネントから supabase を巻き込まないため）。
export type { SalesTarget, SalesTargetLog } from "./sales-targets-types";

type DbRow = {
  id:             string;
  kind:           string;
  priority:       string;
  sort_order:     number;
  name:           string;
  area:           string | null;
  contact_point:  string | null;
  pitch:          string | null;
  has_pt:         string | null;
  single_session: string | null;
  english:        string | null;
  research_note:  string | null;
  research_url:   string | null;
  assignee_id:    string | null;
  status:         string;
  next_action:    string | null;
  next_action_on: string | null;
  contact_person: string | null;
  contact_info:   string | null;
  memo:           string | null;
  updated_at:     string;
};

type LogRow = {
  id:         string;
  target_id:  string;
  body:       string;
  created_by: string | null;
  created_at: string;
};

function fromDb(r: DbRow): SalesTarget {
  return {
    id:            r.id,
    kind:          r.kind,
    priority:      r.priority,
    sortOrder:     r.sort_order,
    name:          r.name,
    area:          r.area ?? undefined,
    contactPoint:  r.contact_point ?? undefined,
    pitch:         r.pitch ?? undefined,
    hasPt:         r.has_pt ?? undefined,
    singleSession: r.single_session ?? undefined,
    english:       r.english ?? undefined,
    researchNote:  r.research_note ?? undefined,
    researchUrl:   r.research_url ?? undefined,
    assigneeId:    r.assignee_id ?? undefined,
    status:        r.status,
    nextAction:    r.next_action ?? undefined,
    nextActionOn:  r.next_action_on ?? undefined,
    contactPerson: r.contact_person ?? undefined,
    contactInfo:   r.contact_info ?? undefined,
    memo:          r.memo ?? undefined,
    updatedAt:     r.updated_at,
  };
}

function logFromDb(r: LogRow): SalesTargetLog {
  return {
    id:          r.id,
    targetId:    r.target_id,
    body:        r.body,
    createdById: r.created_by ?? undefined,
    createdAt:   r.created_at,
  };
}

/** テーブル未作成（マイグレーション未適用）のときは空で耐える */
function isMissingTable(error: { code?: string; message?: string }): boolean {
  return error.code === "42P01" || /does not exist|could not find the table/i.test(error.message ?? "");
}

export async function getSalesTargets(): Promise<SalesTarget[]> {
  const client = createAdminClient();
  const { data, error } = await fetchAllRows((from, to) => client
    .from("sales_targets")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true })
    .range(from, to));
  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
  return (data as DbRow[]).map(fromDb);
}

export async function getSalesTargetLogs(): Promise<SalesTargetLog[]> {
  const client = createAdminClient();
  const { data, error } = await fetchAllRows((from, to) => client
    .from("sales_target_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(from, to));
  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
  return (data as LogRow[]).map(logFromDb);
}

/** 営業の進み具合（担当・状況・次にやること・先方情報・メモ）を更新する */
export async function updateSalesProgress(id: string, input: {
  assigneeId:    string | null;
  status:        string;
  nextAction:    string | null;
  nextActionOn:  string | null;
  contactPerson: string | null;
  contactInfo:   string | null;
  memo:          string | null;
}): Promise<void> {
  const { error } = await createAdminClient()
    .from("sales_targets")
    .update({
      assignee_id:    input.assigneeId,
      status:         input.status,
      next_action:    input.nextAction,
      next_action_on: input.nextActionOn,
      contact_person: input.contactPerson,
      contact_info:   input.contactInfo,
      memo:           input.memo,
      updated_at:     new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

/** 状況だけを変える（一覧からワンタップで変えるとき用） */
export async function updateSalesStatus(id: string, status: string): Promise<void> {
  const { error } = await createAdminClient()
    .from("sales_targets")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function addSalesTarget(input: {
  priority: string; name: string; area?: string; contactPoint?: string; pitch?: string; createdBy?: string;
}): Promise<SalesTarget> {
  const client = createAdminClient();
  // 同じ優先度の末尾に入れる
  const { data: last } = await client
    .from("sales_targets")
    .select("sort_order")
    .eq("priority", input.priority)
    .order("sort_order", { ascending: false })
    .limit(1);
  const base = (last?.[0] as { sort_order: number } | undefined)?.sort_order ?? 500;

  const { data, error } = await client
    .from("sales_targets")
    .insert({
      priority:      input.priority,
      sort_order:    base + 5,
      name:          input.name,
      area:          input.area ?? null,
      contact_point: input.contactPoint ?? null,
      pitch:         input.pitch ?? null,
      created_by:    input.createdBy ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return fromDb(data as DbRow);
}

export async function deleteSalesTarget(id: string): Promise<void> {
  const { error } = await createAdminClient().from("sales_targets").delete().eq("id", id);
  if (error) throw error;
}

export async function addSalesTargetLog(targetId: string, body: string, createdBy?: string): Promise<void> {
  const { error } = await createAdminClient()
    .from("sales_target_logs")
    .insert({ target_id: targetId, body, created_by: createdBy ?? null });
  if (error) throw error;
}

export async function deleteSalesTargetLog(id: string): Promise<void> {
  const { error } = await createAdminClient().from("sales_target_logs").delete().eq("id", id);
  if (error) throw error;
}

/** 記録を書いたメンバーのid（削除してよいかの判定用） */
export async function getSalesTargetLogAuthor(id: string): Promise<string | undefined> {
  const { data } = await createAdminClient().from("sales_target_logs").select("created_by").eq("id", id).maybeSingle();
  return (data as { created_by: string | null } | null)?.created_by ?? undefined;
}

export async function getSalesTargetName(id: string): Promise<string | undefined> {
  const { data } = await createAdminClient().from("sales_targets").select("name").eq("id", id).maybeSingle();
  return (data as { name: string } | null)?.name;
}

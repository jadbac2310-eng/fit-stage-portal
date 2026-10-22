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
  hotel_info?:    string | null;
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
  id:           string;
  target_id:    string;
  kind?:        string | null;
  occurred_at?: string | null;
  person?:      string | null;
  body:         string;
  event_id?:    string | null;
  created_by:   string | null;
  created_at:   string;
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
    hotelInfo:     r.hotel_info ?? undefined,
    url:           r.research_url ?? undefined,
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
    kind:        r.kind ?? "メモ",
    occurredAt:  r.occurred_at ?? undefined,
    person:      r.person ?? undefined,
    body:        r.body,
    eventId:     r.event_id ?? undefined,
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

export async function getSalesTarget(id: string): Promise<SalesTarget | null> {
  const { data, error } = await createAdminClient().from("sales_targets").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return fromDb(data as DbRow);
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

export async function getSalesTargetLog(id: string): Promise<SalesTargetLog | null> {
  const { data, error } = await createAdminClient().from("sales_target_logs").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return logFromDb(data as LogRow);
}

/** 営業の進み具合（担当・状況・次にやること・先方情報・引き継ぎメモ）を更新する */
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

/** ホテルの基本情報（名前・エリア・優先度・窓口・提案のポイント・ホテル情報・公式サイト）を更新する */
export async function updateSalesInfo(id: string, input: {
  name: string; priority: string; area: string | null; contactPoint: string | null;
  pitch: string | null; hotelInfo: string | null; url: string | null;
}): Promise<void> {
  const { error } = await createAdminClient()
    .from("sales_targets")
    .update({
      name:          input.name,
      priority:      input.priority,
      area:          input.area,
      contact_point: input.contactPoint,
      pitch:         input.pitch,
      hotel_info:    input.hotelInfo,
      research_url:  input.url,
      updated_at:    new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

/** 状況・次にやることなど一部だけ変える */
export async function patchSalesTarget(id: string, patch: {
  status?: string; nextAction?: string | null; nextActionOn?: string | null; contactPerson?: string | null;
}): Promise<void> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.status        !== undefined) row.status         = patch.status;
  if (patch.nextAction    !== undefined) row.next_action    = patch.nextAction;
  if (patch.nextActionOn  !== undefined) row.next_action_on = patch.nextActionOn;
  if (patch.contactPerson !== undefined) row.contact_person = patch.contactPerson;
  const { error } = await createAdminClient().from("sales_targets").update(row).eq("id", id);
  if (error) throw error;
}

export async function addSalesTarget(input: {
  priority: string; name: string; area?: string; contactPoint?: string; pitch?: string;
  hotelInfo?: string; url?: string; createdBy?: string;
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
      hotel_info:    input.hotelInfo ?? null,
      research_url:  input.url ?? null,
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

export async function addSalesTargetLog(input: {
  targetId: string; kind: string; occurredAt: string | null; person: string | null;
  body: string; eventId: string | null; createdBy?: string;
}): Promise<void> {
  const { error } = await createAdminClient()
    .from("sales_target_logs")
    .insert({
      target_id:   input.targetId,
      kind:        input.kind,
      occurred_at: input.occurredAt,
      person:      input.person,
      body:        input.body,
      event_id:    input.eventId,
      created_by:  input.createdBy ?? null,
    });
  if (error) throw error;
}

export async function deleteSalesTargetLog(id: string): Promise<void> {
  const { error } = await createAdminClient().from("sales_target_logs").delete().eq("id", id);
  if (error) throw error;
}

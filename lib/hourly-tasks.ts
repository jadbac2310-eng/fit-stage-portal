import { createAdminClient } from "./supabase";
import type { HourlyTask, HourlyTaskStatus } from "./hourly-tasks-types";
export type { HourlyTask, HourlyTaskStatus } from "./hourly-tasks-types";
export { HOURLY_TASK_STATUS_LABEL, hourlyTaskHours, hourlyTaskAmount } from "./hourly-tasks-types";
import { currentMemberId, isMissingAuthorColumn } from "./audit";

type DbRow = {
  id:           string;
  member_id:    string;
  title:        string;
  scheduled_at: string;
  end_at:       string;
  hourly_rate:  number;
  location:     string | null;
  note:         string | null;
  status:       HourlyTaskStatus;
  created_by:   string | null;
  updated_by:   string | null;
  created_at:   string;
  updated_at:   string;
  member:       { name: string } | null;
};

function fromDb(row: DbRow): HourlyTask {
  return {
    id:           row.id,
    memberId:     row.member_id,
    memberName:   row.member?.name ?? "",
    title:        row.title,
    scheduledAt:  row.scheduled_at,
    endAt:        row.end_at,
    hourlyRate:   row.hourly_rate,
    location:     row.location ?? undefined,
    note:         row.note ?? undefined,
    status:       row.status,
    createdById:  row.created_by ?? undefined,
    updatedById:  row.updated_by ?? undefined,
    createdAt:    row.created_at,
    updatedAt:    row.updated_at,
  };
}

const SELECT = "*, member:members!member_id(name)";

export async function getHourlyTasks(): Promise<HourlyTask[]> {
  const { data, error } = await createAdminClient()
    .from("hourly_tasks")
    .select(SELECT)
    .order("scheduled_at", { ascending: false });
  if (error) {
    // テーブル未作成（マイグレーション未適用）の場合は空配列で耐える
    if (error.code === "42P01" || /does not exist|could not find the table/i.test(error.message)) return [];
    throw error;
  }
  return (data as DbRow[]).map(fromDb);
}

export async function getHourlyTask(id: string): Promise<HourlyTask | null> {
  const { data, error } = await createAdminClient()
    .from("hourly_tasks")
    .select(SELECT)
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return fromDb(data as DbRow);
}

export async function addHourlyTask(input: {
  memberId: string;
  title: string;
  scheduledAt: string;
  endAt: string;
  hourlyRate: number;
  location?: string;
  note?: string;
  status?: HourlyTaskStatus;
  createdBy?: string;
}): Promise<HourlyTask> {
  const client = createAdminClient();
  const base = {
    member_id:    input.memberId,
    title:        input.title,
    scheduled_at: input.scheduledAt,
    end_at:       input.endAt,
    hourly_rate:  input.hourlyRate,
    location:     input.location ?? null,
    note:         input.note ?? null,
    status:       input.status ?? "scheduled",
  };
  const creator = input.createdBy ?? (await currentMemberId()) ?? null;
  let { data, error } = await client.from("hourly_tasks").insert({ ...base, created_by: creator, updated_by: creator }).select(SELECT).single();
  if (error && isMissingAuthorColumn(error)) {
    ({ data, error } = await client.from("hourly_tasks").insert(base).select(SELECT).single());
  }
  if (error) throw error;
  return fromDb(data as DbRow);
}

export async function updateHourlyTask(
  id: string,
  input: Partial<{
    memberId: string;
    title: string;
    scheduledAt: string;
    endAt: string;
    hourlyRate: number;
    location: string | null;
    note: string | null;
    status: HourlyTaskStatus;
  }>
): Promise<HourlyTask | null> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.memberId    !== undefined) patch.member_id    = input.memberId;
  if (input.title       !== undefined) patch.title        = input.title;
  if (input.scheduledAt !== undefined) patch.scheduled_at = input.scheduledAt;
  if (input.endAt       !== undefined) patch.end_at       = input.endAt;
  if (input.hourlyRate  !== undefined) patch.hourly_rate  = input.hourlyRate;
  if (input.location    !== undefined) patch.location     = input.location;
  if (input.note        !== undefined) patch.note         = input.note;
  if (input.status      !== undefined) patch.status       = input.status;
  patch.updated_by = (await currentMemberId()) ?? null;

  const client = createAdminClient();
  let { data, error } = await client.from("hourly_tasks").update(patch).eq("id", id).select(SELECT).single();
  if (error && isMissingAuthorColumn(error)) {
    const { updated_by, ...rest } = patch;
    void updated_by;
    ({ data, error } = await client.from("hourly_tasks").update(rest).eq("id", id).select(SELECT).single());
  }
  if (error) throw error;
  return fromDb(data as DbRow);
}

export async function deleteHourlyTask(id: string): Promise<void> {
  const { error } = await createAdminClient().from("hourly_tasks").delete().eq("id", id);
  if (error) throw error;
}

import { createAdminClient, fetchAllRows } from "./supabase";
import type { Task } from "./tasks-types";

// やること（会社のタスク）のDBアクセス。型と定数は tasks-types.ts に置く
// （クライアントコンポーネントから supabase を巻き込まないため）。
export type { Task } from "./tasks-types";

type DbRow = {
  id:           string;
  title:        string;
  category:     string;
  assignee_id:  string | null;
  due_on:       string | null;
  status:       string;
  memo:         string | null;
  sort_order:   number;
  event_id:     string | null;
  completed_at: string | null;
  created_by:   string | null;
  created_at:   string;
  updated_at:   string;
};

function fromDb(r: DbRow): Task {
  return {
    id:          r.id,
    title:       r.title,
    category:    r.category,
    assigneeId:  r.assignee_id ?? undefined,
    dueOn:       r.due_on ?? undefined,
    status:      r.status,
    memo:        r.memo ?? undefined,
    sortOrder:   r.sort_order,
    eventId:     r.event_id ?? undefined,
    completedAt: r.completed_at ?? undefined,
    createdById: r.created_by ?? undefined,
    createdAt:   r.created_at,
    updatedAt:   r.updated_at,
  };
}

/** テーブル未作成（SQL未反映）のときは空で耐える */
function isMissingTable(error: { code?: string; message?: string }): boolean {
  return error.code === "42P01" || /does not exist|could not find the table/i.test(error.message ?? "");
}

export async function getTasks(): Promise<Task[]> {
  const client = createAdminClient();
  const { data, error } = await fetchAllRows((from, to) => client
    .from("tasks")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .range(from, to));
  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
  return (data as DbRow[]).map(fromDb);
}

export async function getTask(id: string): Promise<Task | null> {
  const { data, error } = await createAdminClient().from("tasks").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return fromDb(data as DbRow);
}

export type TaskPatch = Partial<{
  title:       string;
  category:    string;
  assigneeId:  string | null;
  dueOn:       string | null;
  status:      string;
  memo:        string | null;
  eventId:     string | null;
  completedAt: string | null;
}>;

export async function patchTask(id: string, patch: TaskPatch): Promise<void> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title       !== undefined) row.title        = patch.title;
  if (patch.category    !== undefined) row.category     = patch.category;
  if (patch.assigneeId  !== undefined) row.assignee_id  = patch.assigneeId;
  if (patch.dueOn       !== undefined) row.due_on       = patch.dueOn;
  if (patch.status      !== undefined) row.status       = patch.status;
  if (patch.memo        !== undefined) row.memo         = patch.memo;
  if (patch.eventId     !== undefined) row.event_id     = patch.eventId;
  if (patch.completedAt !== undefined) row.completed_at = patch.completedAt;
  const { error } = await createAdminClient().from("tasks").update(row).eq("id", id);
  if (error) throw error;
}

export async function addTask(input: {
  title: string; category: string; assigneeId: string | null; dueOn: string | null;
  memo: string | null; createdBy?: string;
}): Promise<Task> {
  const client = createAdminClient();
  // 同じジャンルの末尾に入れる
  const { data: last } = await client
    .from("tasks")
    .select("sort_order")
    .eq("category", input.category)
    .order("sort_order", { ascending: false })
    .limit(1);
  const base = (last?.[0] as { sort_order: number } | undefined)?.sort_order ?? 100;

  const { data, error } = await client
    .from("tasks")
    .insert({
      title:       input.title,
      category:    input.category,
      assignee_id: input.assigneeId,
      due_on:      input.dueOn,
      memo:        input.memo,
      sort_order:  base + 5,
      created_by:  input.createdBy ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return fromDb(data as DbRow);
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await createAdminClient().from("tasks").delete().eq("id", id);
  if (error) throw error;
}

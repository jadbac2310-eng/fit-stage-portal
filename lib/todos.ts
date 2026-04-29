import { createAdminClient } from "./supabase";

export type Priority = "high" | "medium" | "low";

export interface TodoMember {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: Priority;
  createdAt: string;
  completedAt?: string;
  createdBy?: TodoMember;
  assignedTo?: TodoMember;
  completedBy?: TodoMember;
}

type DbRow = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  completed: boolean;
  created_at: string;
  completed_at: string | null;
  created_by: string | null;
  assigned_to: string | null;
  completed_by: string | null;
};

type MemberRow = { id: string; name: string; avatar_url: string | null };

function fromDb(row: DbRow, memberMap: Map<string, MemberRow>): Todo {
  const resolve = (id: string | null): TodoMember | undefined => {
    if (!id) return undefined;
    const m = memberMap.get(id);
    if (!m) return undefined;
    return { id: m.id, name: m.name, avatarUrl: m.avatar_url ?? undefined };
  };
  return {
    id:          row.id,
    title:       row.title,
    description: row.description ?? undefined,
    completed:   row.completed,
    priority:    row.priority as Priority,
    createdAt:   row.created_at,
    completedAt: row.completed_at ?? undefined,
    createdBy:   resolve(row.created_by),
    assignedTo:  resolve(row.assigned_to),
    completedBy: resolve(row.completed_by),
  };
}

async function fetchMemberMap(): Promise<Map<string, MemberRow>> {
  const { data } = await createAdminClient()
    .from("members")
    .select("id, name, avatar_url");
  return new Map((data ?? []).map((m: MemberRow) => [m.id, m]));
}

export async function getTodos(): Promise<Todo[]> {
  const supabase = createAdminClient();
  const [{ data: rows, error }, memberMap] = await Promise.all([
    supabase.from("todos").select("*").order("created_at", { ascending: false }),
    fetchMemberMap(),
  ]);
  if (error) throw error;
  return (rows as DbRow[]).map((row) => fromDb(row, memberMap));
}

export async function addTodo(data: {
  title: string;
  description?: string;
  priority: Priority;
  createdById?: string;
  assignedToId?: string;
}): Promise<Todo> {
  const supabase = createAdminClient();
  const [{ data: row, error }, memberMap] = await Promise.all([
    supabase
      .from("todos")
      .insert({
        title:       data.title,
        description: data.description ?? null,
        priority:    data.priority,
        created_by:  data.createdById  ?? null,
        assigned_to: data.assignedToId ?? null,
      })
      .select()
      .single(),
    fetchMemberMap(),
  ]);
  if (error) throw error;
  return fromDb(row as DbRow, memberMap);
}

export async function toggleTodo(id: string, completedById?: string): Promise<Todo | null> {
  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("todos")
    .select("completed")
    .eq("id", id)
    .single();
  if (!existing) return null;
  const nowCompleted = !existing.completed;
  const [{ data: row, error }, memberMap] = await Promise.all([
    supabase
      .from("todos")
      .update({
        completed:    nowCompleted,
        completed_at: nowCompleted ? new Date().toISOString() : null,
        completed_by: nowCompleted ? (completedById ?? null) : null,
      })
      .eq("id", id)
      .select()
      .single(),
    fetchMemberMap(),
  ]);
  if (error) throw error;
  return fromDb(row as DbRow, memberMap);
}

export async function deleteTodo(id: string): Promise<void> {
  const { error } = await createAdminClient().from("todos").delete().eq("id", id);
  if (error) throw error;
}

export async function updateTodo(
  id: string,
  data: Partial<{ title: string; description: string; priority: Priority; assignedToId: string | null }>
): Promise<Todo | null> {
  const patch: Record<string, unknown> = {};
  if (data.title       !== undefined) patch.title       = data.title;
  if ("description"    in data)       patch.description = data.description || null;
  if (data.priority    !== undefined) patch.priority    = data.priority;
  if ("assignedToId"   in data)       patch.assigned_to = data.assignedToId ?? null;
  const [{ data: row, error }, memberMap] = await Promise.all([
    createAdminClient().from("todos").update(patch).eq("id", id).select().single(),
    fetchMemberMap(),
  ]);
  if (error) throw error;
  return fromDb(row as DbRow, memberMap);
}

import { createAdminClient } from "./supabase";
import { normalizeColor, type EventColor, type PersonalEvent } from "./personal-events-types";
export type { PersonalEvent, EventColor } from "./personal-events-types";
export { EVENT_COLORS, normalizeColor } from "./personal-events-types";
import { currentMemberId, isMissingAuthorColumn } from "./audit";

type DbRow = {
  id:         string;
  member_id:  string;
  title:      string;
  all_day:    boolean;
  start_at:   string;
  end_at:     string | null;
  location:   string | null;
  memo:       string | null;
  color:      string | null;
  participant_ids: string[] | null;
  notify:     boolean | null;
  is_private: boolean | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  member: { name: string } | null;
};

function fromDb(row: DbRow): PersonalEvent {
  return {
    id:         row.id,
    memberId:   row.member_id,
    memberName: row.member?.name ?? "",
    title:      row.title,
    allDay:     row.all_day,
    startAt:    row.start_at,
    endAt:      row.end_at ?? undefined,
    location:   row.location ?? undefined,
    memo:       row.memo ?? undefined,
    color:      normalizeColor(row.color),
    participantIds: row.participant_ids ?? [],
    notify:     row.notify ?? true,
    isPrivate:  row.is_private ?? false,
    updatedById: row.updated_by ?? undefined,
    createdAt:  row.created_at,
    updatedAt:  row.updated_at,
  };
}

const SELECT = "*, member:members!member_id(name)";

// participant_ids / notify 列が未追加（マイグレーション未適用）の環境でも動くようにする。
// メッセージに列名が明示されている場合のみ真とする（コードだけでの判定は無関係な一時エラーも拾ってしまうため避ける）。
function isMissingOptionalColumn(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return /participant_ids|notify|is_private/i.test(err.message ?? "");
}

export async function getPersonalEvents(): Promise<PersonalEvent[]> {
  const { data, error } = await createAdminClient()
    .from("personal_events")
    .select(SELECT)
    .order("start_at", { ascending: false });
  if (error) {
    // テーブル未作成（マイグレーション未適用）の場合は空配列で耐える
    if (error.code === "42P01" || /does not exist|could not find the table/i.test(error.message)) return [];
    throw error;
  }
  return (data as DbRow[]).map(fromDb);
}

export async function getPersonalEvent(id: string): Promise<PersonalEvent | null> {
  const { data, error } = await createAdminClient()
    .from("personal_events")
    .select(SELECT)
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return fromDb(data as DbRow);
}

export async function addPersonalEvent(input: {
  memberId:  string;
  title:     string;
  allDay:    boolean;
  startAt:   string;
  endAt?:    string | null;
  location?: string | null;
  memo?:     string | null;
  color:     EventColor;
  participantIds?: string[];
  notify?:   boolean;
  isPrivate?: boolean;
}): Promise<PersonalEvent> {
  const client = createAdminClient();
  const base = {
    member_id: input.memberId,
    title:     input.title,
    all_day:   input.allDay,
    start_at:  input.startAt,
    end_at:    input.endAt ?? null,
    location:  input.location ?? null,
    memo:      input.memo ?? null,
    color:     input.color,
  };
  let { data, error } = await client
    .from("personal_events")
    .insert({ ...base, participant_ids: input.participantIds ?? [], notify: input.notify ?? true, is_private: input.isPrivate ?? false })
    .select(SELECT)
    .single();
  if (error && isMissingOptionalColumn(error)) {
    ({ data, error } = await client.from("personal_events").insert(base).select(SELECT).single());
  }
  if (error) throw error;
  return fromDb(data as DbRow);
}

export async function updatePersonalEvent(
  id: string,
  input: Partial<{
    title:    string;
    allDay:   boolean;
    startAt:  string;
    endAt:    string | null;
    location: string | null;
    memo:     string | null;
    color:    EventColor;
    participantIds: string[];
    notify:   boolean;
    isPrivate: boolean;
  }>
): Promise<PersonalEvent | null> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.title    !== undefined) patch.title    = input.title;
  if (input.allDay   !== undefined) patch.all_day  = input.allDay;
  if (input.startAt  !== undefined) patch.start_at = input.startAt;
  if (input.endAt    !== undefined) patch.end_at   = input.endAt;
  if (input.location !== undefined) patch.location = input.location;
  if (input.memo     !== undefined) patch.memo     = input.memo;
  if (input.color    !== undefined) patch.color    = input.color;
  if (input.participantIds !== undefined) patch.participant_ids = input.participantIds;
  if (input.notify   !== undefined) patch.notify   = input.notify;
  if (input.isPrivate !== undefined) patch.is_private = input.isPrivate;
  patch.updated_by = (await currentMemberId()) ?? null;

  const client = createAdminClient();
  let { data, error } = await client.from("personal_events").update(patch).eq("id", id).select(SELECT).single();
  // updated_by / participant_ids / notify 列が未追加なら、その列を外して再試行する
  if (error && (isMissingAuthorColumn(error) || isMissingOptionalColumn(error))) {
    const { updated_by, participant_ids, notify, is_private, ...rest } = patch;
    void updated_by; void participant_ids; void notify; void is_private;
    ({ data, error } = await client.from("personal_events").update(rest).eq("id", id).select(SELECT).single());
  }
  if (error) throw error;
  return fromDb(data as DbRow);
}

export async function deletePersonalEvent(id: string): Promise<void> {
  const { error } = await createAdminClient()
    .from("personal_events")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

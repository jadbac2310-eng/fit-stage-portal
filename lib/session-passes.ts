import { createAdminClient } from "./supabase";
export type { SessionPass } from "./session-passes-types";
import type { SessionPass } from "./session-passes-types";
import { passUsageOrdinals } from "./session-passes-types";
import { currentMemberId, isMissingAuthorColumn } from "./audit";
import { ActionError } from "./action-result";

type DbRow = {
  id: string;
  customer_id: string;
  total_count: number;
  remaining_count: number;
  person_count: number;
  price: number | null;
  purchased_at: string;
  expired_at: string | null;
  note: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

function fromDb(row: DbRow): SessionPass {
  return {
    id:             row.id,
    customerId:     row.customer_id,
    totalCount:     row.total_count,
    remainingCount: row.remaining_count,
    personCount:    row.person_count,
    price:          row.price ?? undefined,
    purchasedAt:    row.purchased_at,
    expiredAt:      row.expired_at ?? undefined,
    note:           row.note ?? undefined,
    createdById:    row.created_by ?? undefined,
    updatedById:    row.updated_by ?? undefined,
    createdAt:      row.created_at,
    updatedAt:      row.updated_at,
  };
}

export async function getAllSessionPasses(): Promise<SessionPass[]> {
  const { data, error } = await createAdminClient()
    .from("session_passes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as DbRow[]).map(fromDb);
}

export async function addSessionPass(input: {
  customerId: string;
  totalCount: number;
  personCount?: number;
  price?: number;
  purchasedAt: string;
  expiredAt?: string;
  note?: string;
}): Promise<SessionPass> {
  const client = createAdminClient();
  const base = {
    customer_id:     input.customerId,
    total_count:     input.totalCount,
    remaining_count: input.totalCount,
    person_count:    input.personCount ?? 1,
    price:           input.price ?? null,
    purchased_at:    input.purchasedAt,
    expired_at:      input.expiredAt ?? null,
    note:            input.note ?? null,
  };
  const creator = (await currentMemberId()) ?? null;
  let { data, error } = await client.from("session_passes").insert({ ...base, created_by: creator, updated_by: creator }).select().single();
  if (error && isMissingAuthorColumn(error)) {
    ({ data, error } = await client.from("session_passes").insert(base).select().single());
  }
  if (error) throw error;
  return fromDb(data as DbRow);
}

export async function updateSessionPass(id: string, input: {
  totalCount?: number;
  personCount?: number;
  price?: number | null;
  purchasedAt?: string;
  expiredAt?: string | null;
  note?: string | null;
}): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (input.totalCount  !== undefined) patch.total_count   = input.totalCount;
  if (input.personCount !== undefined) patch.person_count  = input.personCount;
  if ("price"      in input)           patch.price         = input.price ?? null;
  if (input.purchasedAt !== undefined) patch.purchased_at  = input.purchasedAt;
  if ("expiredAt"  in input)           patch.expired_at    = input.expiredAt ?? null;
  if ("note"       in input)           patch.note          = input.note ?? null;
  patch.updated_by = (await currentMemberId()) ?? null;
  const client = createAdminClient();
  let { error } = await client.from("session_passes").update(patch).eq("id", id);
  if (error && isMissingAuthorColumn(error)) {
    const { updated_by, ...rest } = patch;
    void updated_by;
    ({ error } = await client.from("session_passes").update(rest).eq("id", id));
  }
  if (error) throw error;
}

export async function deleteSessionPass(id: string): Promise<void> {
  const { error } = await createAdminClient()
    .from("session_passes")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export type SessionPassUsage = { ordinal: number; totalCount: number };

// 指定レッスンがその回数券の何回目の利用かを返す（同じ回数券のレッスンを日時順に数えた序数）。
// 取得に失敗した場合は null を返し、呼び出し元の描画は落とさない。
export async function getSessionPassUsage(passId: string, lessonId: string): Promise<SessionPassUsage | null> {
  try {
    const client = createAdminClient();
    const [passRes, lessonsRes] = await Promise.all([
      client.from("session_passes").select("total_count").eq("id", passId).single(),
      client.from("lessons").select("id, scheduled_at, created_at").eq("session_pass_id", passId),
    ]);
    if (passRes.error || lessonsRes.error || !passRes.data) return null;
    const rows = (lessonsRes.data ?? []) as { id: string; scheduled_at: string; created_at: string }[];
    const ordinal = passUsageOrdinals(
      rows.map((r) => ({ id: r.id, scheduledAt: r.scheduled_at, createdAt: r.created_at }))
    ).get(lessonId);
    if (!ordinal) return null;
    return { ordinal, totalCount: (passRes.data as { total_count: number }).total_count };
  } catch {
    return null;
  }
}

// マイグレーション（20260919000001）未適用の環境でも予約を止めないための判定。
// PostgREST は未定義の関数呼び出しを PGRST202 で返す。
function isMissingRpc(error: { code?: string; message?: string }): boolean {
  return error.code === "PGRST202" || /could not find the function/i.test(error.message ?? "");
}

async function remainingCountOf(id: string): Promise<{ remaining: number; total: number }> {
  const { data } = await createAdminClient()
    .from("session_passes")
    .select("remaining_count, total_count")
    .eq("id", id)
    .maybeSingle();
  const row = data as { remaining_count: number; total_count: number } | null;
  return { remaining: row?.remaining_count ?? 0, total: row?.total_count ?? 0 };
}

/** 回数券の残数を count 回ぶん確保する。足りなければ1回も消費せずエラーを投げる。
 *  レッスンを作る「前」に呼ぶこと（残数0でもレッスンだけ登録される状態を防ぐため）。 */
export async function reserveSessionPass(id: string, count = 1): Promise<void> {
  if (count <= 0) return;
  const client = createAdminClient();
  const { data, error } = await client.rpc("reserve_session_pass", { pass_id: id, amount: count });
  if (error && !isMissingRpc(error)) throw error;

  if (!error) {
    if (data === true) return;
    const { remaining } = await remainingCountOf(id);
    throw new ActionError(shortageMessage(remaining, count));
  }

  // 旧 RPC での代替実行（アトミックではないが、残数不足の予約は同様に弾く）
  const { remaining } = await remainingCountOf(id);
  if (remaining < count) throw new ActionError(shortageMessage(remaining, count));
  for (let i = 0; i < count; i++) {
    const { error: e } = await client.rpc("decrement_session_pass", { pass_id: id });
    if (e) throw e;
  }
}

/** 確保した残数を count 回ぶん戻す（レッスンの削除・回数券の付け替え・作成失敗時）。 */
export async function releaseSessionPass(id: string, count = 1): Promise<void> {
  if (count <= 0) return;
  const client = createAdminClient();
  const { error } = await client.rpc("release_session_pass", { pass_id: id, amount: count });
  if (!error) return;
  if (!isMissingRpc(error)) throw error;

  // 旧 RPC には上限が無いので、総回数を超えないぶんだけ戻す
  const { remaining, total } = await remainingCountOf(id);
  for (let i = 0; i < Math.min(count, Math.max(total - remaining, 0)); i++) {
    const { error: e } = await client.rpc("increment_session_pass", { pass_id: id });
    if (e) throw e;
  }
}

function shortageMessage(remaining: number, needed: number): string {
  return `回数券の残数が足りません（残り${remaining}回・必要${needed}回）。登録する件数を減らすか、回数券を追加してください。`;
}

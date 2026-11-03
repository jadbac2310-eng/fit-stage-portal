import { createAdminClient } from "./supabase";

/**
 * 星まわりの「代表からのひとこと」。月ごとに、1人ずつ（memberId）か全員へ（memberId null）。
 * 列が無い環境（SQL 未適用）でも落ちないよう、読めなければ空で返す。
 */
export interface FortuneNote {
  id: string;
  memberId: string | null;
  month: string;
  body: string;
  updatedAt: string;
}

type Row = { id: string; member_id: string | null; month: string; body: string; updated_at: string };

export async function getFortuneNotes(month: string): Promise<FortuneNote[]> {
  try {
    const { data, error } = await createAdminClient().from("fortune_notes").select("*").eq("month", month);
    if (error || !data) return [];
    return (data as Row[]).map((r) => ({ id: r.id, memberId: r.member_id, month: r.month, body: r.body, updatedAt: r.updated_at }));
  } catch {
    return [];
  }
}

/** 空の本文なら消す。あれば上書き */
export async function saveFortuneNote(input: { memberId: string | null; month: string; body: string; createdBy?: string }): Promise<void> {
  const client = createAdminClient();
  const body = input.body.trim();
  let q = client.from("fortune_notes").delete().eq("month", input.month);
  q = input.memberId ? q.eq("member_id", input.memberId) : q.is("member_id", null);
  const { error: delError } = await q;
  if (delError) throw delError;
  if (!body) return;
  const { error } = await client.from("fortune_notes").insert({
    member_id: input.memberId, month: input.month, body, created_by: input.createdBy ?? null,
  });
  if (error) throw error;
}

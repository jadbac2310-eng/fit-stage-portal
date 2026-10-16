import { createAdminClient } from "./supabase";

// トレーナー同士の「👏」。
//
// テーブルがまだ無い環境（SQL未適用）でも画面が落ちないように、
// 読み書きとも「できなければ何もしない」で通す。

export const KUDO_EMOJI = "👏";

export interface KudoState {
  /** その人がもらった数 */
  count: number;
  /** 自分が押しているか */
  mine:  boolean;
}

function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42P01" || /does not exist|could not find the table/i.test(error.message ?? "");
}

/** その日のぶんを担当者IDごとにまとめて返す */
export async function getKudosOfDay(day: string, meId?: string): Promise<Record<string, KudoState>> {
  const { data, error } = await createAdminClient()
    .from("kudos")
    .select("to_member_id, from_member_id")
    .eq("day", day);
  if (error || !data) {
    if (error && !isMissingTable(error)) console.error("[kudos] 取得に失敗", error);
    return {};
  }

  const out: Record<string, KudoState> = {};
  for (const r of data as { to_member_id: string; from_member_id: string }[]) {
    const cur = out[r.to_member_id] ?? { count: 0, mine: false };
    cur.count += 1;
    if (meId && r.from_member_id === meId) cur.mine = true;
    out[r.to_member_id] = cur;
  }
  return out;
}

/**
 * 押す／取り消す。戻り値は「押した状態になったか」。
 * 自分には押せない。
 */
export async function toggleKudo(fromId: string, toId: string, day: string): Promise<boolean> {
  if (!fromId || !toId || fromId === toId) return false;
  const client = createAdminClient();

  const { data: existing, error: findError } = await client
    .from("kudos")
    .select("id")
    .eq("from_member_id", fromId).eq("to_member_id", toId)
    .eq("day", day).eq("emoji", KUDO_EMOJI)
    .limit(1);
  if (findError) {
    if (!isMissingTable(findError)) console.error("[kudos] 確認に失敗", findError);
    return false;
  }

  if (existing && existing.length > 0) {
    await client.from("kudos").delete().eq("id", (existing[0] as { id: string }).id);
    return false;
  }

  const { error } = await client.from("kudos").insert({
    from_member_id: fromId, to_member_id: toId, day, emoji: KUDO_EMOJI,
  });
  if (error) { console.error("[kudos] 登録に失敗", error); return false; }
  return true;
}

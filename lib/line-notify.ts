import { getMembers, type Member } from "./members";
import { pushLineMessage } from "./line";
import { createAdminClient } from "./supabase";

const JST = 9 * 3600 * 1000;

/** ISO(UTC)文字列を日本時間の 'YYYY-MM-DD' にする */
export function jstDateStr(iso: string | number | Date = Date.now()): string {
  const t = typeof iso === "number" ? iso : new Date(iso).getTime();
  return new Date(t + JST).toISOString().slice(0, 10);
}
/** ISO(UTC)文字列を日本時間の 'HH:MM' にする */
export function jstTimeStr(iso: string): string {
  const d = new Date(new Date(iso).getTime() + JST);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}
const WD = ["日", "月", "火", "水", "木", "金", "土"];
export function jstDateLabel(iso: string): string {
  const d = new Date(new Date(iso).getTime() + JST);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${WD[d.getUTCDay()]})`;
}

/** 予定1件の表示行（時刻 タイトル（担当 X） ＠場所） */
export function fmtItemLine(opts: { startAt: string; allDay?: boolean; title: string; location?: string; assignee?: string }): string {
  const time = opts.allDay ? "終日" : jstTimeStr(opts.startAt);
  const who = opts.assignee ? `（担当 ${opts.assignee}）` : "";
  const loc = opts.location ? ` ＠${opts.location}` : "";
  return `${time}　${opts.title}${who}${loc}`;
}

/** memberIds のうち LINE連携済みの人へテキストを送信（best-effort・例外を投げない） */
export async function notifyMembersByLine(memberIds: string[], text: string, membersCache?: Member[]): Promise<void> {
  try {
    const ids = Array.from(new Set(memberIds.filter(Boolean)));
    if (ids.length === 0) return;
    const members = membersCache ?? (await getMembers());
    const targets = members.filter((m) => ids.includes(m.id) && m.lineUserId);
    await Promise.all(targets.map((m) => pushLineMessage(m.lineUserId!, text)));
  } catch (e) {
    console.error("[line] notifyMembersByLine 失敗", e);
  }
}

// ─── 送信済みログ（重複送信の防止） ────────────────────
/** kind と ref 群について、送信済みの "ref__memberId" の集合を返す */
export async function fetchSentKeys(kind: string, refs: string[]): Promise<Set<string>> {
  if (refs.length === 0) return new Set();
  const { data, error } = await createAdminClient()
    .from("line_notifications").select("ref, member_id").eq("kind", kind).in("ref", refs);
  if (error || !data) return new Set();
  return new Set((data as { ref: string; member_id: string }[]).map((r) => `${r.ref}__${r.member_id}`));
}
export async function markSent(kind: string, ref: string, memberId: string): Promise<void> {
  try {
    await createAdminClient().from("line_notifications")
      .upsert({ kind, ref, member_id: memberId }, { onConflict: "kind,ref,member_id", ignoreDuplicates: true });
  } catch (e) {
    console.error("[line] markSent 失敗", e);
  }
}

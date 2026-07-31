import { getMembers, type Member } from "./members";
import { pushLineMessage } from "./line";
import { createAdminClient } from "./supabase";

const JST = 9 * 3600 * 1000;

// ポータルのURL（環境変数 APP_URL で上書き可。末尾に path を付与）
export function portalUrl(path = ""): string {
  const base = (process.env.APP_URL || "https://fit-stage-portal.vercel.app").replace(/\/$/, "");
  return base + path;
}

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

// ─── 従業員向け通知のON/OFF ────────────────────────────
// LINE公式アカウントの無料枠は月200通（カウントは「送信回数 × 送った人数」）。
// フリープランは超過しても課金されず、代わりに配信できなくなるため通数の管理が要る。
// 毎朝のまとめは2026-07-29に廃止（管理者向け「全員のスケジュール」だけで月約60通を消費し、
// ポータルを開けば見られる情報だったため）。残りは既定ON、止めたい種類だけ "off" にする。
//   LINE_NOTIFY_REMINDER … 開始30分前のリマインド（月100通強）
//   LINE_NOTIFY_INSTANT  … 予定の追加/変更/削除/参加者追加の即時通知
// ※ webhookの応答メッセージ(reply)は無料枠の対象外なので、この設定の影響を受けない。
export type StaffNotifyKind = "reminder" | "instant";

const STAFF_NOTIFY_ENV: Record<StaffNotifyKind, string> = {
  reminder: "LINE_NOTIFY_REMINDER",
  instant:  "LINE_NOTIFY_INSTANT",
};

export function staffNotifyEnabled(kind: StaffNotifyKind): boolean {
  return (process.env[STAFF_NOTIFY_ENV[kind]] ?? "").trim().toLowerCase() !== "off";
}

/** 従業員向け通知が1種類でも有効か（全部 "off" ならLINE連携カード自体を出さない） */
export function anyStaffNotifyEnabled(): boolean {
  return (Object.keys(STAFF_NOTIFY_ENV) as StaffNotifyKind[]).some(staffNotifyEnabled);
}

/**
 * memberIds のうち LINE連携済みの人へテキストを送信（best-effort・例外を投げない）。
 * text に関数を渡すと担当者ごとに本文を生成できる（自動ログインリンクの埋め込み等に使う）。
 */
export async function notifyMembersByLine(
  memberIds: string[],
  text: string | ((m: Member) => string),
  membersCache?: Member[],
): Promise<void> {
  if (!staffNotifyEnabled("instant")) return;
  try {
    const ids = Array.from(new Set(memberIds.filter(Boolean)));
    if (ids.length === 0) return;
    const members = membersCache ?? (await getMembers());
    const targets = members.filter((m) => ids.includes(m.id) && m.lineUserId);
    await Promise.all(targets.map((m) => pushLineMessage(m.lineUserId!, typeof text === "function" ? text(m) : text)));
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

import { createAdminClient } from "./supabase";
import { getCurrentMember } from "./members";
import type { InvoiceMailRecord } from "./invoice-mail-types";

/**
 * 請求書メールの二重送信を止める（2026-11-10）。
 *
 * 起きたこと：1回目に「送信に失敗しました」と出たのに、実はメールは送れていた。
 * 押し直したので、同じ請求書が4秒ちがいで2通届いた（お客さま宛てなら、まずい）。
 * サーバーは送り終えていたが、返事が画面に戻る前に切れると、画面は失敗だと思ってしまう。
 *
 * なので、送る「前」に操作ログ（activity_logs）へ「送信中」を書く。
 * - 送れたら、その行を「請求書をメール送信: …」に書き換える（操作ログの見え方は今までどおり）
 * - はっきり失敗したら、その行を消す（押し直しを止めないため）
 * - 途中で切れたら「送信中」のまま残る → 次に押したとき「さっき送っています」と止められる
 * 専用のテーブルは足していない。
 */

const SENT_PREFIX = "請求書をメール送信";
/** この時間内に同じ請求書・同じ宛先へ送っていたら、確かめてから送る */
export const INVOICE_MAIL_GUARD_MINUTES = 10;

function tail(month: string, to: string): string {
  return `${month} → ${to}`;
}

/** 直近に同じ請求書を同じ宛先へ送って（または送りかけて）いたら、何分前かを返す */
export async function recentInvoiceMail(billerId: string, month: string, to: string): Promise<{ minutesAgo: number } | null> {
  try {
    const since = new Date(new Date().getTime() - INVOICE_MAIL_GUARD_MINUTES * 60_000).toISOString();
    const { data, error } = await createAdminClient()
      .from("activity_logs")
      .select("summary, created_at")
      .eq("entity_type", "invoice").eq("entity_id", billerId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error || !data) return null;
    const end = tail(month, to);
    const hit = (data as { summary: string | null; created_at: string }[])
      .find((r) => r.summary?.startsWith(SENT_PREFIX) && r.summary.endsWith(end));
    if (!hit) return null;
    const ms = new Date().getTime() - new Date(hit.created_at).getTime();
    return { minutesAgo: Math.max(0, Math.floor(ms / 60_000)) };
  } catch {
    return null; // 調べられないときは止めない（送れないほうが困る）
  }
}

/** 送る前に「送信中」を書く。書けなかったら null（それでも送信は続ける） */
export async function markInvoiceMailStart(billerId: string, billerName: string, month: string, to: string): Promise<string | null> {
  try {
    const me = await getCurrentMember();
    const { data, error } = await createAdminClient()
      .from("activity_logs")
      .insert({
        member_id: me?.id ?? null, member_name: me?.name ?? null,
        action: "create", entity_type: "invoice", entity_id: billerId,
        summary: `${SENT_PREFIX}（送信中）: ${billerName} ${tail(month, to)}`,
      })
      .select("id").single();
    if (error || !data) return null;
    return (data as { id: string }).id;
  } catch {
    return null;
  }
}

/** 送れた：「送信中」を外して、いつもの操作ログの形にする */
export async function markInvoiceMailSent(logId: string | null, billerName: string, month: string, to: string): Promise<void> {
  if (!logId) return;
  try {
    await createAdminClient().from("activity_logs")
      .update({ summary: `${SENT_PREFIX}: ${billerName} ${tail(month, to)}` }).eq("id", logId);
  } catch { /* 書き換えられなくても「送信中」の行が残るので、二重送信は止まる */ }
}

/** はっきり失敗した：行を消して、すぐ押し直せるようにする */
export async function clearInvoiceMailStart(logId: string | null): Promise<void> {
  if (!logId) return;
  try {
    await createAdminClient().from("activity_logs").delete().eq("id", logId);
  } catch { /* 消せなくても、10分たてば押し直せる */ }
}

/**
 * その月の請求書を、いつ・どこへメールで送ったか（新しい順）。
 * 一覧と請求書の画面に「11/10(火) 11:56 送信」と出すために使う。操作ログの文字から読む。
 */
export async function getInvoiceMailRecords(month: string, billerId?: string): Promise<InvoiceMailRecord[]> {
  try {
    let q = createAdminClient()
      .from("activity_logs")
      .select("entity_id, summary, created_at, member_name")
      .eq("entity_type", "invoice")
      .like("summary", `${SENT_PREFIX}%`)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (billerId) q = q.eq("entity_id", billerId);
    const { data, error } = await q;
    if (error || !data) return [];
    const out: InvoiceMailRecord[] = [];
    for (const r of data as { entity_id: string | null; summary: string | null; created_at: string; member_name: string | null }[]) {
      const m = r.summary?.match(/ (\d{4}-\d{2}) → (\S+)$/);
      if (!m || m[1] !== month || !r.entity_id) continue;
      out.push({
        billerId: r.entity_id, to: m[2], at: r.created_at,
        pending: r.summary!.startsWith(`${SENT_PREFIX}（送信中）`),
        byName: r.member_name ?? undefined,
      });
    }
    return out;
  } catch {
    return [];
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getMembers } from "@/lib/members";
import { getLessons } from "@/lib/lessons";
import { getTrialLessons } from "@/lib/trial-lessons";
import { getStores } from "@/lib/stores";
import { pushLineMessage } from "@/lib/line";
import { fetchSentKeys, markSent, canNotifyByLine, jstDateStr, jstDateLabel, jstTimeStr } from "@/lib/line-notify";
import { scheduleLink } from "@/lib/line-login";
import { jstParts } from "@/lib/daily-reminders";
import { notifyUnconfirmedTrials, trialUnconfirmedEnabled } from "@/lib/trial-unconfirmed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 庄内店・曽根城山店の「明日のレッスン」を、前日18時に代表へLINEで知らせる。
 *
 * ・対象の店舗は STORE_TOMORROW_STORES（店舗名の一部をカンマ区切り。既定 "庄内,曽根"）
 * ・宛先は STORE_TOMORROW_NOTIFY_MEMBER_IDS（既定はオーナー）
 * ・時刻は STORE_TOMORROW_HOUR（日本時間の何時台か。既定 18）
 * ・LINE_NOTIFY_STORE_TOMORROW=off で止める
 *
 * Vercel の cron（1日1回・指定の1時間のどこか）から呼ばれる。数分おきに叩かれても、
 * 送信済みログ（line_notifications）で1日1通に収まる。明日その2店舗にレッスンが無い日は何も送らない。
 *
 * 同じ時刻に、明日の体験で「予約を確認しました」が押されていない人も知らせる（lib/trial-unconfirmed.ts。
 * LINE_NOTIFY_TRIAL_UNCONFIRMED=off で止める。店舗レッスンの知らせを止めても、こちらは動く）。
 */
const SEND_HOUR = Number(process.env.STORE_TOMORROW_HOUR ?? "18");
const STORE_KEYS = (process.env.STORE_TOMORROW_STORES ?? "庄内,曽根").split(",").map((s) => s.trim()).filter(Boolean);

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}` || req.nextUrl.searchParams.get("secret") === secret;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const now = new Date();
  const fromVercelCron = req.headers.get("x-vercel-cron-schedule") !== null;
  if (!fromVercelCron && jstParts(now).hour < SEND_HOUR) {
    return NextResponse.json({ ok: true, sent: 0, waiting: true });
  }

  let unconfirmed: { sent: number; trials: number } | { error: string } | "off" = "off";
  if (trialUnconfirmedEnabled()) {
    try {
      unconfirmed = await notifyUnconfirmedTrials(now);
    } catch (e) {
      console.error("[store-tomorrow] 未確認の体験の知らせに失敗", e);
      unconfirmed = { error: e instanceof Error ? e.message : String(e) };
    }
  }
  const store = await storeTomorrow(now);
  return NextResponse.json({ ok: true, ...store, unconfirmed });
}

async function storeTomorrow(now: Date): Promise<Record<string, unknown>> {
  if ((process.env.LINE_NOTIFY_STORE_TOMORROW ?? "").trim().toLowerCase() === "off") {
    return { sent: 0, disabled: true };
  }

  const today = jstDateStr(now);
  const tomorrow = jstDateStr(now.getTime() + 24 * 3600 * 1000);
  const [members, stores, lessons, trials] = await Promise.all([
    getMembers(), getStores(), getLessons(today), getTrialLessons(today),
  ]);

  const targetStores = stores.filter((s) => STORE_KEYS.some((k) => s.name.includes(k)));
  const storeName = new Map(targetStores.map((s) => [s.id, s.name]));
  if (storeName.size === 0) return { sent: 0, note: "対象の店舗がマスタにありません" };

  type Row = { storeId: string; at: string; who: string; trainer: string };
  const rows: Row[] = [];
  for (const l of lessons) {
    if (!l.storeId || !storeName.has(l.storeId) || l.status === "cancelled" || jstDateStr(l.scheduledAt) !== tomorrow) continue;
    rows.push({ storeId: l.storeId, at: l.scheduledAt, who: l.customerName, trainer: l.trainerMemberName ?? "担当未設定" });
  }
  for (const t of trials) {
    if (!t.storeId || !storeName.has(t.storeId) || t.status === "cancelled" || jstDateStr(t.scheduledAt) !== tomorrow) continue;
    rows.push({ storeId: t.storeId, at: t.scheduledAt, who: `${t.customerName}（体験）`, trainer: t.trainerMemberName ?? "担当未設定" });
  }
  if (rows.length === 0) return { sent: 0, none: true };

  // 店舗ごと・時刻順にまとめる
  const lines: string[] = [`🏠 明日 ${jstDateLabel(`${tomorrow}T00:00:00+09:00`)} の店舗レッスン`];
  for (const s of targetStores) {
    const mine = rows.filter((r) => r.storeId === s.id).sort((a, b) => a.at.localeCompare(b.at));
    if (mine.length === 0) continue;
    lines.push(`\n■ ${s.name}（${mine.length}件）`);
    for (const r of mine) lines.push(`${jstTimeStr(r.at)} ${r.who}／${r.trainer}`);
  }
  const text = lines.join("\n");

  // 宛先：指定があればその人たち、無ければオーナー
  const ids = (process.env.STORE_TOMORROW_NOTIFY_MEMBER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const recipients = ids.length > 0 ? members.filter((m) => ids.includes(m.id)) : members.filter((m) => m.isOwner);
  const ref = `store-tomorrow:${tomorrow}`;
  const sent = await fetchSentKeys("store-tomorrow", [ref]);

  let count = 0;
  for (const m of recipients) {
    if (!canNotifyByLine(m) || sent.has(`${ref}__${m.id}`)) continue;
    const res = await pushLineMessage(m.lineUserId!, text + scheduleLink(m));
    if (res.ok) { await markSent("store-tomorrow", ref, m.id); count++; }
  }
  return { sent: count, lessons: rows.length };
}

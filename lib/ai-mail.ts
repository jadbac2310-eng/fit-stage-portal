import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase";
import { getMembers } from "@/lib/members";
import { pushLineMessage } from "@/lib/line";
import { canNotifyByLine } from "@/lib/line-notify";
import type { AgentEventRow, AgentStatus, MailCategory, MailRow } from "@/lib/ai-mail-types";
import { HEARTBEAT_STALE_MS } from "@/lib/ai-mail-types";

/**
 * AIメール担当（ワーカーは別リポジトリ fit-stage-agents）とポータルをつなぐ DB の読み書き。
 * 表がまだ無い DB（SQL 未実行）でも、ポータルが壊れないようにする（読むと空、書くと何もしない）。
 * 画面からは import しない（service role を使うため）。型は ai-mail-types.ts。
 */
const AGENT = "mail";

function missingTable(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return err.code === "42P01" || err.code === "PGRST205" || /does not exist|Could not find the table/i.test(err.message ?? "");
}

export async function getAgentStatus(): Promise<AgentStatus | null> {
  const db = createAdminClient();
  const { data, error } = await db.from("agent_settings").select("*").eq("agent", AGENT).maybeSingle();
  if (error) {
    if (missingTable(error)) return null;
    throw new Error(error.message);
  }
  if (!data) return null;
  return {
    killSwitch: !!data.kill_switch,
    killReason: data.kill_reason ?? null,
    killedAt: data.killed_at ?? null,
    killedBy: data.killed_by ?? null,
    phase: Number(data.phase ?? 1),
    monthlyBudgetUsd: Number(data.monthly_budget_usd ?? 10),
    heartbeatAt: data.heartbeat_at ?? null,
    workerVersion: data.worker_version ?? null,
  };
}

export async function getMailRows(opts: { sinceDays?: number; limit?: number } = {}): Promise<MailRow[]> {
  const db = createAdminClient();
  const since = new Date(Date.now() - (opts.sinceDays ?? 14) * 24 * 3600 * 1000).toISOString();
  const { data, error } = await db
    .from("mail_messages")
    .select("id, source, from_address, from_name, to_address, subject, body_text, received_at, status, category, confidence, reason, summary, urgent, classified_by, human_category, human_note, reviewed_by, error")
    .eq("agent", AGENT)
    .gte("received_at", since)
    .order("received_at", { ascending: false })
    .limit(opts.limit ?? 300);
  if (error) {
    if (missingTable(error)) return [];
    throw new Error(error.message);
  }
  return (data ?? []).map((r) => ({
    id: r.id, source: r.source, fromAddress: r.from_address, fromName: r.from_name, toAddress: r.to_address,
    subject: r.subject, bodyText: r.body_text, receivedAt: r.received_at, status: r.status, category: r.category,
    confidence: r.confidence, reason: r.reason, summary: r.summary, urgent: r.urgent, classifiedBy: r.classified_by,
    humanCategory: r.human_category, humanNote: r.human_note, reviewedBy: r.reviewed_by, error: r.error,
  }));
}

export async function getAgentEvents(limit = 50): Promise<AgentEventRow[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("agent_events")
    .select("id, event_type, message_id, detail, actor, created_at")
    .eq("agent", AGENT)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    if (missingTable(error)) return [];
    throw new Error(error.message);
  }
  return (data ?? []).map((r) => ({
    id: r.id, eventType: r.event_type, messageId: r.message_id, detail: r.detail ?? {}, actor: r.actor, createdAt: r.created_at,
  }));
}

/** 今月（日本時間）の AI の費用 */
export async function getMonthSpendUsd(): Promise<number> {
  const db = createAdminClient();
  const j = new Date(Date.now() + 9 * 3600 * 1000);
  const start = new Date(Date.UTC(j.getUTCFullYear(), j.getUTCMonth(), 1) - 9 * 3600 * 1000).toISOString();
  const { data, error } = await db.from("agent_api_usage").select("cost_usd").eq("agent", AGENT).gte("created_at", start);
  if (error) {
    if (missingTable(error)) return 0;
    throw new Error(error.message);
  }
  return (data ?? []).reduce((s, r) => s + Number(r.cost_usd ?? 0), 0);
}

export async function logAgentEvent(type: string, actor: string, detail: Record<string, unknown> = {}, messageId?: string) {
  const db = createAdminClient();
  const { error } = await db.from("agent_events").insert({ agent: AGENT, event_type: type, actor, detail, message_id: messageId ?? null });
  if (error && !missingTable(error)) console.error("[ai-mail] ログを書けません", error.message);
}

/** 緊急停止・再開。表が無ければ false */
export async function setKillSwitch(on: boolean, by: string, reason?: string): Promise<boolean> {
  const db = createAdminClient();
  const { error } = await db.from("agent_settings").upsert({
    agent: AGENT,
    kill_switch: on,
    kill_reason: on ? (reason ?? null) : null,
    killed_at: on ? new Date().toISOString() : null,
    killed_by: on ? by : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "agent" });
  if (error) {
    if (missingTable(error)) return false;
    throw new Error(error.message);
  }
  await logAgentEvent(on ? "kill_on" : "kill_off", by, reason ? { reason } : {});
  return true;
}

export async function setMonthlyBudget(usd: number, by: string): Promise<boolean> {
  const db = createAdminClient();
  const { error } = await db.from("agent_settings").update({ monthly_budget_usd: usd, updated_at: new Date().toISOString() }).eq("agent", AGENT);
  if (error) {
    if (missingTable(error)) return false;
    throw new Error(error.message);
  }
  await logAgentEvent("budget_changed", by, { usd });
  return true;
}

export async function setHumanCategory(id: string, category: MailCategory | null, by: string, note?: string): Promise<void> {
  const db = createAdminClient();
  const { error } = await db.from("mail_messages").update({
    human_category: category,
    human_note: note?.trim() || null,
    reviewed_by: category ? by : null,
    reviewed_at: category ? new Date().toISOString() : null,
  }).eq("id", id);
  if (error) throw new Error(error.message);
  await logAgentEvent("human_label", by, { category }, id);
}

/**
 * HPのお問い合わせを、メール担当が仕分ける列に入れる（/api/contact-webhook から呼ぶ）。
 * 返信は info@fitstage.jp から（フォームは info@ の窓口として扱う）。失敗しても受け口は止めない。
 */
export async function enqueueContactForm(input: {
  fullName: string; email: string; serviceType?: string; company?: string; phone?: string; message?: string; channel?: string;
}): Promise<boolean> {
  const db = createAdminClient();
  const body = [
    input.serviceType ? `種別: ${input.serviceType}` : null,
    `お名前: ${input.fullName}`,
    input.company ? `会社名: ${input.company}` : null,
    input.phone ? `電話: ${input.phone}` : null,
    "",
    input.message ?? "",
  ].filter((l) => l !== null).join("\n");
  const { data, error } = await db.from("mail_messages").insert({
    agent: AGENT,
    source: "contact_form",
    message_key: `contact:${randomUUID()}`,
    from_address: input.email.toLowerCase(),
    from_name: input.fullName,
    to_address: "info@fitstage.jp",
    subject: `HPのお問い合わせ${input.serviceType ? `（${input.serviceType}）` : ""}`,
    body_text: body,
    headers: input.channel ? { channel: input.channel } : {},
    status: "new",
  }).select("id").single();
  if (error) {
    if (!missingTable(error)) console.error("[ai-mail] お問い合わせを入れられません", error.message);
    return false;
  }
  await logAgentEvent("contact_form_received", "hp", {}, data.id);
  return true;
}

/**
 * ワーカーが止まっていないか（数分おきの cron から呼ぶ）。心拍が30分以上来なければ、代表へ LINE を1回だけ。
 * まだ一度も動いていない（心拍が空）ときは何もしない。止めるときは LINE_NOTIFY_AGENT_DOWN=off。
 */
export async function checkMailAgentHeartbeat(): Promise<"ok" | "alerted" | "skipped"> {
  if ((process.env.LINE_NOTIFY_AGENT_DOWN ?? "").trim().toLowerCase() === "off") return "skipped";
  const db = createAdminClient();
  const { data, error } = await db.from("agent_settings").select("heartbeat_at, down_alerted_at").eq("agent", AGENT).maybeSingle();
  if (error || !data?.heartbeat_at) return "skipped";
  const beat = new Date(data.heartbeat_at).getTime();
  if (Date.now() - beat <= HEARTBEAT_STALE_MS) return "ok";
  // 同じ停止で2回送らない（最後の心拍より後に送っていれば送信済み）
  if (data.down_alerted_at && new Date(data.down_alerted_at).getTime() > beat) return "skipped";

  const members = await getMembers();
  const targets = members.filter((m) => m.isOwner && canNotifyByLine(m));
  const mins = Math.round((Date.now() - beat) / 60000);
  const text = `⚠️ AIメール担当が止まっているようです（最後の動きから約${mins}分）。\nVPS のワーカーを確認してください（pm2 status）。\nポータル → /ai-mail`;
  let ok = false;
  for (const m of targets) ok = (await pushLineMessage(m.lineUserId!, text)).ok || ok;
  await db.from("agent_settings").update({ down_alerted_at: new Date().toISOString() }).eq("agent", AGENT);
  await logAgentEvent("worker_down_alert", "portal", { minutes: mins, sent: ok });
  return "alerted";
}

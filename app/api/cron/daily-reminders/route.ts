import { NextRequest, NextResponse } from "next/server";
import { getMembers } from "@/lib/members";
import { getCustomers } from "@/lib/customers";
import { getHourlyTasks } from "@/lib/hourly-tasks";
import { getTrialLessons } from "@/lib/trial-lessons";
import { pushLineMessage } from "@/lib/line";
import { fetchSentKeys, markSent, staffNotifyEnabled } from "@/lib/line-notify";
import { scheduleLink } from "@/lib/line-login";
import { buildDailyReminders, jstParts } from "@/lib/daily-reminders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 1日1回まとめて送る時刻（日本時間の何時台か）。既定は9時 */
const SEND_HOUR = Number(process.env.DAILY_REMINDER_HOUR ?? "9");

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}` || req.nextUrl.searchParams.get("secret") === secret;
}

/**
 * 1日1回のまとめリマインド（請求書の送付日・予定のままの業務・体験の追客）。
 *
 * レッスン直前のリマインドと同じく数分おきに叩かれる前提で、
 * 指定の時刻を過ぎた最初の1回だけ送る（重複は送信済みログで防ぐ）。
 */
export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!staffNotifyEnabled("daily")) return NextResponse.json({ ok: true, sent: 0, disabled: true });

  const now = new Date();
  // 早朝に送らないよう、指定時刻より前は何もしない
  if (jstParts(now).hour < SEND_HOUR) return NextResponse.json({ ok: true, sent: 0, waiting: true });

  const [members, customers, hourlyTasks, trialLessons] = await Promise.all([
    getMembers(), getCustomers(), getHourlyTasks(), getTrialLessons(),
  ]);

  const reminders = buildDailyReminders({
    now, customers, hourlyTasks, trialLessons,
    adminIds: members.filter((m) => m.isAdmin).map((m) => m.id),
    followUpDays: Number(process.env.TRIAL_FOLLOWUP_DAYS ?? "3"),
  });
  if (reminders.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  const memberById = new Map(members.map((m) => [m.id, m]));
  const sent = await fetchSentKeys("daily", reminders.map((r) => r.ref));

  let count = 0;
  for (const r of reminders) {
    for (const mid of new Set(r.recipientIds)) {
      const member = memberById.get(mid);
      if (!member?.lineUserId || sent.has(`${r.ref}__${mid}`)) continue;
      const res = await pushLineMessage(member.lineUserId, r.text + scheduleLink(member));
      if (res.ok) { await markSent("daily", r.ref, mid); count++; }
    }
  }
  return NextResponse.json({ ok: true, sent: count });
}

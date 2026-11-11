import { NextRequest, NextResponse } from "next/server";
import { getMembers } from "@/lib/members";
import { getCustomers } from "@/lib/customers";
import { getHourlyTasks } from "@/lib/hourly-tasks";
import { getTrialLessons } from "@/lib/trial-lessons";
import { pushLineMessage } from "@/lib/line";
import { fetchSentKeys, markSent, staffNotifyEnabled, canNotifyByLine } from "@/lib/line-notify";
import { scheduleLink } from "@/lib/line-login";
import { buildDailyReminders, jstParts } from "@/lib/daily-reminders";
import { commissionCandidates, buildCommissionReminders, commissionTargetMonth } from "@/lib/commission-reminders";
import { buildPayoutTodos } from "@/lib/commission-payouts-types";
import { getCommissionPayouts } from "@/lib/commission-payouts";
import { loadTrainerStatements } from "@/lib/commission-statement-load";

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
 * 1日1回のまとめリマインド（請求書の送付日・予定のままの業務・体験の追客・コミッションの明細と振込）。
 *
 * レッスン直前のリマインドと同じく数分おきに叩かれる前提で、
 * 指定の時刻を過ぎた最初の1回だけ送る（重複は送信済みログで防ぐ）。
 */
export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!staffNotifyEnabled("daily")) return NextResponse.json({ ok: true, sent: 0, disabled: true });

  const now = new Date();
  // Vercelのスケジュールから呼ばれたときは、その時刻が指定どおりなので時刻判定はしない。
  // （Vercelは指定時刻の1時間の中のどこかで呼ぶため、ここで弾くとその日のぶんが丸ごと飛ぶ）
  const fromVercelCron = req.headers.get("x-vercel-cron-schedule") !== null;
  if (!fromVercelCron && jstParts(now).hour < SEND_HOUR) {
    return NextResponse.json({ ok: true, sent: 0, waiting: true });
  }

  const [members, customers, hourlyTasks, trialLessons] = await Promise.all([
    getMembers(), getCustomers(), getHourlyTasks(), getTrialLessons(),
  ]);

  const reminders = buildDailyReminders({
    now, customers, hourlyTasks, trialLessons,
    adminIds: members.filter((m) => m.isAdmin).map((m) => m.id),
    followUpDays: Number(process.env.TRIAL_FOLLOWUP_DAYS ?? "3"),
  });

  // コミッションの知らせ（代表へ。代表が決まっていなければ管理者へ）。
  // 明細の計算は重いので、今日が出番で、まだ送っていない鍵があるときだけ計算する。
  // 出番だったが出すものが無かった鍵（全員済んでいる など）も「送った」ことにして、同じ日に何度も計算しない。
  const owners = members.filter((m) => m.isOwner).map((m) => m.id);
  const commissionTo = owners.length > 0 ? owners : members.filter((m) => m.isAdmin).map((m) => m.id);
  // 止めるときは LINE_NOTIFY_COMMISSION=off
  const commissionOn = (process.env.LINE_NOTIFY_COMMISSION ?? "").trim().toLowerCase() !== "off";
  const candidates = commissionOn && commissionTo.length > 0
    ? commissionCandidates(now, members.map((m) => m.commissionPayDay), Number(process.env.COMMISSION_STATEMENT_DAYS_BEFORE ?? "5"))
    : [];
  if (candidates.length > 0) {
    const done = await fetchSentKeys("daily", candidates.map((c) => c.ref));
    const open = candidates.filter((c) => commissionTo.some((id) => !done.has(`${c.ref}__${id}`)));
    if (open.length > 0) {
      try {
        const month = commissionTargetMonth(now);
        const [{ statements }, payouts] = await Promise.all([loadTrainerStatements(month), getCommissionPayouts(month)]);
        const payDays = Object.fromEntries(members.map((m) => [m.id, m.commissionPayDay]));
        const todos = buildPayoutTodos(statements, month, payDays, payouts.rows);
        const built = buildCommissionReminders(open, todos, month, commissionTo);
        reminders.push(...built);
        const builtRefs = new Set(built.map((r) => r.ref));
        for (const c of open) {
          if (builtRefs.has(c.ref)) continue;
          for (const id of commissionTo) await markSent("daily", c.ref, id);
        }
      } catch (e) {
        console.error("[daily-reminders] コミッションの知らせを作れませんでした", e);
      }
    }
  }

  if (reminders.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  const memberById = new Map(members.map((m) => [m.id, m]));
  const sent = await fetchSentKeys("daily", reminders.map((r) => r.ref));

  let count = 0;
  for (const r of reminders) {
    for (const mid of new Set(r.recipientIds)) {
      const member = memberById.get(mid);
      if (!member || !canNotifyByLine(member) || sent.has(`${r.ref}__${mid}`)) continue;
      const res = await pushLineMessage(member.lineUserId!, r.text + scheduleLink(member));
      if (res.ok) { await markSent("daily", r.ref, mid); count++; }
    }
  }
  return NextResponse.json({ ok: true, sent: count });
}

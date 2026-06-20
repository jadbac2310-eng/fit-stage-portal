import { NextRequest, NextResponse } from "next/server";
import { getMembers } from "@/lib/members";
import { collectNotifyItems } from "@/lib/schedule-items";
import { pushLineMessage } from "@/lib/line";
import { fetchSentKeys, markSent, jstDateStr, jstDateLabel, fmtItemLine } from "@/lib/line-notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}` || req.nextUrl.searchParams.get("secret") === secret;
}

// 毎朝、その日の自分の予定をまとめて送る。予定が無い人には送らない。
export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const today = jstDateStr();
  const items = (await collectNotifyItems()).filter((it) => jstDateStr(it.startAt) === today);
  const members = (await getMembers()).filter((m) => m.lineUserId);
  const sent = await fetchSentKeys("morning", [today]);

  const sentAll = await fetchSentKeys("morning_all", [today]);
  const byTime = (a: { startAt: string }, b: { startAt: string }) =>
    new Date(a.startAt).getTime() - new Date(b.startAt).getTime();

  let count = 0;

  // ① 個人の朝まとめ（全員）：自分が関係する予定だけ
  for (const m of members) {
    if (sent.has(`${today}__${m.id}`)) continue;
    const mine = items.filter((it) => it.recipientIds.includes(m.id)).sort(byTime);
    if (mine.length === 0) continue;
    const lines = mine.map((it) => "・" + fmtItemLine({ startAt: it.startAt, allDay: it.allDay, title: it.title, location: it.location }));
    const text = `☀️ おはようございます\n${jstDateLabel(today)} の予定（${mine.length}件）\n\n${lines.join("\n")}`;
    const r = await pushLineMessage(m.lineUserId!, text);
    if (r.ok) { await markSent("morning", today, m.id); count++; }
  }

  // ② 全員のスケジュール（管理者のみ・別メッセージ）：全員の通常/体験レッスン
  const allLessons = items.filter((it) => it.isLesson).sort(byTime);
  if (allLessons.length > 0) {
    for (const m of members.filter((m) => m.isAdmin)) {
      if (sentAll.has(`${today}__${m.id}`)) continue;
      const lines = allLessons.map((it) => "・" + fmtItemLine({ startAt: it.startAt, allDay: it.allDay, title: it.title, location: it.location, assignee: it.assignee }));
      const text = `📋 本日の全レッスン（${jstDateLabel(today)}・${allLessons.length}件）\n\n${lines.join("\n")}`;
      const r = await pushLineMessage(m.lineUserId!, text);
      if (r.ok) { await markSent("morning_all", today, m.id); count++; }
    }
  }

  return NextResponse.json({ ok: true, sent: count });
}

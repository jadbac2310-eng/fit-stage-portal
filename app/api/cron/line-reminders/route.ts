import { NextRequest, NextResponse } from "next/server";
import { getMembers } from "@/lib/members";
import { collectNotifyItems } from "@/lib/schedule-items";
import { pushLineMessage } from "@/lib/line";
import { fetchSentKeys, markSent, jstDateLabel, jstTimeStr, portalUrl } from "@/lib/line-notify";

const SCHEDULE_LINK = `\n\n▶ スケジュールを見る\n${portalUrl("/schedule")}`;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REMINDER_MIN = Number(process.env.LINE_REMINDER_MINUTES ?? "30");

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}` || req.nextUrl.searchParams.get("secret") === secret;
}

// 予定の開始 REMINDER_MIN 分前にリマインドを送る。数分おきに叩かれる前提（重複は送信済みログで防止）。
export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const now = Date.now();
  const windowMs = REMINDER_MIN * 60 * 1000;
  const items = (await collectNotifyItems()).filter((it) => {
    if (it.allDay) return false;
    const delta = new Date(it.startAt).getTime() - now;
    return delta > 0 && delta <= windowMs;
  });
  if (items.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  const members = await getMembers();
  const lineOf = new Map(members.filter((m) => m.lineUserId).map((m) => [m.id, m.lineUserId!]));
  const sent = await fetchSentKeys("reminder", items.map((it) => it.ref));

  let count = 0;
  for (const it of items) {
    const text = `⏰ まもなく予定です（${REMINDER_MIN}分前）\n${it.title}\n${jstDateLabel(it.startAt)} ${jstTimeStr(it.startAt)}${it.location ? `\n＠${it.location}` : ""}${SCHEDULE_LINK}`;
    for (const mid of new Set(it.recipientIds)) {
      const lineId = lineOf.get(mid);
      if (!lineId || sent.has(`${it.ref}__${mid}`)) continue;
      const r = await pushLineMessage(lineId, text);
      if (r.ok) { await markSent("reminder", it.ref, mid); count++; }
    }
  }
  return NextResponse.json({ ok: true, sent: count });
}

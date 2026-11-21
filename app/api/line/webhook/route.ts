import { NextRequest, NextResponse } from "next/server";
import { verifyLineSignature, replyLineMessage } from "@/lib/line";
import { getMemberByLinkCode, getMemberByLineUserId, setMemberLineUserId } from "@/lib/members";
import { setKillSwitch } from "@/lib/ai-mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// LINE公式アカウントの Webhook。友だち追加＋連携コードで担当者と LINE を紐付ける。
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get("x-line-signature");

  // 署名検証（CHANNEL_SECRET 未設定なら検証不可 → 401）
  if (!verifyLineSignature(raw, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let body: { events?: LineEvent[] };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: true });
  }

  for (const event of body.events ?? []) {
    try {
      await handleEvent(event);
    } catch (e) {
      console.error("[line] webhook event 処理失敗", e);
    }
  }
  return NextResponse.json({ ok: true });
}

type LineEvent = {
  type: string;
  replyToken?: string;
  source?: { userId?: string };
  message?: { type: string; text?: string };
};

const HELP = "FIT STAGEポータルと連携します。\nポータルの「LINE通知」に表示される6桁の連携コードを、このトークに送ってください。";

async function handleEvent(event: LineEvent) {
  const userId = event.source?.userId;
  const reply = event.replyToken;

  if (event.type === "follow") {
    // 連携済みの LINE ユーザーには案内を送らない（未連携の人だけ案内）
    if (userId && (await getMemberByLineUserId(userId))) return;
    if (reply) await replyLineMessage(reply, HELP);
    return;
  }

  if (event.type === "message" && event.message?.type === "text") {
    const code = (event.message.text ?? "").trim().toUpperCase();
    if (!userId) return;

    // AIメール担当の緊急停止（2026-11-21）。代表・管理者が「停止」と送ると、AIの処理と自動送信を全部止める。
    // 再開は打ち間違いで動き出さないよう、ポータルの画面だけにしてある。
    if (/^(停止|ストップ|stop)$/i.test(code)) {
      const me = await getMemberByLineUserId(userId);
      if (me && (me.isOwner || me.isAdmin)) {
        const ok = await setKillSwitch(true, `line:${me.name}`, "LINE で「停止」").catch(() => false);
        if (reply) await replyLineMessage(reply, ok
          ? "AIメール担当を緊急停止しました。受信と保存だけ続けます（仕分け・通知・送信はしません）。\n再開はポータルの「AIメール担当」から。"
          : "停止できませんでした。ポータルの「AIメール担当」の停止ボタンを押してください。");
        return;
      }
    }

    if (!/^[A-Z0-9]{6}$/.test(code)) {
      // 連携済みの担当者が普通のメッセージを送っても自動返信しない。案内は未連携の人だけに出す。
      if (await getMemberByLineUserId(userId)) return;
      if (reply) await replyLineMessage(reply, HELP);
      return;
    }

    const member = await getMemberByLinkCode(code);
    if (!member) {
      if (reply) await replyLineMessage(reply, "連携コードが見つかりませんでした。ポータルに表示されている最新のコードをご確認ください。");
      return;
    }

    // 既に別の担当者に紐づいているこの LINE ユーザーは一旦解除してから付け替える
    const existing = await getMemberByLineUserId(userId);
    if (existing && existing.id !== member.id) await setMemberLineUserId(existing.id, null);

    const ok = await setMemberLineUserId(member.id, userId);
    if (reply) {
      await replyLineMessage(reply, ok
        ? `連携が完了しました。${member.name} さんとして予定の通知をお送りします。`
        : "連携に失敗しました。時間をおいて再度お試しください。");
    }
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getMembers } from "@/lib/members";
import { pushLineMessage } from "@/lib/line";
import { canNotifyByLine } from "@/lib/line-notify";
import { channelLabel } from "@/lib/acquisition-channel";

/**
 * HPのお問い合わせフォーム（/contact/）の内容を受け取り、管理者のLINEへ通知する。
 *
 * 呼び出し元は fit-stage サイトの Vercel Function（api/contact.js）で、
 * ブラウザからは直接呼ばれない（秘密キーをHTMLに置かずに済むため）。
 *
 * 2026-11-01：Formspree のメールが届いていないことが分かったので、
 * 問い合わせを取りこぼさないよう LINE にも届ける。
 * 問い合わせの段階ではお客様ではないので、顧客データやDBには保存しない（通知するだけ）。
 */

export const runtime = "nodejs";

type Body = {
  service_type?: string;
  full_name?: string;
  company?: string;
  email?: string;
  phone_number?: string;
  message?: string;
  source_referrer?: string;
  source_landing?: string;
  source_utm?: string;
};

// LINEのテキストは5000文字まで。長文で送信失敗しないよう切り詰める。
function clip(value: string | undefined, max: number): string {
  const s = (value ?? "").trim();
  return s.length > max ? s.slice(0, max) + "…" : s;
}

export async function POST(req: NextRequest) {
  // 合言葉は体験予約・入会申し込み・応募と同じ（HP側 PORTAL_WEBHOOK_SECRET と同じ文字列）
  const secret = (process.env.RESERVE_WEBHOOK_SECRET || process.env.CONSULTATION_WEBHOOK_SECRET || "").trim();
  if (!secret) {
    console.error("[contact-webhook] RESERVE_WEBHOOK_SECRET が未設定です");
    return NextResponse.json({ error: "Webhook secret is not configured" }, { status: 503 });
  }
  if ((req.headers.get("x-webhook-secret") ?? "").trim() !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const fullName = body.full_name?.trim();
  const email = body.email?.trim();
  if (!fullName || !email) {
    return NextResponse.json({ error: "full_name and email are required" }, { status: 400 });
  }

  if ((process.env.LINE_NOTIFY_CONTACT ?? "").trim().toLowerCase() === "off") {
    return NextResponse.json({ success: true, notified: 0, skipped: "off" });
  }

  try {
    const members = await getMembers();
    // 既定は管理者全員。CONTACT_NOTIFY_MEMBER_IDS で送信先を明示指定もできる。
    const explicit = (process.env.CONTACT_NOTIFY_MEMBER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const targets = members.filter((m) =>
      canNotifyByLine(m) && (explicit.length > 0 ? explicit.includes(m.id) : m.isAdmin));
    if (targets.length === 0) {
      return NextResponse.json({ success: true, notified: 0 });
    }

    const channel = channelLabel(body);
    const text = [
      "📩 HPからお問い合わせが届きました",
      body.service_type ? `種別: ${clip(body.service_type, 60)}` : null,
      `お名前: ${clip(fullName, 100)}`,
      body.company ? `会社名: ${clip(body.company, 100)}` : null,
      `メール: ${clip(email, 200)}`,
      body.phone_number ? `電話: ${clip(body.phone_number, 50)}` : null,
      channel ? `経路: ${clip(channel, 120)}` : null,
      body.message ? `\n内容:\n${clip(body.message, 1500)}` : null,
      "",
      "※ メール（Formspree）が届いていないときは、このLINEから返信してください。",
    ].filter((l) => l !== null).join("\n");

    const results = await Promise.all(targets.map((m) => pushLineMessage(m.lineUserId!, text)));
    return NextResponse.json({ success: true, notified: results.filter((r) => r.ok).length });
  } catch (e) {
    console.error("[contact-webhook] LINE通知に失敗", e);
    return NextResponse.json({ success: true, notified: 0 });
  }
}

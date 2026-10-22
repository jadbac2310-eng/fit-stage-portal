import { NextRequest, NextResponse } from "next/server";
import { getMembers } from "@/lib/members";
import { pushLineMessage } from "@/lib/line";
import { canNotifyByLine } from "@/lib/line-notify";

/**
 * HPの英語対応トレーナー募集の応募フォーム（/recruit/english-trainer/apply/ と
 * 英語版 /en/recruit/apply/）からの応募を受け取り、管理者のLINEへ通知する。
 *
 * 呼び出し元は fit-stage サイトの Vercel Function（api/recruit.js）で、
 * ブラウザからは直接呼ばれない（秘密キーをHTMLに置かずに済むため）。
 *
 * 応募者はお客様ではないので、顧客データやDBには何も保存しない（通知するだけ）。
 * 応募内容はメール（Formspree）でも別経路で届いているため、ここで失敗しても
 * HP側には成功として返し、再送させない。
 */

export const runtime = "nodejs";

type Body = {
  full_name?: string;
  email?: string;
  phone_number?: string;
  age?: string;
  area?: string;
  english_level?: string;
  other_languages?: string;
  experience?: string;
  certifications?: string;
  availability?: string;
  message?: string;
  form_language?: string; // "ja" | "en"（どちらのフォームから来たか）
};

// LINEのテキストは5000文字まで。長い自己PRで送信失敗しないよう切り詰める。
function clip(value: string | undefined, max: number): string {
  const s = (value ?? "").trim();
  return s.length > max ? s.slice(0, max) + "…" : s;
}

export async function POST(req: NextRequest) {
  // 合言葉は体験予約・入会申し込みと同じものを使う（HP側 PORTAL_WEBHOOK_SECRET と同じ文字列）
  const secret = (process.env.RESERVE_WEBHOOK_SECRET || process.env.CONSULTATION_WEBHOOK_SECRET || "").trim();
  if (!secret) {
    console.error("[recruit-webhook] RESERVE_WEBHOOK_SECRET が未設定です");
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

  // 体験予約の通知と同じ設定で止められるようにする（通数が気になるとき用）
  if ((process.env.LINE_NOTIFY_RECRUIT ?? "").trim().toLowerCase() === "off") {
    return NextResponse.json({ success: true, notified: 0, skipped: "off" });
  }

  try {
    const members = await getMembers();
    // 既定は管理者全員。RECRUIT_NOTIFY_MEMBER_IDS で送信先を明示指定もできる。
    const explicit = (process.env.RECRUIT_NOTIFY_MEMBER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const targets = members.filter((m) =>
      canNotifyByLine(m) && (explicit.length > 0 ? explicit.includes(m.id) : m.isAdmin));
    if (targets.length === 0) {
      return NextResponse.json({ success: true, notified: 0 });
    }

    const text = [
      body.form_language === "en"
        ? "📩 英語トレーナーの応募が届きました（英語フォーム）"
        : "📩 英語トレーナーの応募が届きました",
      `お名前: ${clip(fullName, 100)}`,
      body.age ? `年齢: ${clip(body.age, 10)}` : null,
      body.area ? `地域: ${clip(body.area, 100)}` : null,
      body.english_level ? `英語: ${clip(body.english_level, 50)}` : null,
      body.other_languages ? `その他の言語: ${clip(body.other_languages, 100)}` : null,
      body.experience ? `指導経験: ${clip(body.experience, 50)}` : null,
      body.certifications ? `資格: ${clip(body.certifications, 200)}` : null,
      body.availability ? `活動できる時間: ${clip(body.availability, 300)}` : null,
      `メール: ${clip(email, 200)}`,
      body.phone_number ? `電話: ${clip(body.phone_number, 50)}` : null,
      body.message ? `\n経歴・自己PR: ${clip(body.message, 1500)}` : null,
    ].filter(Boolean).join("\n");

    const results = await Promise.all(targets.map((m) => pushLineMessage(m.lineUserId!, text)));
    return NextResponse.json({ success: true, notified: results.filter((r) => r.ok).length });
  } catch (e) {
    console.error("[recruit-webhook] LINE通知に失敗", e);
    return NextResponse.json({ success: true, notified: 0 });
  }
}

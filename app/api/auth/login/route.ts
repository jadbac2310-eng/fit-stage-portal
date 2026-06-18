import { NextRequest, NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase";
import { getMemberByEmail } from "@/lib/members";
import { logActivity } from "@/lib/activity-logs";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

type AttemptRecord = { count: number; firstAt: number };
const attempts = new Map<string, AttemptRecord>();

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = attempts.get(ip);
  if (!record || now - record.firstAt > WINDOW_MS) {
    attempts.set(ip, { count: 1, firstAt: now });
    return false;
  }
  if (record.count >= MAX_ATTEMPTS) return true;
  record.count += 1;
  return false;
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "ログイン試行回数が上限に達しました。15分後に再試行してください。" },
      { status: 429 }
    );
  }

  const { email, password } = await request.json();
  if (!email || !password) {
    return NextResponse.json({ error: "メールアドレスとパスワードを入力してください" }, { status: 400 });
  }

  const supabase = await createAuthClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json(
      { error: "メールアドレスまたはパスワードが正しくありません" },
      { status: 401 }
    );
  }

  attempts.delete(ip);

  // ログイン履歴を記録（失敗してもログインは継続）
  const member = await getMemberByEmail(email);
  await logActivity({
    action: "login",
    entityType: "session",
    summary: "ログイン",
    memberId: member?.id,
    memberName: member?.name ?? email,
    ip,
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  return NextResponse.json({ ok: true });
}

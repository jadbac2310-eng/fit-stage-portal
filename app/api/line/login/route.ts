import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { verifyLoginToken } from "@/lib/line-login";
import { getMember } from "@/lib/members";
import { createAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// オープンリダイレクト防止：相対パス（/で始まり //ではない）のみ許可。
function safePath(to: string | null): string {
  if (!to || !to.startsWith("/") || to.startsWith("//")) return "/schedule";
  return to;
}

// LINE通知のリンクから開かれる。トークンを検証し、Supabaseのマジックリンク（メール送信なし）で
// サーバー側にセッションを張ってから目的のページへリダイレクトする。
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const to = safePath(req.nextUrl.searchParams.get("to"));
  const token = req.nextUrl.searchParams.get("t");

  // 失敗時はログイン画面へ（手動ログイン後に目的地へ）
  const fallback = () =>
    NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(to)}`, origin));

  const memberId = token ? verifyLoginToken(token) : null;
  if (!memberId) return fallback();

  const member = await getMember(memberId);
  if (!member?.email) return fallback();

  // service role でマジックリンクを生成（メールは飛ばない）→ そのトークンハッシュを取得
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: member.email,
  });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) {
    console.error("[line] generateLink 失敗", error);
    return fallback();
  }

  // リダイレクト応答にセッションクッキーを載せる
  const res = NextResponse.redirect(new URL(to, origin));
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    }
  );

  const { error: vErr } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash });
  if (vErr) {
    console.error("[line] verifyOtp 失敗", vErr);
    return fallback();
  }

  return res;
}

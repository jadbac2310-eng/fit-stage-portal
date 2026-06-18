import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase";
import { logActivity } from "@/lib/activity-logs";

export async function POST() {
  // サインアウト前に現在のユーザーを記録
  await logActivity({ action: "logout", entityType: "session", summary: "ログアウト" });
  const supabase = await createAuthClient();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * いまサーバーで動いているポータルの版。画面側の版（ビルド時に焼き込んだ NEXT_PUBLIC_BUILD_ID）と比べて、
 * 古い画面のままなら読み込み直すために使う（components/layout/deploy-guard.tsx）。中身は版の番号だけ。
 */
export function GET() {
  const id = process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || "dev";
  return NextResponse.json({ id }, { headers: { "cache-control": "no-store" } });
}

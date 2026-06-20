import { NextResponse, type NextRequest } from "next/server";
import { getCheckoutUrlByShortCode } from "@/lib/stripe-checkouts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 短縮決済リンク。/p/[code] → Stripe の決済URLへリダイレクトする（決済URLが長いため自社ドメインで包む）。
export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const url = await getCheckoutUrlByShortCode(code);
  if (!url) {
    return new NextResponse("リンクが見つかりません", { status: 404 });
  }
  return NextResponse.redirect(url, { status: 302 });
}

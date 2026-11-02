import type { NextRequest } from "next/server";
import { getCurrentMember } from "@/lib/members";
import { loadGroupInvoice, renderInvoicePdf, invoiceFilename } from "@/lib/invoice-render";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member?.isAdmin) return new Response("権限がありません", { status: 403 });

  const customerId = req.nextUrl.searchParams.get("customer");
  const month = req.nextUrl.searchParams.get("month");
  if (!customerId || !month) return new Response("パラメータが不正です", { status: 400 });

  const loaded = await loadGroupInvoice(customerId, month);
  if (!loaded) return new Response("顧客が見つかりません", { status: 404 });

  const buffer = await renderInvoicePdf(loaded, month);
  const filename = invoiceFilename(loaded.invoice, month);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}

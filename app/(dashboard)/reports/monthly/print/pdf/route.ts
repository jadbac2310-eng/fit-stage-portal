import { renderToBuffer } from "@react-pdf/renderer";
import type { NextRequest } from "next/server";
import { getCustomers } from "@/lib/customers";
import { getLessons } from "@/lib/lessons";
import { getCurrentMember } from "@/lib/members";
import { ISSUER } from "@/lib/invoices";
import { buildMonthlyReport } from "@/lib/monthly-reports";
import { ReportDocument } from "@/lib/report-pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member) return new Response("ログインが必要です", { status: 401 });

  const customerId = req.nextUrl.searchParams.get("customer");
  const month = req.nextUrl.searchParams.get("month");
  if (!customerId || !month) return new Response("パラメータが不正です", { status: 400 });

  const [customers, lessons] = await Promise.all([getCustomers(), getLessons()]);
  const customer = customers.find((c) => c.id === customerId);
  if (!customer) return new Response("顧客が見つかりません", { status: 404 });

  const report = buildMonthlyReport(customerId, customer.fullName, month, lessons);
  const buffer = await renderToBuffer(ReportDocument({ report, issuer: ISSUER }));

  const filename = `トレーニングレポート_${customer.fullName}_${month}.pdf`;
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}

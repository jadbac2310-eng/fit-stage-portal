import { renderToBuffer } from "@react-pdf/renderer";
import type { NextRequest } from "next/server";
import { getCustomers } from "@/lib/customers";
import { getAllCustomerPlans } from "@/lib/customer-plans";
import { getAllSessionPasses } from "@/lib/session-passes";
import { getLessons } from "@/lib/lessons";
import { getAllPlans, planUnitPrice } from "@/lib/plans-master";
import { getCurrentMember } from "@/lib/members";
import {
  billingGroups, buildGroupInvoice, ISSUER,
  monthLabel, invoiceNumber,
} from "@/lib/invoices";
import { InvoiceDocument } from "@/lib/invoice-pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member?.isAdmin) return new Response("権限がありません", { status: 403 });

  const customerId = req.nextUrl.searchParams.get("customer");
  const month = req.nextUrl.searchParams.get("month");
  if (!customerId || !month) return new Response("パラメータが不正です", { status: 400 });

  const [customers, plans, passes, lessons, plansMaster] = await Promise.all([
    getCustomers(),
    getAllCustomerPlans(),
    getAllSessionPasses(),
    getLessons(),
    getAllPlans(),
  ]);

  // まとめ先(biller)のグループを解決
  const groups = billingGroups(customers);
  const group = groups.find((g) => g.biller.id === customerId)
    ?? groups.find((g) => g.members.some((m) => m.id === customerId));
  if (!group) return new Response("顧客が見つかりません", { status: 404 });
  const biller = group.biller;

  const singleMaster = plansMaster.find((p) => p.paymentType === "single");
  const singleFee = singleMaster ? planUnitPrice(singleMaster) : 0;
  const invoice = buildGroupInvoice(biller, group.members, month, { plans, passes, lessons }, singleFee);

  const buffer = await renderToBuffer(
    InvoiceDocument({
      invoice,
      address: biller.address,
      issuer: ISSUER,
      invoiceNo: invoiceNumber(month, biller.id),
      monthLabel: monthLabel(month),
    }),
  );

  const filename = `請求書_${invoice.customerName}_${month}.pdf`;
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}

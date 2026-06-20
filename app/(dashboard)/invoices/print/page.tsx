import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
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
import { EditableBillingName } from "./editable-name";
import { InvoiceActions } from "./invoice-actions";

export const dynamic = "force-dynamic";

function yen(n: number) {
  return `¥${n.toLocaleString("ja-JP")}`;
}

export default async function InvoicePrintPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string; month?: string }>;
}) {
  const member = await getCurrentMember();
  if (!member?.isAdmin) notFound();

  const { customer: customerId, month } = await searchParams;
  if (!customerId || !month) notFound();

  const [customers, plans, passes, lessons, plansMaster] = await Promise.all([
    getCustomers(),
    getAllCustomerPlans(),
    getAllSessionPasses(),
    getLessons(),
    getAllPlans(),
  ]);

  // まとめ先(biller)のグループを解決（指定IDがまとめられる側でも、その請求先グループを表示）
  const groups = billingGroups(customers);
  const group = groups.find((g) => g.biller.id === customerId)
    ?? groups.find((g) => g.members.some((m) => m.id === customerId));
  if (!group) notFound();
  const customer = group.biller;

  const singleMaster = plansMaster.find((p) => p.paymentType === "single");
  const singleFee = singleMaster ? planUnitPrice(singleMaster) : 0;
  const invoice = buildGroupInvoice(customer, group.members, month, { plans, passes, lessons }, singleFee);
  const invoiceNo = invoiceNumber(month, customer.id);
  const pdfHref = `/invoices/print/pdf?customer=${customer.id}&month=${month}`;
  const pdfFilename = `請求書_${invoice.customerName}_${month}.pdf`;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* 操作バー */}
      <div className="flex items-center justify-between mb-4">
        <Link href={`/invoices?month=${month}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition">
          <ChevronLeft size={15} /> 請求書一覧
        </Link>
        <InvoiceActions pdfHref={pdfHref} filename={pdfFilename} billerId={customer.id} month={month} />
      </div>
      <p className="text-xs text-gray-400 mb-4">下はプレビューです。宛名を編集して保存後、「LINEで送る」で内訳＋決済リンクの文面を作って送れます（PDFを送る場合は「PDF共有」）。</p>

      {/* 請求書本体 */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-10 print:border-0 print:p-0 print:rounded-none">
        <h1 className="text-2xl font-bold text-center tracking-widest text-gray-900 mb-6">請　求　書</h1>

        <div className="flex justify-between items-start gap-6 mb-8">
          {/* 宛先 */}
          <div className="flex-1 min-w-0">
            <EditableBillingName customerId={customer.id} name={invoice.customerName} />
            {customer.address && <p className="text-xs text-gray-500 mt-2 whitespace-pre-wrap">{customer.address}</p>}
          </div>
          {/* 発行元 */}
          <div className="text-right text-xs text-gray-600 flex-shrink-0">
            <p className="text-sm font-bold text-gray-900">{ISSUER.name}</p>
            <p className="mt-0.5 whitespace-pre-wrap">{ISSUER.address}</p>
            <p>{ISSUER.tel}</p>
            <p>{ISSUER.email}</p>
          </div>
        </div>

        <div className="flex justify-between text-xs text-gray-500 mb-4">
          <span>請求書番号: {invoiceNo}</span>
          <span>対象月: {monthLabel(month)}</span>
        </div>

        {/* 合計 */}
        <div className="bg-gray-50 print:bg-gray-100 rounded-xl px-5 py-4 mb-6 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-600">ご請求金額（税込）</span>
          <span className="text-2xl font-bold text-gray-900">{yen(invoice.total)}</span>
        </div>

        {/* 明細 */}
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b-2 border-gray-300 text-gray-500">
              <th className="text-left py-2 font-medium w-28">日付</th>
              <th className="text-left py-2 font-medium">品目</th>
              <th className="text-right py-2 font-medium w-28">金額</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((l, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-2 text-gray-500">{l.date}</td>
                <td className="py-2 text-gray-800">{l.label}</td>
                <td className="py-2 text-right text-gray-800 tabular-nums">{yen(l.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="py-2 text-right text-sm font-bold text-gray-700">合計</td>
              <td className="py-2 text-right text-base font-bold text-gray-900 tabular-nums">{yen(invoice.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

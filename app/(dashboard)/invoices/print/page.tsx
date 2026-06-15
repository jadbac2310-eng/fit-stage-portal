import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getCustomers } from "@/lib/customers";
import { getAllCustomerPlans } from "@/lib/customer-plans";
import { getAllSessionPasses } from "@/lib/session-passes";
import { getLessons } from "@/lib/lessons";
import { getAllPlans, planUnitPrice } from "@/lib/plans-master";
import { getCurrentMember } from "@/lib/members";
import { buildInvoice, ISSUER, BANK_INFO } from "@/lib/invoices";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

function yen(n: number) {
  return `¥${n.toLocaleString("ja-JP")}`;
}
function monthLabel(month: string) {
  const [y, m] = month.split("-");
  return `${y}年${parseInt(m, 10)}月`;
}
// 支払期限 = 対象月の翌々月末日（例: 6月分 → 8月末）。請求発行が翌月のため余裕を持たせる
function dueDateLabel(month: string) {
  const [y, m] = month.split("-").map((s) => parseInt(s, 10));
  const due = new Date(y, m + 1, 0); // m は1始まり → m+1月の0日 = m+1月末… JSは0始まりなので (m) が翌月、(m+1,0)が翌月末
  return `${due.getFullYear()}年${due.getMonth() + 1}月${due.getDate()}日`;
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

  const customer = customers.find((c) => c.id === customerId);
  if (!customer) notFound();

  const singleMaster = plansMaster.find((p) => p.paymentType === "single");
  const singleFee = singleMaster ? planUnitPrice(singleMaster) : 0;
  const invoice = buildInvoice(customer, month, { plans, passes, lessons }, singleFee);
  const invoiceNo = `INV-${month.replace("-", "")}-${customer.id.slice(0, 6).toUpperCase()}`;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* 操作バー（印刷時は非表示） */}
      <div className="print:hidden flex items-center justify-between mb-4">
        <Link href={`/invoices?month=${month}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition">
          <ChevronLeft size={15} /> 請求書一覧
        </Link>
        <PrintButton />
      </div>

      {/* 請求書本体 */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-10 print:border-0 print:p-0 print:rounded-none">
        <h1 className="text-2xl font-bold text-center tracking-widest text-gray-900 mb-6">請　求　書</h1>

        <div className="flex justify-between items-start gap-6 mb-8">
          {/* 宛先 */}
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold text-gray-900 border-b border-gray-400 pb-1 inline-block">
              {customer.fullName} 様
            </p>
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

        {/* 振込先 */}
        <div className="border border-gray-300 rounded-xl p-4 text-sm">
          <p className="font-bold text-gray-800 mb-2">お振込先</p>
          <div className="grid grid-cols-[5rem_1fr] gap-y-1 text-gray-700">
            <span className="text-gray-500">銀行名</span><span>{BANK_INFO.bankName}</span>
            <span className="text-gray-500">種別</span><span>{BANK_INFO.accountType}</span>
            <span className="text-gray-500">口座番号</span><span>{BANK_INFO.accountNumber}</span>
            <span className="text-gray-500">口座名義</span><span>{BANK_INFO.accountHolder}</span>
          </div>
          <p className="text-xs text-gray-500 mt-3">お支払期限: {dueDateLabel(month)}（振込手数料はご負担ください）</p>
        </div>

        <p className="text-[10px] text-gray-400 mt-6 text-center">※ 振込先情報は仮です。確定後に差し替えてください。</p>
      </div>
    </div>
  );
}

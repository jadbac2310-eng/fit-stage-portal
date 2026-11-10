import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getCustomers } from "@/lib/customers";
import { getAllCustomerPlans } from "@/lib/customer-plans";
import { getAllSessionPasses } from "@/lib/session-passes";
import { getLessons } from "@/lib/lessons";
import { getTrialLessons } from "@/lib/trial-lessons";
import { getCustomerMonthlyItems } from "@/lib/customer-monthly-items";
import { monthReadStart } from "@/lib/recent-months";
import { getAllPlans } from "@/lib/plans-master";
import { getCurrentMember } from "@/lib/members";
import {
  billingGroups, buildGroupInvoice, invoiceFeesFromPlans, ISSUER, BANK_INFO,
  monthLabel, billingPeriodLabel, dueDateLabel, defaultDueDate, invoiceNumber, addresseeSuffix, taxBreakdown, invoiceRows,
} from "@/lib/invoices";
import { tieredLessonPricesAll } from "@/lib/session-tiers";
import { getInvoiceDueDate } from "@/lib/invoice-due-dates";
import { EditableBillingName } from "./editable-name";
import { EditableDueDate } from "./editable-due-date";
import { InvoiceActions } from "./invoice-actions";

export const dynamic = "force-dynamic";
// この画面から呼ぶ送信（PDFを作ってGmailで送る）が、途中で打ち切られないように長めに取る。
// 初回は起動に時間がかかり、返事が戻る前に切れると「失敗」に見えて二重送信のもとになる。
export const maxDuration = 60;

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
  // その月（と締日ずれのための前月）だけ読む
  const since = monthReadStart(month);

  const [customers, plans, passes, lessons, trialLessons, plansMaster, monthlyItems] = await Promise.all([
    getCustomers(),
    getAllCustomerPlans(),
    getAllSessionPasses(),
    getLessons(since),
    getTrialLessons(since),
    getAllPlans(),
    getCustomerMonthlyItems(),
  ]);

  // まとめ先(biller)のグループを解決（指定IDがまとめられる側でも、その請求先グループを表示）
  const groups = billingGroups(customers);
  const group = groups.find((g) => g.biller.id === customerId)
    ?? groups.find((g) => g.members.some((m) => m.id === customerId));
  if (!group) notFound();
  const customer = group.biller;

  // 段階単価（まとめた人数の合計で単価が変わる契約）をレッスンごとに当てはめる
  const tieredPrices = tieredLessonPricesAll({ customers, lessons });

  const invoice = buildGroupInvoice(
    customer, group.members, month,
    { plans, passes, lessons, trialLessons, monthlyItems, tieredPrices }, invoiceFeesFromPlans(plansMaster),
  );
  const dueOverride = await getInvoiceDueDate(customer.id, month);
  const invoiceNo = invoiceNumber(month, customer.id);
  const suffix = addresseeSuffix(customer.customerType);
  const tax = taxBreakdown(invoice.total);
  const taxExcluded = customer.invoiceTaxExcluded;
  const rows = invoiceRows(invoice, taxExcluded);
  const pdfHref = `/invoices/print/pdf?customer=${customer.id}&month=${month}`;
  const pdfFilename = `請求書_${invoice.customerName}_${month}.pdf`;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* 操作バー */}
      {/* スマホでは「請求書一覧」を上に、ボタンは2列に並べる（1列に詰めると文字が縦になる） */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
        <Link href={`/invoices?month=${month}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition">
          <ChevronLeft size={15} /> 請求書一覧
        </Link>
        <InvoiceActions pdfHref={pdfHref} filename={pdfFilename} billerId={customer.id} month={month} />
      </div>
      <p className="text-xs text-gray-400 mb-4">下はプレビューです。「メール文」で件名・本文を作ってPDFと一緒に送れます。LINEのお客さまは「LINEで送る」。</p>

      {/* 請求書本体 */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-10 print:border-0 print:p-0 print:rounded-none">
        <h1 className="text-2xl font-bold text-center tracking-widest text-gray-900 mb-6">請　求　書</h1>

        <div className="flex justify-between items-start gap-6 mb-8">
          {/* 宛先 */}
          <div className="flex-1 min-w-0">
            <EditableBillingName customerId={customer.id} name={invoice.customerName} suffix={suffix} />
            {customer.address && <p className="text-xs text-gray-500 mt-2 whitespace-pre-wrap">{customer.address}</p>}
          </div>
          {/* 発行元 */}
          <div className="text-right text-xs text-gray-600 flex-shrink-0">
            <p className="text-sm font-bold text-gray-900">{ISSUER.name}</p>
            {ISSUER.contact && <p>担当: {ISSUER.contact}</p>}
            {ISSUER.registrationNumber && <p>登録番号: {ISSUER.registrationNumber}</p>}
            <p className="mt-0.5 whitespace-pre-wrap">{ISSUER.address}</p>
            <p>{ISSUER.tel}</p>
            <p>{ISSUER.email}</p>
          </div>
        </div>

        <div className="flex justify-between text-xs text-gray-500 mb-4">
          <span>請求書番号: {invoiceNo}</span>
          <span>対象月: {monthLabel(month)}</span>
          {/* 締日を設けている取引先には、どの期間ぶんかを明記する */}
          {billingPeriodLabel(month, customer.billingCutoffDay) && (
            <span>対象期間: {billingPeriodLabel(month, customer.billingCutoffDay)}</span>
          )}
        </div>

        {/* 合計 */}
        <div className="bg-gray-50 print:bg-gray-100 rounded-xl px-5 py-4 mb-6 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-600">ご請求金額（税込）</span>
          <span className="text-2xl font-bold text-gray-900">{yen(invoice.total)}</span>
        </div>

        {/* 明細（同じ日付・品目は「数量」でまとめる。税抜表示のお客さまは単価・金額が税抜）。
            スマホでは横にスクロールして見る（列を無理に詰めると品目が1文字ずつ折れる） */}
        <div className="overflow-x-auto -mx-2 px-2 mb-6">
        <table className="w-full min-w-[540px] text-sm">
          <thead>
            <tr className="border-b-2 border-gray-300 text-gray-500">
              <th className="text-left py-2 font-medium w-24">日付</th>
              <th className="text-left py-2 font-medium">品目</th>
              <th className="text-right py-2 font-medium w-12">数量</th>
              <th className="text-right py-2 font-medium w-24">{taxExcluded ? "単価（税抜）" : "単価"}</th>
              <th className="text-right py-2 font-medium w-24">{taxExcluded ? "金額（税抜）" : "金額"}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-2 text-gray-500">{r.noDate ? "" : r.date}</td>
                <td className="py-2 text-gray-800">{r.label}</td>
                <td className="py-2 text-right text-gray-800 tabular-nums">{r.count}</td>
                <td className="py-2 text-right text-gray-800 tabular-nums">{yen(r.unit)}</td>
                <td className="py-2 text-right text-gray-800 tabular-nums">{yen(r.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {taxExcluded ? (
              <>
                <tr>
                  <td colSpan={4} className="pt-2 text-right text-xs text-gray-500">小計（税抜）</td>
                  <td className="pt-2 text-right text-sm text-gray-800 tabular-nums">{yen(tax.net)}</td>
                </tr>
                <tr>
                  <td colSpan={4} className="py-0.5 text-right text-xs text-gray-500">消費税（{tax.rate}%）</td>
                  <td className="py-0.5 text-right text-sm text-gray-800 tabular-nums">{yen(tax.tax)}</td>
                </tr>
                <tr>
                  <td colSpan={4} className="py-2 text-right text-sm font-bold text-gray-700">合計（税込）</td>
                  <td className="py-2 text-right text-base font-bold text-gray-900 tabular-nums">{yen(tax.gross)}</td>
                </tr>
              </>
            ) : (
              <tr>
                <td colSpan={4} className="py-2 text-right text-sm font-bold text-gray-700">合計</td>
                <td className="py-2 text-right text-base font-bold text-gray-900 tabular-nums">{yen(invoice.total)}</td>
              </tr>
            )}
          </tfoot>
        </table>
        </div>

        {/* 消費税の内訳（インボイス制度対応） */}
        <div className="ml-auto w-full sm:w-1/2 border border-gray-300 rounded-xl px-4 py-3 text-sm">
          <div className="flex justify-between text-gray-600 py-0.5">
            <span>{tax.rate}% 対象（税抜）</span>
            <span className="tabular-nums">{yen(tax.net)}</span>
          </div>
          <div className="flex justify-between text-gray-600 py-0.5">
            <span>消費税（{tax.rate}%）</span>
            <span className="tabular-nums">{yen(tax.tax)}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 mt-1.5 pt-1.5">
            <span>合計（税込）</span>
            <span className="tabular-nums">{yen(tax.gross)}</span>
          </div>
        </div>

        {/* 振込先 */}
        <div className="border border-gray-300 rounded-xl p-4 text-sm mt-6">
          <p className="font-bold text-gray-800 mb-2">お振込先</p>
          <div className="grid grid-cols-[5rem_1fr] gap-y-1 text-gray-700">
            <span className="text-gray-500">銀行名</span><span>{BANK_INFO.bankName}</span>
            <span className="text-gray-500">種別</span><span>{BANK_INFO.accountType}</span>
            <span className="text-gray-500">口座番号</span><span>{BANK_INFO.accountNumber}</span>
            <span className="text-gray-500">口座名義</span><span>{BANK_INFO.accountHolder}</span>
          </div>
          <EditableDueDate
            billerId={customer.id}
            month={month}
            label={dueDateLabel(month, dueOverride, customer)}
            value={dueOverride}
            defaultValue={defaultDueDate(month, customer)}
          />
        </div>
      </div>
    </div>
  );
}

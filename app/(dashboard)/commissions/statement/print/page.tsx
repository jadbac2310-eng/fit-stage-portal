import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getCustomers } from "@/lib/customers";
import { getLessons } from "@/lib/lessons";
import { getTrialLessons } from "@/lib/trial-lessons";
import { getHourlyTasks } from "@/lib/hourly-tasks";
import { getCurrentMember, getMembers } from "@/lib/members";
import { getAllSessionPasses } from "@/lib/session-passes";
import { getAllCustomerPlans } from "@/lib/customer-plans";
import { getAllPlans, buildLessonFeeMap, getAllSessionPassPrices, buildSessionPassPriceMap } from "@/lib/plans-master";
import { getMemberCustomerRates } from "@/lib/commission-rates";
import { isBillableLessonStatus } from "@/lib/lessons-types";
import { type CommissionContext } from "@/lib/commissions";
import { buildTrainerStatements, type StatementLine, type HourlyStatementLine } from "@/lib/commission-statement";
import { ISSUER, monthLabel } from "@/lib/invoices";
import { StatementActions } from "./statement-actions";

export const dynamic = "force-dynamic";

function yen(n: number) {
  return `¥${n.toLocaleString("ja-JP")}`;
}

function statementNumber(month: string, memberId: string): string {
  return `PAY-${month.replace("-", "")}-${memberId.slice(0, 6).toUpperCase()}`;
}

function LineTable({ title, lines, total }: { title: string; lines: StatementLine[]; total: number }) {
  if (lines.length === 0) return null;
  return (
    <div className="mb-6">
      <p className="text-sm font-bold text-gray-700 mb-2">{title}</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-gray-300 text-gray-500">
            <th className="text-left py-2 font-medium w-28">日付</th>
            <th className="text-left py-2 font-medium">顧客</th>
            <th className="text-left py-2 font-medium">内容</th>
            <th className="text-right py-2 font-medium w-28">金額</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i} className="border-b border-gray-100">
              <td className="py-2 text-gray-500">{l.date}</td>
              <td className="py-2 text-gray-800">{l.customerName}</td>
              <td className="py-2 text-gray-600">{l.label}</td>
              <td className="py-2 text-right text-gray-800 tabular-nums">{yen(l.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="py-2 text-right text-sm font-bold text-gray-700">小計</td>
            <td className="py-2 text-right text-base font-bold text-gray-900 tabular-nums">{yen(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function HourlyLineTable({ lines, total }: { lines: HourlyStatementLine[]; total: number }) {
  if (lines.length === 0) return null;
  return (
    <div className="mb-6">
      <p className="text-sm font-bold text-gray-700 mb-2">業務</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-gray-300 text-gray-500">
            <th className="text-left py-2 font-medium w-28">日付</th>
            <th className="text-left py-2 font-medium">業務内容</th>
            <th className="text-right py-2 font-medium w-20">時間</th>
            <th className="text-right py-2 font-medium w-28">金額</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i} className="border-b border-gray-100">
              <td className="py-2 text-gray-500">{l.date}</td>
              <td className="py-2 text-gray-800">{l.title}</td>
              <td className="py-2 text-right text-gray-600 tabular-nums">{l.hours}h</td>
              <td className="py-2 text-right text-gray-800 tabular-nums">{yen(l.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="py-2 text-right text-sm font-bold text-gray-700">小計</td>
            <td className="py-2 text-right text-base font-bold text-gray-900 tabular-nums">{yen(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default async function CommissionStatementPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ member?: string; month?: string }>;
}) {
  const currentMember = await getCurrentMember();
  if (!currentMember?.isAdmin) notFound();

  const { member: memberId, month } = await searchParams;
  if (!memberId || !month) notFound();

  const [customers, lessons, trialLessons, hourlyTasks, sessionPasses, customerPlans, members, plansMaster, sessionPassPrices, allRates] = await Promise.all([
    getCustomers(),
    getLessons(),
    getTrialLessons(),
    getHourlyTasks(),
    getAllSessionPasses(),
    getAllCustomerPlans(),
    getMembers(),
    getAllPlans(),
    getAllSessionPassPrices(),
    getMemberCustomerRates(),
  ]);

  const trainer = members.find((m) => m.id === memberId);
  if (!trainer) notFound();

  const ctx: CommissionContext = {
    customers, sessionPasses, customerPlans,
    members: members.map((m) => ({ id: m.id, name: m.name })),
    trainerRates: allRates.map((r) => ({ memberId: r.memberId, customerId: r.customerId, rate: r.rate })),
    lessonFees: buildLessonFeeMap(plansMaster),
    sessionPassPriceMap: buildSessionPassPriceMap(sessionPassPrices),
  };

  const completedLessons = lessons.filter((l) => isBillableLessonStatus(l.status));
  const completedTrialLessons = trialLessons.filter((l) => l.status === "completed");
  const contractedTrialLessons = trialLessons.filter((l) => l.contracted === true);
  const statement = buildTrainerStatements(completedLessons, completedTrialLessons, contractedTrialLessons, hourlyTasks, month, ctx)
    .find((s) => s.memberId === memberId);

  const trainerLines = statement?.trainerLines ?? [];
  const salesLines = statement?.salesLines ?? [];
  const hourlyLines = statement?.hourlyLines ?? [];
  const total = statement?.total ?? 0;
  const stmtNo = statementNumber(month, memberId);
  const pdfHref = `/commissions/statement/print/pdf?member=${memberId}&month=${month}`;
  const pdfFilename = `コミッション明細_${trainer.name}_${month}.pdf`;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* 操作バー */}
      <div className="flex items-center justify-between mb-4">
        <Link href={`/commissions/statement?month=${month}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition">
          <ChevronLeft size={15} /> 一覧
        </Link>
        <StatementActions pdfHref={pdfHref} filename={pdfFilename} />
      </div>
      <p className="text-xs text-gray-400 mb-4">下はプレビューです。単価・歩合率は表示されません。「PDF」でダウンロード、「共有」でLINE等に送れます。</p>

      {/* 明細本体 */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-10 print:border-0 print:p-0 print:rounded-none">
        <h1 className="text-2xl font-bold text-center tracking-widest text-gray-900 mb-6">コミッション明細</h1>

        <div className="flex justify-between items-start gap-6 mb-8">
          {/* 宛先 */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 border-b border-gray-400 pb-1 inline-block">{trainer.name} 様</p>
            {trainer.invoiceNumber && <p className="text-xs text-gray-500 mt-2">登録番号: {trainer.invoiceNumber}</p>}
          </div>
          {/* 発行元 */}
          <div className="text-right text-xs text-gray-600 flex-shrink-0">
            <p className="text-sm font-bold text-gray-900">{ISSUER.name}</p>
            {ISSUER.contact && <p>担当: {ISSUER.contact}</p>}
            <p className="mt-0.5 whitespace-pre-wrap">{ISSUER.address}</p>
            <p>{ISSUER.tel}</p>
          </div>
        </div>

        <div className="flex justify-between text-xs text-gray-500 mb-4">
          <span>明細番号: {stmtNo}</span>
          <span>対象月: {monthLabel(month)}</span>
        </div>

        {/* 合計 */}
        <div className="bg-gray-50 print:bg-gray-100 rounded-xl px-5 py-4 mb-6 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-600">お支払い金額</span>
          <span className="text-2xl font-bold text-gray-900">{yen(total)}</span>
        </div>

        {/* レッスン担当分・営業分・業務（単価・歩合率は表示しない） */}
        <LineTable title="レッスン担当分" lines={trainerLines} total={statement?.trainerTotal ?? 0} />
        <LineTable title="営業分（レッスン歩合・成約ボーナス）" lines={salesLines} total={statement?.salesTotal ?? 0} />
        <HourlyLineTable lines={hourlyLines} total={statement?.hourlyTotal ?? 0} />

        {trainerLines.length === 0 && salesLines.length === 0 && hourlyLines.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">この月の対象レッスンはありません</p>
        )}
      </div>
    </div>
  );
}

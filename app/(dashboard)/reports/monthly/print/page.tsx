import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCustomers } from "@/lib/customers";
import { getLessons } from "@/lib/lessons";
import { getCurrentMember } from "@/lib/members";
import { getReportDeliveries } from "@/lib/report-deliveries";
import { ISSUER } from "@/lib/invoices";
import { buildMonthlyReport, monthLabel } from "@/lib/monthly-reports";
import { EXERCISE_TYPE_LABEL, formatSet } from "@/lib/exercise-types";
import { ReportActions } from "./report-actions";

export const dynamic = "force-dynamic";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const w = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()}(${w})`;
}

export default async function ReportPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string; month?: string }>;
}) {
  const member = await getCurrentMember();
  if (!member) {
    return <div className="p-10 text-center text-sm font-semibold text-gray-600">ログインが必要です</div>;
  }

  const { customer: customerId, month } = await searchParams;
  if (!customerId || !month) {
    return <div className="p-10 text-center text-sm font-semibold text-gray-600">パラメータが不正です</div>;
  }

  const [customers, lessons, deliveries] = await Promise.all([
    getCustomers(),
    getLessons(),
    getReportDeliveries(month),
  ]);
  const customer = customers.find((c) => c.id === customerId);
  if (!customer) {
    return <div className="p-10 text-center text-sm font-semibold text-gray-600">顧客が見つかりません</div>;
  }

  const report = buildMonthlyReport(customerId, customer.fullName, month, lessons);
  const sent = deliveries.some((d) => d.customerId === customerId && d.period === month);
  const pdfHref = `/reports/monthly/print/pdf?customer=${customerId}&month=${month}`;
  const filename = `トレーニングレポート_${customer.fullName}_${month}.pdf`;
  const { stats } = report;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto pb-16">
      <div className="flex items-center justify-between gap-3 mb-4">
        <Link href={`/reports/monthly?month=${month}`} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition">
          <ArrowLeft size={15} /> 月次レポート
        </Link>
      </div>

      {report.sessions.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🗂️</p>
          <p className="text-sm font-semibold text-gray-600">{monthLabel(month)}の記録がありません</p>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <ReportActions pdfHref={pdfHref} filename={filename} customerId={customerId} period={month} customerName={customer.fullName} sent={sent} />
          </div>

          {/* プレビュー（PDFと同じ構成） */}
          <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            {/* ヒーロー */}
            <div className="bg-slate-900 text-white px-6 py-6">
              <div className="flex items-center gap-1.5 mb-3">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-[11px] font-bold tracking-[0.2em] text-slate-300">{ISSUER.name.toUpperCase()}</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-wide leading-tight">
                TRAINING <span className="text-green-500">REPORT</span>
              </h2>
              <div className="flex items-end justify-between mt-2.5">
                <p className="text-lg font-bold">{customer.fullName} 様</p>
                <p className="text-xs text-slate-400">{monthLabel(month)}のトレーニング記録</p>
              </div>

              <div className="grid grid-cols-4 gap-2 mt-5">
                {[
                  { n: stats.sessionCount, u: "回", l: "レッスン" },
                  { n: stats.exerciseCount, u: "種目", l: "のべ種目数" },
                  { n: stats.totalSets, u: "set", l: "総セット数" },
                  { n: stats.totalVolumeKg.toLocaleString("ja-JP"), u: "kg", l: "総挙上量" },
                ].map((st, i) => (
                  <div key={i} className="bg-slate-800 rounded-xl py-3 px-1 text-center">
                    <p className="text-green-500 font-extrabold text-lg leading-none">
                      {st.n}<span className="text-[10px] text-slate-300 font-bold"> {st.u}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1.5">{st.l}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 本文 */}
            <div className="bg-white px-5 py-5">
              <p className="text-sm font-bold text-gray-900 mb-3">トレーニング内容</p>
              <div className="space-y-2.5">
                {report.sessions.map((sess, i) => (
                  <div key={i} className="border border-gray-200 rounded-xl p-3.5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-slate-900 text-white text-xs font-bold rounded-md px-2 py-1">{fmtDate(sess.date)}</span>
                      <span className="text-[11px] text-gray-400">
                        {sess.trainerName ? `担当 ${sess.trainerName}` : ""}
                        {sess.location ? `${sess.trainerName ? "　/　" : ""}${sess.location}` : ""}
                      </span>
                    </div>
                    {sess.exercises.map((ex, j) => (
                      <div key={j} className="flex gap-2 text-sm mb-1">
                        <span className="w-1/3 font-semibold text-gray-800 shrink-0">
                          {ex.name} <span className="text-[10px] text-green-700 font-bold">{EXERCISE_TYPE_LABEL[ex.type]}</span>
                        </span>
                        <span className="flex-1 text-gray-600 text-[13px]">{ex.sets.map((set) => formatSet(set) || "-").join("　/　")}</span>
                      </div>
                    ))}
                    {sess.impression && (
                      <div className="mt-2 bg-green-50 border-l-4 border-green-500 rounded px-3 py-2">
                        <p className="text-[10px] font-bold text-green-700 mb-0.5">トレーナーより</p>
                        <p className="text-[13px] text-green-800 whitespace-pre-wrap">{sess.impression}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="bg-gray-50 rounded-xl py-4 px-5 mt-4 text-center">
                <p className="text-sm font-bold text-gray-900">今月もお疲れさまでした！</p>
                <p className="text-xs text-gray-500 mt-1">積み重ねた{stats.sessionCount}回が、確実に力になっています。来月も一緒に頑張りましょう。</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

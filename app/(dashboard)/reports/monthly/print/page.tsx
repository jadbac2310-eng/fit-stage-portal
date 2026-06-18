import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCustomers } from "@/lib/customers";
import { getLessons } from "@/lib/lessons";
import { getCurrentMember } from "@/lib/members";
import { getReportDeliveries } from "@/lib/report-deliveries";
import { ISSUER } from "@/lib/invoices";
import { buildMonthlyReport, monthLabel } from "@/lib/monthly-reports";
import { EXERCISE_TYPE_LABEL, formatSet } from "@/lib/exercise-types";
import { FS_WORDMARK_PNG, FS_MONOGRAM_PNG } from "@/lib/fitstage-logo";
import { ReportActions } from "./report-actions";

export const dynamic = "force-dynamic";

const SERIF = "'Noto Serif JP','Cormorant Garamond',serif";

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
  const statItems = [
    { n: String(stats.sessionCount), u: "", l: "レッスン回数" },
    { n: String(stats.exerciseCount), u: "", l: "のべ種目数" },
    { n: String(stats.totalSets), u: "", l: "総セット数" },
    { n: stats.totalVolumeKg.toLocaleString("en-US"), u: "kg", l: "総挙上量" },
  ];

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto pb-16">
      {/* ブランドフォント（明朝） */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;700&family=Noto+Serif+JP:wght@400;600&display=swap" />

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

          {/* プレビュー（PDFと同じ構成・黒×金） */}
          <div
            className="rounded-2xl overflow-hidden border border-[#e7ddc6] shadow-sm px-6 md:px-9 py-8"
            style={{ backgroundColor: "#fbf9f3", fontFamily: SERIF }}
          >
            {/* ヘッダー */}
            <div className="flex flex-col items-center text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={FS_WORDMARK_PNG} alt="FIT STAGE" className="w-[170px]" />
              <span className="block w-12 h-[2px] bg-[#C9A84C] my-3" />
              <h2 className="text-[#0a0a0a] font-bold tracking-[0.25em] text-3xl" style={{ fontFamily: "'Cormorant Garamond',serif" }}>
                TRAINING REPORT
              </h2>
              <p className="text-[13px] tracking-[0.4em] text-[#a8883a] mt-2">月間トレーニング記録</p>
            </div>

            {/* 宛名・対象月 */}
            <div className="flex items-end justify-between border-b border-[#e7ddc6] pb-3 mt-7 mb-5">
              <p className="text-2xl font-bold text-[#1a1a1a]">{customer.fullName} 様</p>
              <p className="text-base text-[#a8883a]">{monthLabel(month)} の記録</p>
            </div>

            {/* 統計（黒×金） */}
            <div className="grid grid-cols-4 rounded-xl bg-[#0a0a0a] py-5">
              {statItems.map((st, i) => (
                <div key={i} className={`text-center ${i > 0 ? "border-l border-[#2a2a2a]" : ""}`}>
                  <p className="text-[#C9A84C] font-bold text-2xl md:text-3xl leading-none">
                    {st.n}<span className="text-sm text-[#f1e7cf] font-normal"> {st.u}</span>
                  </p>
                  <p className="text-[11px] tracking-[0.12em] text-[#cdc4ad] mt-2">{st.l}</p>
                </div>
              ))}
            </div>

            {/* 本文 */}
            <div className="flex items-center gap-2 mt-7 mb-4">
              <span className="w-[3.5px] h-4 bg-[#C9A84C]" />
              <p className="text-lg font-bold text-[#1a1a1a] tracking-wider">トレーニング内容</p>
            </div>

            <div className="space-y-3">
              {report.sessions.map((sess, i) => (
                <div key={i} className="border border-[#e7ddc6] rounded-xl p-4 bg-white">
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="bg-[#0a0a0a] text-[#C9A84C] text-sm font-bold rounded px-3 py-1 tracking-wide">{fmtDate(sess.date)}</span>
                    <span className="text-[13px] text-[#6b6256]">
                      {sess.trainerName ? `担当 ${sess.trainerName}` : ""}
                      {sess.location ? `${sess.trainerName ? "　/　" : ""}${sess.location}` : ""}
                    </span>
                  </div>
                  {sess.exercises.map((ex, j) => (
                    <div key={j} className="flex gap-2 mb-1.5 items-baseline">
                      <span className="w-[38%] font-bold text-[#1a1a1a] shrink-0 text-[15px]">
                        {ex.name} <span className="text-[11px] text-[#a8883a] font-normal">{EXERCISE_TYPE_LABEL[ex.type]}</span>
                      </span>
                      <span className="flex-1 text-[#4b463c] text-[15px]">{ex.sets.map((set) => formatSet(set) || "-").join("　/　")}</span>
                    </div>
                  ))}
                  {sess.impression && (
                    <div className="mt-3 bg-[#faf5e8] border-l-[3px] border-[#C9A84C] rounded px-4 py-3">
                      <p className="text-[12px] font-bold text-[#a8883a] tracking-[0.1em] mb-1">トレーナーより</p>
                      <p className="text-[15px] text-[#5a4f33] whitespace-pre-wrap leading-relaxed">{sess.impression}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 応援メッセージ */}
            <div className="border border-[#C9A84C] bg-[#fcf8ee] rounded-xl py-5 px-5 mt-5 text-center">
              <p className="text-lg font-bold text-[#0a0a0a]">今月もお疲れさまでした</p>
              <p className="text-sm text-[#6b6256] mt-1.5">積み重ねた{stats.sessionCount}回が、確実に力になっています。来月も一緒に頑張りましょう。</p>
            </div>

            {/* フッター */}
            <div className="h-px bg-[#C9A84C] mt-7 mb-3" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={FS_MONOGRAM_PNG} alt="" className="w-5 h-5" />
                <span className="text-base font-bold text-[#1a1a1a] tracking-wider">{ISSUER.name}</span>
              </div>
              <span className="text-[12px] text-[#6b6256]">{ISSUER.tel}　{ISSUER.email}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

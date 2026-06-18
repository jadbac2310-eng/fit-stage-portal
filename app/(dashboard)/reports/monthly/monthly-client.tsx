"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, ChevronRight, Sparkles, Dumbbell, CheckCircle2, Send, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { deliveryKey } from "@/lib/report-deliveries-types";
import { monthLabel, type MonthlyReport } from "@/lib/monthly-reports";
import { markReportSentAction, unmarkReportSentAction } from "./actions";

function shiftPeriod(period: string, delta: number): string {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function SentToggle({ report, period, sent }: { report: MonthlyReport; period: string; sent: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function toggle() {
    start(async () => {
      if (sent) await unmarkReportSentAction(report.customerId, period);
      else await markReportSentAction(report.customerId, period, report.customerName);
      router.refresh();
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition border disabled:opacity-50",
        sent
          ? "text-green-700 bg-green-50 border-green-200 hover:bg-green-100"
          : "text-gray-500 bg-white border-gray-200 hover:border-gray-300"
      )}
    >
      {sent ? <><CheckCircle2 size={13} /> 送付済み</> : <><Send size={13} /> 未送付</>}
    </button>
  );
}

export function MonthlyReportsClient({ period, reports, sentKeys }: {
  period: string;
  reports: MonthlyReport[];
  sentKeys: string[];
}) {
  const [search, setSearch] = useState("");
  const sentSet = new Set(sentKeys);
  const filtered = reports.filter((r) => !search || r.customerName.includes(search.trim()));
  const sentCount = reports.filter((r) => sentSet.has(deliveryKey(r.customerId, period))).length;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto pb-10">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Sparkles size={20} className="text-green-600" />
          <h1 className="text-xl font-bold text-gray-900">月次レポート</h1>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">
          月ごとのトレーニング成果をまとめてお客さまへ送付できます
        </p>
      </div>

      {/* 月切り替え */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-200 px-3 py-2 mb-4">
        <Link href={`/reports/monthly?month=${shiftPeriod(period, -1)}`}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition">
          <ChevronLeft size={18} />
        </Link>
        <div className="text-center">
          <p className="text-sm font-bold text-gray-900">{monthLabel(period)}</p>
          <p className="text-[11px] text-gray-400">{reports.length}名 ・ 送付済み {sentCount}名</p>
        </div>
        <Link href={`/reports/monthly?month=${shiftPeriod(period, 1)}`}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition">
          <ChevronRight size={18} />
        </Link>
      </div>

      <div className="mb-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="顧客名で検索..."
          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🗂️</p>
          <p className="text-sm font-semibold text-gray-600">{monthLabel(period)}のレポートはありません</p>
          <p className="text-xs text-gray-400 mt-1">レッスンの記録があると、ここに表示されます</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const sent = sentSet.has(deliveryKey(r.customerId, period));
            return (
              <div key={r.customerId} className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{r.customerName}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1"><Dumbbell size={11} className="text-green-600" />{r.stats.sessionCount}回</span>
                      <span>{r.stats.exerciseCount}種目</span>
                      {r.stats.totalVolumeKg > 0 && <span>総挙上量 {r.stats.totalVolumeKg.toLocaleString("ja-JP")}kg</span>}
                    </div>
                  </div>
                  <SentToggle report={r} period={period} sent={sent} />
                </div>
                <Link
                  href={`/reports/monthly/print?customer=${r.customerId}&month=${period}`}
                  className="mt-3 flex items-center justify-center gap-1.5 w-full bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold py-2.5 rounded-xl transition"
                >
                  レポートを開く・送る <ArrowRight size={15} />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Receipt, ChevronRight, AlertTriangle } from "lucide-react";
import type { TrainerStatement } from "@/lib/commission-statement";

/** 「予定」のまま残っている業務の件数・金額（支払い前の確認用） */
export interface PendingHourly {
  count: number;
  total: number;
  names: string[];
}

function yen(n: number) {
  return `¥${n.toLocaleString("ja-JP")}`;
}

function monthOptions(): { value: string; label: string }[] {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    opts.push({ value, label: `${d.getFullYear()}年${d.getMonth() + 1}月` });
  }
  return opts;
}

export function StatementClient({ statements, month, pendingHourly }: { statements: TrainerStatement[]; month: string; pendingHourly?: PendingHourly }) {
  const router = useRouter();
  const options = useMemo(() => monthOptions(), []);
  const grandTotal = statements.reduce((s, e) => s + e.total, 0);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Receipt size={20} className="text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">コミッション明細</h1>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">トレーナーごとに月次のお支払い明細を発行します（単価・歩合率は表示されません）</p>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <label className="text-sm font-semibold text-gray-600">対象月</label>
        <select
          value={month}
          onChange={(e) => router.push(`/commissions/statement?month=${e.target.value}`)}
          className="px-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="text-sm text-gray-500 ml-auto">
          {statements.length}名 ・ 合計 <span className="font-bold text-gray-800">{yen(grandTotal)}</span>
        </span>
      </div>

      {/* 完了にし忘れた業務があると、その分だけ支払いが少なくなってしまうので先に知らせる */}
      {pendingHourly && pendingHourly.count > 0 && (
        <div className="mb-5 rounded-2xl bg-amber-50 border border-amber-200 p-4">
          <p className="text-sm font-bold text-amber-800 flex items-center gap-1.5">
            <AlertTriangle size={15} /> まだ「予定」のままの業務があります
          </p>
          <p className="text-xs text-amber-700 mt-1.5 leading-relaxed">
            {pendingHourly.count}件・{yen(pendingHourly.total)}（{pendingHourly.names.join("、")}）。
            この分は明細に含まれていません。実施済みであれば、スケジュールで「完了」にしてからもう一度ご確認ください。
          </p>
          <Link href="/schedule" className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 underline mt-2">
            スケジュールを開く <ChevronRight size={12} />
          </Link>
        </div>
      )}

      {statements.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🧾</p>
          <p className="text-sm font-semibold text-gray-600">この月の対象レッスンはありません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {statements.map((e) => {
            const parts = [
              e.trainerLines.length > 0 && "レッスン",
              e.salesLines.length > 0 && "営業",
              e.hourlyLines.length > 0 && "業務",
            ].filter((v): v is string => !!v);
            return (
            <Link
              key={e.memberId}
              href={`/commissions/statement/print?member=${e.memberId}&month=${month}`}
              className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition group"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText size={18} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{e.memberName}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {e.trainerLines.length + e.salesLines.length + e.hourlyLines.length}件
                  {parts.length > 1 && `（${parts.join("＋")}）`}
                </p>
              </div>
              <p className="text-base font-bold text-gray-800">{yen(e.total)}</p>
              <ChevronRight size={16} className="text-gray-400 group-hover:text-blue-500 transition flex-shrink-0" />
            </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Line, ComposedChart,
} from "recharts";
import { TrendingUp, Users, Briefcase, Wallet, LineChart } from "lucide-react";
import type { Customer } from "@/lib/customers-types";
import type { Lesson } from "@/lib/lessons-types";
import type { TrialLesson } from "@/lib/trial-lessons-types";
import type { SessionPass } from "@/lib/session-passes-types";
import type { CustomerPlanRecord } from "@/lib/customer-plans-types";
import {
  buildTrainerEntries, buildSalesEntries, resolveLessonFee, isoToMonth,
  type CommissionContext,
} from "@/lib/commissions";
import { cn } from "@/lib/cn";

function yen(n: number): string {
  return `¥${Math.round(n).toLocaleString("ja-JP")}`;
}

function getMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: `${d.getFullYear()}年${d.getMonth() + 1}月`,
    });
  }
  return options;
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

interface MonthFigures {
  month:        string;
  revenue:      number;
  trainerPayout: number;
  salesPayout:  number;
  profit:       number;
}

function computeMonth(
  month: string,
  lessons: Lesson[],
  trialLessons: TrialLesson[],
  ctx: CommissionContext,
): MonthFigures {
  const revenue = lessons
    .filter((l) => isoToMonth(l.scheduledAt) === month)
    .reduce((s, l) => s + resolveLessonFee(l, ctx), 0);
  const trainerPayout = buildTrainerEntries(lessons, month, ctx).reduce((s, e) => s + e.total, 0);
  const salesPayout = buildSalesEntries(lessons, trialLessons, month, ctx).reduce((s, e) => s + e.total, 0);
  return { month, revenue, trainerPayout, salesPayout, profit: revenue - trainerPayout - salesPayout };
}

function KpiCard({
  icon, label, value, accent, sub,
}: {
  icon: React.ReactNode; label: string; value: number; accent: string; sub?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <p className={cn("text-xs font-semibold flex items-center gap-1.5 mb-1", accent)}>
        {icon} {label}
      </p>
      <p className="text-xl font-bold text-gray-900 tabular-nums">{yen(value)}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export function RevenueDashboardClient({
  customers, lessons, trialLessons, sessionPasses, customerPlans, lessonFees, sessionPassPriceMap, members,
}: {
  customers:     Customer[];
  lessons:       Lesson[];
  trialLessons:  TrialLesson[];
  sessionPasses: SessionPass[];
  customerPlans: CustomerPlanRecord[];
  lessonFees?:   Record<string, number>;
  sessionPassPriceMap?: Record<number, Record<number, number>>;
  members:       { id: string; name: string }[];
}) {
  const monthOptions = useMemo(() => getMonthOptions(), []);
  const [month, setMonth] = useState(currentMonth);

  const ctx = useMemo((): CommissionContext => (
    { customers, sessionPasses, customerPlans, members, lessonFees, sessionPassPriceMap }
  ), [customers, sessionPasses, customerPlans, members, lessonFees, sessionPassPriceMap]);

  // 直近12か月（古い→新しい）
  const series = useMemo(() => {
    const months = [...monthOptions].reverse();
    return months.map((o) => {
      const f = computeMonth(o.value, lessons, trialLessons, ctx);
      const [, m] = o.value.split("-");
      return { ...f, label: `${Number(m)}月` };
    });
  }, [monthOptions, lessons, trialLessons, ctx]);

  const cur = useMemo(() => computeMonth(month, lessons, trialLessons, ctx), [month, lessons, trialLessons, ctx]);

  const margin = cur.revenue > 0 ? Math.round((cur.profit / cur.revenue) * 100) : 0;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto pb-10">
      {/* ヘッダー */}
      <div className="mb-5">
        <div className="flex items-center gap-2">
          <LineChart size={20} className="text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">経営ダッシュボード</h1>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">全体の売上・支払・利益（管理者のみ）</p>
      </div>

      {/* 月選択 */}
      <div className="flex items-center gap-3 mb-5">
        <label className="text-sm font-semibold text-gray-600">対象月</label>
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="px-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {monthOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* KPI カード */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <KpiCard icon={<TrendingUp size={12} />} label="売上" value={cur.revenue} accent="text-blue-600" sub="完了レッスン単価の合計" />
        <KpiCard icon={<Users size={12} />} label="トレーナー支払" value={cur.trainerPayout} accent="text-indigo-600" sub="歩合 50%" />
        <KpiCard icon={<Briefcase size={12} />} label="営業支払" value={cur.salesPayout} accent="text-amber-600" sub="歩合＋成約ボーナス" />
        <div className="bg-gradient-to-br from-green-600 to-green-500 rounded-2xl p-4 text-white shadow-sm shadow-green-200">
          <p className="text-xs font-semibold flex items-center gap-1.5 mb-1 text-green-50">
            <Wallet size={12} /> 利益
          </p>
          <p className="text-xl font-bold tabular-nums">{yen(cur.profit)}</p>
          <p className="text-[11px] text-green-100 mt-0.5">利益率 {margin}%</p>
        </div>
      </div>

      {/* 内訳メモ */}
      <p className="text-[11px] text-gray-400 mb-6 px-1">
        利益 = 売上 − トレーナー支払 − 営業支払
      </p>

      {/* 12か月トレンド: 売上/支払の積み上げ＋利益ライン */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
        <p className="text-sm font-bold text-gray-700 mb-3">直近12か月の推移</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={series} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false}
                tickFormatter={(v: number) => v >= 10000 ? `${Math.round(v / 10000)}万` : `${v}`} />
              <Tooltip
                formatter={(v, name) => [yen(Number(v)), name as string]}
                labelStyle={{ fontSize: 12, fontWeight: 600 }}
                contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid #e5e7eb" }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="trainerPayout" name="トレーナー支払" stackId="pay" fill="#818cf8" radius={[0, 0, 0, 0]} />
              <Bar dataKey="salesPayout" name="営業支払" stackId="pay" fill="#fbbf24" radius={[0, 0, 0, 0]} />
              <Bar dataKey="profit" name="利益" stackId="pay" fill="#34d399" radius={[3, 3, 0, 0]} />
              <Line type="monotone" dataKey="revenue" name="売上" stroke="#2563eb" strokeWidth={2} dot={{ r: 2 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[11px] text-gray-400 mt-2 text-center">
          積み上げ棒（支払＋利益）＝売上。折れ線は売上。
        </p>
      </div>

      {/* 月別テーブル */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 overflow-x-auto">
        <p className="text-sm font-bold text-gray-700 mb-3">月別明細</p>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-400 border-b border-gray-100">
              <th className="text-left py-1.5 pr-3 font-medium">月</th>
              <th className="text-right py-1.5 pr-3 font-medium">売上</th>
              <th className="text-right py-1.5 pr-3 font-medium">ﾄﾚｰﾅｰ</th>
              <th className="text-right py-1.5 pr-3 font-medium">営業</th>
              <th className="text-right py-1.5 font-medium">利益</th>
            </tr>
          </thead>
          <tbody>
            {[...series].reverse().map((m) => (
              <tr key={m.month} className={cn(
                "border-b border-gray-50 last:border-0",
                m.month === month && "bg-blue-50/50"
              )}>
                <td className="py-1.5 pr-3 text-gray-700">{m.label}</td>
                <td className="py-1.5 pr-3 text-right text-gray-700 tabular-nums">{yen(m.revenue)}</td>
                <td className="py-1.5 pr-3 text-right text-indigo-600 tabular-nums">{yen(m.trainerPayout)}</td>
                <td className="py-1.5 pr-3 text-right text-amber-600 tabular-nums">{yen(m.salesPayout)}</td>
                <td className="py-1.5 text-right font-semibold text-green-600 tabular-nums">{yen(m.profit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

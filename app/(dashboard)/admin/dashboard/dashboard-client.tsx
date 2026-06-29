"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Line, ComposedChart,
} from "recharts";
import { TrendingUp, Users, Briefcase, Wallet, LineChart, MonitorSmartphone, Smartphone, Monitor, Tablet, UserPlus, Award, Building2 } from "lucide-react";
import type { Customer } from "@/lib/customers-types";
import type { PageViewRow, TrafficSourceRow, DeviceRow, DailyPageViewRow } from "@/lib/analytics";
import { DailyTrendChart, TrafficPieChart, PopularPagesChart } from "../../dashboard/analytics-charts";
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
  rentalCost:   number;
  profit:       number;
}

function computeMonth(
  month: string,
  lessons: Lesson[],
  trialLessons: TrialLesson[],
  ctx: CommissionContext,
): MonthFigures {
  const inMonth = lessons.filter((l) => isoToMonth(l.scheduledAt) === month);
  const revenue = inMonth.reduce((s, l) => s + resolveLessonFee(l, ctx), 0);
  const rentalCost = inMonth.reduce((s, l) => s + (l.rentalGymFee ?? 0) + (l.storeFee ?? 0), 0);
  const trainerPayout = buildTrainerEntries(lessons, month, ctx).reduce((s, e) => s + e.total, 0);
  const salesPayout = buildSalesEntries(lessons, trialLessons, month, ctx).reduce((s, e) => s + e.total, 0);
  return { month, revenue, trainerPayout, salesPayout, rentalCost, profit: revenue - trainerPayout - salesPayout - rentalCost };
}

interface AnalyticsData {
  popularPages:    PageViewRow[];
  trafficSources:  TrafficSourceRow[];
  deviceBreakdown: DeviceRow[];
  dailyPageViews:  DailyPageViewRow[];
  analyticsError:  string | null;
}

const DEVICE_META: Record<string, { label: string; Icon: React.ComponentType<{ size: number; className: string }> }> = {
  mobile:  { label: "スマートフォン", Icon: Smartphone },
  desktop: { label: "デスクトップ",   Icon: Monitor },
  tablet:  { label: "タブレット",     Icon: Tablet },
};

function SiteAnalytics({ data }: { data: AnalyticsData }) {
  const { popularPages, trafficSources, deviceBreakdown, dailyPageViews, analyticsError } = data;
  const deviceTotal = deviceBreakdown.reduce((sum, d) => sum + d.sessions, 0);
  const hasData = dailyPageViews.length > 0 || trafficSources.length > 0 || popularPages.length > 0;

  if (!analyticsError && !hasData) return null;

  return (
    <div className="mt-6">
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
        サイト分析 <span className="normal-case font-normal text-gray-300">（過去28日間）</span>
      </h2>

      {analyticsError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
          <p className="text-xs font-bold text-red-600 mb-2">GA4 エラー</p>
          <pre className="text-xs text-red-500 whitespace-pre-wrap break-all">{analyticsError}</pre>
        </div>
      )}

      {dailyPageViews.length > 0 && <DailyTrendChart data={dailyPageViews} />}
      {trafficSources.length > 0 && <TrafficPieChart data={trafficSources} />}
      {popularPages.length > 0 && <PopularPagesChart data={popularPages} />}

      {deviceBreakdown.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <MonitorSmartphone size={14} className="text-gray-400" />
            <p className="text-xs font-bold text-gray-500">デバイス別</p>
          </div>
          <div className="space-y-2.5">
            {deviceBreakdown.map((d) => {
              const meta = DEVICE_META[d.device];
              const pct  = deviceTotal > 0 ? Math.round((d.sessions / deviceTotal) * 100) : 0;
              const Icon = meta?.Icon;
              return (
                <div key={d.device}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1 text-xs text-gray-600">
                      {Icon && <Icon size={11} className="text-gray-400 flex-shrink-0" />}
                      {meta?.label ?? d.device}
                    </span>
                    <span className="text-xs font-semibold text-gray-500">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
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
  customers, lessons, trialLessons, sessionPasses, customerPlans, lessonFees, sessionPassPriceMap, members, analytics,
}: {
  customers:     Customer[];
  lessons:       Lesson[];
  trialLessons:  TrialLesson[];
  sessionPasses: SessionPass[];
  customerPlans: CustomerPlanRecord[];
  lessonFees?:   Record<string, number>;
  sessionPassPriceMap?: Record<number, Record<number, number>>;
  members:       { id: string; name: string; commissionRate?: number }[];
  analytics?:    AnalyticsData;
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

  // 今月の実績（全体）
  const biz = useMemo(() => {
    const newCustomers = customers.filter((c) => isoToMonth(c.createdAt) === month).length;
    const activeCustomers = customers.filter((c) => c.status === "active").length;
    const contracted = trialLessons.filter((t) => isoToMonth(t.scheduledAt) === month).length;
    return { newCustomers, activeCustomers, contracted };
  }, [customers, trialLessons, month]);

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
        <KpiCard icon={<Users size={12} />} label="トレーナー支払" value={cur.trainerPayout} accent="text-indigo-600" sub="歩合 50%（レッスン料金の半分）" />
        <KpiCard icon={<Briefcase size={12} />} label="営業支払" value={cur.salesPayout} accent="text-amber-600" sub="歩合＋成約ボーナス" />
        <KpiCard icon={<Building2 size={12} />} label="場所利用料" value={cur.rentalCost} accent="text-rose-600" sub="レンタルジム・店舗の利用料" />
      </div>
      <div className="bg-gradient-to-br from-green-600 to-green-500 rounded-2xl p-4 text-white shadow-sm shadow-green-200 mb-3">
        <p className="text-xs font-semibold flex items-center gap-1.5 mb-1 text-green-50">
          <Wallet size={12} /> 利益
        </p>
        <p className="text-2xl font-bold tabular-nums">{yen(cur.profit)}</p>
        <p className="text-[11px] text-green-100 mt-0.5">利益率 {margin}%</p>
      </div>

      {/* 内訳メモ */}
      <p className="text-[11px] text-gray-400 mb-4 px-1">
        利益 = 売上 − トレーナー支払 − 営業支払 − 場所利用料
      </p>

      {/* 今月の実績（全体） */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5 mb-1">
            <UserPlus size={12} className="text-gray-400" /> 新規顧客
          </p>
          <p className="text-xl font-bold text-gray-900">{biz.newCustomers}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">在籍中 {biz.activeCustomers}名</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5 mb-1">
            <Award size={12} className="text-green-500" /> 成約
          </p>
          <p className="text-xl font-bold text-gray-900">{biz.contracted}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">体験からの成約数</p>
        </div>
      </div>

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
              <Bar dataKey="rentalCost" name="場所利用料" stackId="pay" fill="#fb7185" radius={[0, 0, 0, 0]} />
              <Bar dataKey="profit" name="利益" stackId="pay" fill="#34d399" radius={[3, 3, 0, 0]} />
              <Line type="monotone" dataKey="revenue" name="売上" stroke="#2563eb" strokeWidth={2} dot={{ r: 2 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[11px] text-gray-400 mt-2 text-center">
          積み上げ棒（支払＋ジム代＋利益）＝売上。折れ線は売上。
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
              <th className="text-right py-1.5 pr-3 font-medium">ｼﾞﾑ代</th>
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
                <td className="py-1.5 pr-3 text-right text-rose-600 tabular-nums">{yen(m.rentalCost)}</td>
                <td className="py-1.5 text-right font-semibold text-green-600 tabular-nums">{yen(m.profit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* サイト分析（GA4） */}
      {analytics && <SiteAnalytics data={analytics} />}
    </div>
  );
}

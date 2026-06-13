import {
  MonitorSmartphone,
  Smartphone, Monitor, Tablet,
  Dumbbell, Users, TrendingUp, Award,
} from "lucide-react";
import { getCurrentMember, getMembers } from "@/lib/members";
import { getLessons } from "@/lib/lessons";
import { getTrialLessons } from "@/lib/trial-lessons";
import { getCustomers } from "@/lib/customers";
import { getAllSessionPasses } from "@/lib/session-passes";
import { getAllCustomerPlans } from "@/lib/customer-plans";
import { buildTrainerEntries, buildSalesEntries, resolveLessonFee, type CommissionContext } from "@/lib/commissions";
import {
  getPopularPages,
  getTrafficSources,
  getDeviceBreakdown,
  getDailyPageViews,
  getAnalyticsDiagnostic,
} from "@/lib/analytics";
import {
  DailyTrendChart,
  TrafficPieChart,
  PopularPagesChart,
} from "./analytics-charts";

export const dynamic = "force-dynamic";

function thisMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
function isoToMonth(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function yen(n: number) {
  return `¥${n.toLocaleString("ja-JP")}`;
}

const DEVICE_META: Record<string, { label: string; Icon: React.ComponentType<{ size: number; className: string }> }> = {
  mobile:  { label: "スマートフォン", Icon: Smartphone },
  desktop: { label: "デスクトップ",   Icon: Monitor },
  tablet:  { label: "タブレット",     Icon: Tablet },
};

export default async function DashboardPage() {
  const [
    currentMember,
    lessons,
    trialLessons,
    customers,
    popularPages,
    trafficSources,
    deviceBreakdown,
    dailyPageViews,
    analyticsError,
  ] =
    await Promise.all([
      getCurrentMember(),
      getLessons(),
      getTrialLessons(),
      getCustomers(),
      getPopularPages(28, 5),
      getTrafficSources(28, 6),
      getDeviceBreakdown(28),
      getDailyPageViews(28),
      getAnalyticsDiagnostic(),
    ]);

  const [sessionPasses, customerPlans, members] = await Promise.all([
    getAllSessionPasses(),
    getAllCustomerPlans(),
    getMembers(),
  ]);
  const ctx: CommissionContext = {
    customers, sessionPasses, customerPlans,
    members: members.map((m) => ({ id: m.id, name: m.name })),
  };

  const deviceTotal       = deviceBreakdown.reduce((sum, d) => sum + d.sessions, 0);

  // ─── 今月サマリー ──────────────────────────────────────
  const mon = thisMonth();

  const completedThisMonth = lessons.filter(
    (l) => l.status === "completed" && isoToMonth(l.scheduledAt) === mon
  );
  const scheduledThisMonth = lessons.filter(
    (l) => l.status === "scheduled" && isoToMonth(l.scheduledAt) === mon
  );
  const salesThisMonth = completedThisMonth.reduce(
    (sum, l) => sum + resolveLessonFee(l, ctx), 0
  );
  const newCustomersThisMonth = customers.filter(
    (c) => isoToMonth(c.createdAt) === mon
  ).length;
  const contractedThisMonth = trialLessons.filter(
    (tl) => tl.contracted === true && isoToMonth(tl.scheduledAt) === mon
  ).length;
  const activeCustomers = customers.filter((c) => c.status === "active").length;

  // 全体売上は管理者のみ。担当者には自分の今月の歩合（見込み）を表示する
  const isAdmin = currentMember?.isAdmin ?? false;
  const contractedTrials = trialLessons.filter((tl) => tl.contracted === true);
  const myTrainerCommission = buildTrainerEntries(completedThisMonth, mon, ctx)
    .find((e) => e.memberId === currentMember?.id)?.total ?? 0;
  const mySalesCommission = buildSalesEntries(completedThisMonth, contractedTrials, mon, ctx)
    .find((e) => e.memberId === currentMember?.id)?.total ?? 0;
  const myCommissionThisMonth = myTrainerCommission + mySalesCommission;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6 hidden md:block">
        <h1 className="text-xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="text-sm text-gray-500 mt-0.5">FIT STAGE ポータル</p>
      </div>

      {/* 今月サマリー */}
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
        今月のサマリー
      </h2>
      <div className="grid grid-cols-2 gap-3 mb-3">
        {isAdmin ? (
          <div className="bg-blue-50 rounded-2xl border border-blue-100 p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp size={13} className="text-blue-500" />
              <p className="text-xs font-semibold text-blue-600">今月の全体売上</p>
            </div>
            <p className="text-2xl font-bold text-blue-700">{yen(salesThisMonth)}</p>
            <p className="text-xs text-blue-400 mt-0.5">完了レッスン {completedThisMonth.length}件</p>
          </div>
        ) : (
          <div className="bg-blue-50 rounded-2xl border border-blue-100 p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp size={13} className="text-blue-500" />
              <p className="text-xs font-semibold text-blue-600">今月の自分の歩合</p>
            </div>
            <p className="text-2xl font-bold text-blue-700">{yen(myCommissionThisMonth)}</p>
            <p className="text-xs text-blue-400 mt-0.5">見込み・歩合管理で内訳を確認</p>
          </div>
        )}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <Dumbbell size={13} className="text-gray-400" />
            <p className="text-xs font-semibold text-gray-500">レッスン</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{completedThisMonth.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">予定 {scheduledThisMonth.length}件</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <Users size={13} className="text-gray-400" />
            <p className="text-xs font-semibold text-gray-500">新規顧客</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{newCustomersThisMonth}</p>
          <p className="text-xs text-gray-400 mt-0.5">在籍中 {activeCustomers}名</p>
        </div>
        <div className="bg-green-50 rounded-2xl border border-green-100 p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <Award size={13} className="text-green-500" />
            <p className="text-xs font-semibold text-green-600">今月の成約</p>
          </div>
          <p className="text-2xl font-bold text-green-700">{contractedThisMonth}</p>
          <p className="text-xs text-green-400 mt-0.5">件</p>
        </div>
      </div>

      {/* Google Analytics */}
      {analyticsError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
          <p className="text-xs font-bold text-red-600 mb-2">GA4 エラー</p>
          <pre className="text-xs text-red-500 whitespace-pre-wrap break-all">{analyticsError}</pre>
        </div>
      )}

      {(dailyPageViews.length > 0 ||
        trafficSources.length > 0 ||
        popularPages.length > 0) && (
        <>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            サイト分析 <span className="normal-case font-normal text-gray-300">（過去28日間）</span>
          </h2>

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
        </>
      )}
    </div>
  );
}

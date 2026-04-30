import {
  MonitorSmartphone,
  Smartphone, Monitor, Tablet,
} from "lucide-react";
import { getTodos } from "@/lib/todos";
import { getCurrentMember } from "@/lib/members";
import {
  getPopularPages,
  getTrafficSources,
  getDeviceBreakdown,
  getRealtimeUsers,
  getDailyPageViews,
  getAnalyticsDiagnostic,
} from "@/lib/analytics";
import { DailyTrendChart, TrafficPieChart, PopularPagesChart } from "./analytics-charts";

export const dynamic = "force-dynamic";

const DEVICE_META: Record<string, { label: string; Icon: React.ComponentType<{ size: number; className: string }> }> = {
  mobile:  { label: "スマートフォン", Icon: Smartphone },
  desktop: { label: "デスクトップ",   Icon: Monitor },
  tablet:  { label: "タブレット",     Icon: Tablet },
};

export default async function DashboardPage() {
  const [todos, currentMember, popularPages, trafficSources, deviceBreakdown, realtimeUsers, dailyPageViews, analyticsError] =
    await Promise.all([
      getTodos(),
      getCurrentMember(),
      getPopularPages(28, 5),
      getTrafficSources(28, 6),
      getDeviceBreakdown(28),
      getRealtimeUsers(),
      getDailyPageViews(28),
      getAnalyticsDiagnostic(),
    ]);

  const myPendingCount    = todos.filter((t) => !t.completed && t.assignedTo?.id === currentMember?.id).length;
  const totalPendingCount = todos.filter((t) => !t.completed).length;
  const deviceTotal       = deviceBreakdown.reduce((sum, d) => sum + d.sessions, 0);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6 hidden md:block">
        <h1 className="text-xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="text-sm text-gray-500 mt-0.5">FIT STAGE ポータル</p>
      </div>

      {/* タスク概要 */}
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
        タスク
      </h2>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 mb-1">自分の未対応</p>
          <p className="text-3xl font-bold text-gray-900">{myPendingCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 mb-1">全体の未対応</p>
          <p className="text-3xl font-bold text-amber-500">{totalPendingCount}</p>
        </div>
      </div>

      {/* Google Analytics */}
      {analyticsError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
          <p className="text-xs font-bold text-red-600 mb-2">GA4 エラー</p>
          <pre className="text-xs text-red-500 whitespace-pre-wrap break-all">{analyticsError}</pre>
        </div>
      )}

      {(dailyPageViews.length > 0 || trafficSources.length > 0 || popularPages.length > 0) && (
        <>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              サイト分析 <span className="normal-case font-normal text-gray-300">（過去28日間）</span>
            </h2>
            {realtimeUsers > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>
                現在 {realtimeUsers} 人が閲覧中
              </span>
            )}
          </div>

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

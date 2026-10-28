"use client";

import { MonitorSmartphone, Smartphone, Monitor, Tablet } from "lucide-react";
import type { PageViewRow, TrafficSourceRow, DeviceRow, DailyPageViewRow } from "@/lib/analytics";
import { DailyTrendChart, TrafficPieChart, PopularPagesChart } from "./analytics-charts";

/**
 * サイト分析（GA4）。もとは管理者機能の売上画面の下にあったが、
 * HPの数字はサーチコンソールと同じ SEO の画面に集めた（2026-10-28）。
 * サーチコンソールが「検索に出た回数」、こちらは「実際にサイトに来た人」。
 */
export interface AnalyticsData {
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

export function SiteAnalytics({ data, days }: { data: AnalyticsData; days: number }) {
  const { popularPages, trafficSources, deviceBreakdown, dailyPageViews, analyticsError } = data;
  const deviceTotal = deviceBreakdown.reduce((sum, d) => sum + d.sessions, 0);
  const hasData = dailyPageViews.length > 0 || trafficSources.length > 0 || popularPages.length > 0;

  if (!analyticsError && !hasData) return null;

  return (
    <div className="mt-6">
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
        サイト分析 <span className="normal-case font-normal text-gray-300">（過去{days}日間・GA4）</span>
      </h2>
      <p className="text-[11px] text-gray-400 mb-3">
        上は「検索に出た回数」、ここは「実際にサイトに来た人」。検索以外（LINE・直接・ChatGPTなど）から来た人も入ります。
        直近1〜2日は数字が揃っていないので低く出ます。
      </p>

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

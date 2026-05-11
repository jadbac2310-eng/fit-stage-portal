"use client";

import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";
import type { DailyPageViewRow, TrafficSourceRow, PageViewRow } from "@/lib/analytics";
import type { SearchPageRow, SearchQueryRow } from "@/lib/search-console";

// ---- 色定義 ----
const PIE_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#ef4444", "#06b6d4"];

// ---- 日別アクセス推移 ----
export function DailyTrendChart({ data }: { data: DailyPageViewRow[] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-3">
      <p className="text-xs font-bold text-gray-500 mb-4">日別アクセス推移</p>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
            formatter={(v) => [Number(v).toLocaleString(), "PV"]}
          />
          <Line
            type="monotone"
            dataKey="views"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---- 流入元 円グラフ ----
const renderCustomLabel = ({
  cx, cy, midAngle, innerRadius, outerRadius, percent,
}: PieLabelRenderProps) => {
  if (!percent || percent < 0.06) return null;
  const RADIAN = Math.PI / 180;
  const ir = Number(innerRadius);
  const or = Number(outerRadius);
  const r  = ir + (or - ir) * 0.55;
  const x  = Number(cx) + r * Math.cos(-Number(midAngle) * RADIAN);
  const y  = Number(cy) + r * Math.sin(-Number(midAngle) * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${Math.round(percent * 100)}%`}
    </text>
  );
};

export function TrafficPieChart({ data }: { data: TrafficSourceRow[] }) {
  const chartData = data.map((d) => ({
    name: d.source === "(direct)" ? "直接アクセス" : d.source,
    value: d.sessions,
  }));

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-3">
      <p className="text-xs font-bold text-gray-500 mb-2">流入元の割合</p>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            outerRadius={75}
            dataKey="value"
            labelLine={false}
            label={renderCustomLabel}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, color: "#6b7280" }}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
            formatter={(v) => [Number(v).toLocaleString(), "セッション"]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---- 人気ページ 横棒グラフ ----
const truncatePath = (path: string) =>
  path.length > 28 ? path.slice(0, 27) + "…" : path;

export function PopularPagesChart({ data }: { data: PageViewRow[] }) {
  const chartData = [...data].reverse().map((d) => ({
    path: truncatePath(d.path),
    views: d.views,
  }));

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-3">
      <p className="text-xs font-bold text-gray-500 mb-4">人気ページランキング</p>
      <ResponsiveContainer width="100%" height={data.length * 36 + 8}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 32, left: 8, bottom: 0 }}
          barSize={14}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="path"
            tick={{ fontSize: 10, fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
            width={120}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
            formatter={(v) => [Number(v).toLocaleString(), "PV"]}
            cursor={{ fill: "#f9fafb" }}
          />
          <Bar dataKey="views" fill="#3b82f6" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const formatPct = (value: number) =>
  `${Math.round(value * 1000) / 10}%`;

const formatPosition = (value: number) =>
  value > 0 ? value.toFixed(1) : "-";

const truncateText = (value: string, max = 34) =>
  value.length > max ? value.slice(0, max - 1) + "..." : value;

export function SearchQueriesTable({ data }: { data: SearchQueryRow[] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-3">
      <p className="text-xs font-bold text-gray-500 mb-3">Google検索ワード</p>
      <div className="space-y-3">
        {data.map((row) => (
          <div key={row.query} className="border-b border-gray-100 last:border-0 last:pb-0 pb-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-gray-800 leading-snug">{row.query}</p>
              <span className="text-xs font-bold text-blue-600 whitespace-nowrap">{row.clicks} clicks</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-400">
              <span>{row.impressions.toLocaleString()} impressions</span>
              <span>CTR {formatPct(row.ctr)}</span>
              <span>平均 {formatPosition(row.position)}位</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SearchPagesTable({ data }: { data: SearchPageRow[] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-xs font-bold text-gray-500">上位のページ</p>
        <div className="grid grid-cols-2 gap-4 text-[11px] font-semibold text-gray-400 text-right">
          <span>クリック数</span>
          <span>表示回数</span>
        </div>
      </div>
      <div className="space-y-2.5">
        {data.map((row) => (
          <div
            key={row.page}
            className="grid grid-cols-[minmax(0,1fr)_48px_64px] items-start gap-3 border-b border-gray-100 last:border-0 last:pb-0 pb-2.5"
          >
            <p className="text-xs font-semibold text-gray-700 leading-snug break-all">
              {truncateText(row.page)}
            </p>
            <span className="text-xs font-bold text-blue-600 text-right">{row.clicks.toLocaleString()}</span>
            <span className="text-xs font-semibold text-gray-600 text-right">{row.impressions.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

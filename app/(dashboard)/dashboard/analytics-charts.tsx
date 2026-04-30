"use client";

import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar,
} from "recharts";
import type { DailyPageViewRow, TrafficSourceRow, PageViewRow } from "@/lib/analytics";

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
            formatter={(v: number) => [v.toLocaleString(), "PV"]}
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
}: {
  cx: number; cy: number; midAngle: number;
  innerRadius: number; outerRadius: number; percent: number;
}) => {
  if (percent < 0.06) return null;
  const RADIAN = Math.PI / 180;
  const r  = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x  = cx + r * Math.cos(-midAngle * RADIAN);
  const y  = cy + r * Math.sin(-midAngle * RADIAN);
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
            formatter={(v: number) => [v.toLocaleString(), "セッション"]}
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
            formatter={(v: number) => [v.toLocaleString(), "PV"]}
            cursor={{ fill: "#f9fafb" }}
          />
          <Bar dataKey="views" fill="#3b82f6" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  CalendarDays, MapPin, ChevronRight, Clock,
  Dumbbell, FlaskConical, CheckCircle, XCircle,
} from "lucide-react";
import { cn } from "@/lib/cn";

export type ScheduleItem = {
  id: string;
  type: "regular" | "trial";
  customerName: string;
  scheduledAt: string;
  location?: string;
  course?: string;
  status: "scheduled" | "completed" | "cancelled";
  role: "trainer" | "sales";
};

// ─── 日付ユーティリティ（ローカル＝JST） ───────────────
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
const WD = ["日", "月", "火", "水", "木", "金", "土"];

function dayLabel(d: Date): { main: string; sub: string; accent: boolean } {
  const today = startOfDay(new Date());
  const target = startOfDay(d);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  const sub = `${d.getMonth() + 1}/${d.getDate()}(${WD[d.getDay()]})`;
  if (diff === 0) return { main: "今日", sub, accent: true };
  if (diff === 1) return { main: "明日", sub, accent: true };
  if (diff === 2) return { main: "明後日", sub, accent: false };
  return { main: sub, sub: "", accent: false };
}

function timeStr(iso: string) {
  return new Date(iso).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

// ─── ステータスバッジ ─────────────────────────────────
function StatusPill({ status }: { status: ScheduleItem["status"] }) {
  if (status === "scheduled") return null;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium",
      status === "completed" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
    )}>
      {status === "completed" ? <CheckCircle size={9} /> : <XCircle size={9} />}
      {status === "completed" ? "完了" : "キャンセル"}
    </span>
  );
}

// ─── 1件のカード ──────────────────────────────────────
function LessonCard({ item }: { item: ScheduleItem }) {
  const isTrial = item.type === "trial";
  const cancelled = item.status === "cancelled";

  return (
    <Link
      href={`/schedule/${item.id}`}
      className={cn(
        "flex items-stretch gap-3 bg-white rounded-2xl border border-gray-200 overflow-hidden",
        "active:scale-[0.99] hover:border-gray-300 hover:shadow-sm transition",
        cancelled && "opacity-60"
      )}
    >
      {/* カラーアクセント */}
      <div className={cn("w-1 flex-shrink-0", isTrial ? "bg-purple-400" : "bg-blue-500")} />

      {/* 時刻 */}
      <div className="flex flex-col items-center justify-center py-3 pl-1 pr-1 min-w-[56px]">
        <span className={cn(
          "text-base font-bold tabular-nums",
          cancelled ? "text-gray-400 line-through" : "text-gray-900"
        )}>
          {timeStr(item.scheduledAt)}
        </span>
      </div>

      {/* 本文 */}
      <div className="flex-1 min-w-0 py-3 pr-2 border-l border-gray-100 pl-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={cn(
            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold",
            isTrial ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
          )}>
            {isTrial ? <FlaskConical size={9} /> : <Dumbbell size={9} />}
            {isTrial ? "体験" : "通常"}
          </span>
          {isTrial && (
            <span className="text-[10px] font-medium text-gray-400">
              {item.role === "trainer" ? "トレーナー" : "営業"}
            </span>
          )}
          <StatusPill status={item.status} />
        </div>
        <p className="text-sm font-semibold text-gray-900 mt-1 truncate">{item.customerName}</p>
        <div className="flex items-center gap-x-3 gap-y-0.5 mt-0.5 flex-wrap">
          {item.course && <span className="text-xs text-gray-500">{item.course}</span>}
          {item.location && (
            <span className="text-xs text-gray-400 flex items-center gap-0.5 min-w-0">
              <MapPin size={10} className="flex-shrink-0" />
              <span className="truncate">{item.location}</span>
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center pr-3 text-gray-300">
        <ChevronRight size={16} />
      </div>
    </Link>
  );
}

// ─── 日付グループ ─────────────────────────────────────
function DayGroup({ date, items }: { date: Date; items: ScheduleItem[] }) {
  const { main, sub, accent } = dayLabel(date);
  return (
    <div>
      <div className="flex items-baseline gap-2 px-1 mb-2">
        <span className={cn("text-sm font-bold", accent ? "text-blue-600" : "text-gray-700")}>{main}</span>
        {sub && <span className="text-xs text-gray-400">{sub}</span>}
        <span className="text-xs text-gray-300 ml-auto">{items.length}件</span>
      </div>
      <div className="space-y-2">
        {items.map((it) => <LessonCard key={`${it.type}-${it.id}`} item={it} />)}
      </div>
    </div>
  );
}

// ─── メイン ───────────────────────────────────────────
export function ScheduleClient({ items, memberName }: { items: ScheduleItem[]; memberName: string }) {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  const { upcoming, past } = useMemo(() => {
    const today = startOfDay(new Date()).getTime();
    const up: ScheduleItem[] = [];
    const pa: ScheduleItem[] = [];
    for (const it of items) {
      const d = startOfDay(new Date(it.scheduledAt)).getTime();
      if (d >= today && it.status !== "cancelled") up.push(it);
      else pa.push(it);
    }
    up.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    pa.sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
    return { upcoming: up, past: pa };
  }, [items]);

  const list = tab === "upcoming" ? upcoming : past;

  // 日付ごとにグループ化（順序は list に従う）
  const groups = useMemo(() => {
    const map = new Map<string, { date: Date; items: ScheduleItem[] }>();
    for (const it of list) {
      const d = new Date(it.scheduledAt);
      const k = dayKey(d);
      if (!map.has(k)) map.set(k, { date: d, items: [] });
      map.get(k)!.items.push(it);
    }
    return Array.from(map.values());
  }, [list]);

  const nextItem = upcoming[0];

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto pb-10">
      {/* ヘッダー */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays size={20} className="text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">スケジュール</h1>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">{memberName} さんの担当レッスン</p>
      </div>

      {/* 次の予定ハイライト */}
      {nextItem && tab === "upcoming" && (
        <div className="bg-gradient-to-br from-blue-600 to-blue-500 rounded-2xl p-4 mb-5 text-white shadow-sm shadow-blue-200">
          <p className="text-xs font-medium text-blue-100 flex items-center gap-1.5">
            <Clock size={12} /> 次の予定
          </p>
          <div className="flex items-end justify-between mt-1.5">
            <div className="min-w-0">
              <p className="text-lg font-bold truncate">{nextItem.customerName}</p>
              <p className="text-xs text-blue-100 mt-0.5">
                {new Date(nextItem.scheduledAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", weekday: "short" })}
                {" "}{timeStr(nextItem.scheduledAt)}
                {nextItem.location && ` ・ ${nextItem.location}`}
              </p>
            </div>
            <Link href={`/schedule/${nextItem.id}`}
              className="flex-shrink-0 ml-3 bg-white/20 hover:bg-white/30 transition rounded-lg px-3 py-1.5 text-xs font-semibold">
              詳細
            </Link>
          </div>
        </div>
      )}

      {/* タブ */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-4">
        {([["upcoming", "今後の予定", upcoming.length], ["past", "過去", past.length]] as const).map(([key, label, n]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition",
              tab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            {label}
            <span className={cn(
              "text-[11px] min-w-[1.1rem] h-[1.1rem] px-1 inline-flex items-center justify-center rounded-full font-bold",
              tab === key ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-500"
            )}>{n}</span>
          </button>
        ))}
      </div>

      {/* 一覧 */}
      {groups.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">{tab === "upcoming" ? "🌤️" : "🗂️"}</p>
          <p className="text-sm font-semibold text-gray-600">
            {tab === "upcoming" ? "今後の予定はありません" : "過去のレッスンはありません"}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => <DayGroup key={dayKey(g.date)} date={g.date} items={g.items} />)}
        </div>
      )}
    </div>
  );
}

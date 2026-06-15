"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  CalendarDays, MapPin, ChevronDown, Clock,
  Dumbbell, FlaskConical, CheckCircle, XCircle, UserRound,
  Calendar, Ticket, StickyNote, ClipboardList, Pencil,
  ChevronLeft, ChevronRight, List, LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { Exercise } from "@/lib/exercise-types";
import { ExerciseList } from "@/components/exercise-list";

export type ScheduleItem = {
  id: string;
  type: "regular" | "trial";
  customerName: string;
  scheduledAt: string;
  location?: string;
  course?: string;
  status: "scheduled" | "completed" | "cancelled";
  trainerId?: string;
  trainerName?: string;
  salesId?: string;
  salesName?: string;
  note?: string;
  exercises?: Exercise[];
  customerImpression?: string;
  contracted?: boolean | null;
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

function fullDateStr(iso: string) {
  return new Date(iso).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
}

// ─── 展開詳細の1行 ────────────────────────────────────
function DetailRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <div className="text-gray-400 mt-0.5 flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-gray-400">{label}</p>
        <div className="text-xs text-gray-700 mt-0.5">{children}</div>
      </div>
    </div>
  );
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

// ─── 1件のカード（クリックでその場で展開） ───────────────
function LessonCard({ item, isAdmin }: { item: ScheduleItem; isAdmin?: boolean }) {
  const [open, setOpen] = useState(false);
  const isTrial = item.type === "trial";
  const cancelled = item.status === "cancelled";

  // 担当者ラベル（管理者の全体表示用）
  const staff = isTrial
    ? [
        item.trainerName && `${item.trainerName}(ﾄﾚｰﾅｰ)`,
        item.salesName && `${item.salesName}(営業)`,
      ].filter(Boolean).join(" / ")
    : item.trainerName ?? "";

  const editHref = isTrial ? "/lessons/trial" : "/lessons/regular";

  return (
    <div className={cn(
      "bg-white rounded-2xl border border-gray-200 overflow-hidden transition",
      open ? "border-gray-300 shadow-sm" : "hover:border-gray-300",
      cancelled && "opacity-60"
    )}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-stretch gap-3 w-full text-left active:scale-[0.99] transition"
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
          {staff && (
            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1 min-w-0">
              <UserRound size={10} className="flex-shrink-0" />
              <span className="truncate">{staff}</span>
            </p>
          )}
        </div>

        <div className="flex items-center pr-3 text-gray-300">
          <ChevronDown size={16} className={cn("transition-transform", open && "rotate-180")} />
        </div>
      </button>

      {/* 展開詳細 */}
      {open && (
        <div className="border-t border-gray-100 px-4 py-2">
          <DetailRow icon={<Calendar size={13} />} label="日時">
            {fullDateStr(item.scheduledAt)} {timeStr(item.scheduledAt)}
          </DetailRow>
          {isTrial ? (
            <>
              <DetailRow icon={<UserRound size={13} />} label="営業担当">{item.salesName ?? "未設定"}</DetailRow>
              <DetailRow icon={<UserRound size={13} />} label="トレーナー">{item.trainerName ?? "未設定"}</DetailRow>
            </>
          ) : (
            <DetailRow icon={<UserRound size={13} />} label="担当トレーナー">{item.trainerName ?? "未設定"}</DetailRow>
          )}
          {item.course && <DetailRow icon={<Ticket size={13} />} label="コース">{item.course}</DetailRow>}
          {item.location && <DetailRow icon={<MapPin size={13} />} label="場所">{item.location}</DetailRow>}
          {item.exercises && item.exercises.length > 0 && (
            <DetailRow icon={<ClipboardList size={13} />} label="種目">
              <ExerciseList exercises={item.exercises} compact />
            </DetailRow>
          )}
          {item.customerImpression && (
            <DetailRow icon={<UserRound size={13} />} label="顧客の様子">
              <span className="whitespace-pre-wrap">{item.customerImpression}</span>
            </DetailRow>
          )}
          {item.note && (
            <DetailRow icon={<StickyNote size={13} />} label="備考">
              <span className="whitespace-pre-wrap">{item.note}</span>
            </DetailRow>
          )}
          {isAdmin && (
            <Link
              href={editHref}
              className="mt-2 flex items-center justify-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-xl py-2 transition"
            >
              <Pencil size={13} /> {isTrial ? "体験レッスン管理で編集" : "通常レッスン管理で編集"}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 日付グループ ─────────────────────────────────────
function DayGroup({ date, items, isAdmin }: { date: Date; items: ScheduleItem[]; isAdmin?: boolean }) {
  const { main, sub, accent } = dayLabel(date);
  return (
    <div>
      <div className="flex items-baseline gap-2 px-1 mb-2">
        <span className={cn("text-sm font-bold", accent ? "text-blue-600" : "text-gray-700")}>{main}</span>
        {sub && <span className="text-xs text-gray-400">{sub}</span>}
        <span className="text-xs text-gray-300 ml-auto">{items.length}件</span>
      </div>
      <div className="space-y-2">
        {items.map((it) => <LessonCard key={`${it.type}-${it.id}`} item={it} isAdmin={isAdmin} />)}
      </div>
    </div>
  );
}

// ─── 月グリッドカレンダー（サイボウズ風） ─────────────────
function CalendarView({ items, isAdmin }: { items: ScheduleItem[]; isAdmin?: boolean }) {
  const [cursor, setCursor] = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });
  const [selectedKey, setSelectedKey] = useState<string | null>(() => dayKey(startOfDay(new Date())));

  // 日付キー → アイテム配列
  const byDay = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>();
    for (const it of items) {
      const k = dayKey(new Date(it.scheduledAt));
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(it);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    return map;
  }, [items]);

  // グリッド（前後の埋めセル含む）
  const weeks = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay()); // 週初め(日)へ
    const cells: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      cells.push(d);
    }
    // 最終週が当月を含まなければ削る（5週で収まる場合）
    const trimmed = cells.slice(0, 35).some((d) => d.getMonth() === cursor.getMonth() && d.getDate() > 28)
      ? cells
      : cells.slice(0, 35);
    const w: Date[][] = [];
    for (let i = 0; i < trimmed.length; i += 7) w.push(trimmed.slice(i, i + 7));
    return w;
  }, [cursor]);

  const todayKey = dayKey(startOfDay(new Date()));
  const selectedItems = selectedKey ? byDay.get(selectedKey) ?? [] : [];
  const selectedDate = selectedItems[0]
    ? new Date(selectedItems[0].scheduledAt)
    : null;

  const monthLabel = `${cursor.getFullYear()}年${cursor.getMonth() + 1}月`;

  return (
    <div>
      {/* 月ナビ */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
          aria-label="前の月"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-gray-900">{monthLabel}</h2>
          <button
            onClick={() => { const t = new Date(); setCursor(new Date(t.getFullYear(), t.getMonth(), 1)); setSelectedKey(todayKey); }}
            className="text-xs font-medium text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-50 transition"
          >
            今月
          </button>
        </div>
        <button
          onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
          aria-label="次の月"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 mb-1">
        {WD.map((w, i) => (
          <div key={w} className={cn(
            "text-center text-[11px] font-semibold py-1",
            i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400"
          )}>{w}</div>
        ))}
      </div>

      {/* グリッド */}
      <div className="grid grid-cols-7 gap-1">
        {weeks.flat().map((d) => {
          const k = dayKey(d);
          const dayItems = byDay.get(k) ?? [];
          const inMonth = d.getMonth() === cursor.getMonth();
          const isToday = k === todayKey;
          const isSelected = k === selectedKey;
          return (
            <button
              key={k}
              onClick={() => setSelectedKey(k)}
              className={cn(
                "min-h-[64px] md:min-h-[84px] rounded-lg border p-1 text-left flex flex-col gap-0.5 transition",
                isSelected ? "border-blue-500 ring-1 ring-blue-500 bg-blue-50/40" : "border-gray-100 hover:border-gray-300",
                !inMonth && "opacity-40"
              )}
            >
              <span className={cn(
                "text-[11px] font-semibold w-5 h-5 flex items-center justify-center rounded-full",
                isToday ? "bg-blue-600 text-white" :
                d.getDay() === 0 ? "text-red-400" : d.getDay() === 6 ? "text-blue-400" : "text-gray-600"
              )}>{d.getDate()}</span>
              <div className="flex flex-col gap-0.5 min-w-0">
                {dayItems.slice(0, 3).map((it) => (
                  <span
                    key={`${it.type}-${it.id}`}
                    className={cn(
                      "text-[9px] leading-tight px-1 py-0.5 rounded truncate",
                      it.status === "cancelled" ? "bg-gray-100 text-gray-400 line-through" :
                      it.type === "trial" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                    )}
                  >
                    {timeStr(it.scheduledAt)} {it.customerName}
                  </span>
                ))}
                {dayItems.length > 3 && (
                  <span className="text-[9px] text-gray-400 px-1">+{dayItems.length - 3}件</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* 選択日の詳細 */}
      <div className="mt-5">
        <div className="flex items-baseline gap-2 px-1 mb-2">
          <span className="text-sm font-bold text-gray-700">
            {selectedDate ? fullDateStr(selectedDate.toISOString()) : selectedKey ? "予定なし" : "日付を選択"}
          </span>
          {selectedItems.length > 0 && <span className="text-xs text-gray-300 ml-auto">{selectedItems.length}件</span>}
        </div>
        {selectedItems.length === 0 ? (
          <div className="text-center py-10 text-sm text-gray-400">この日の予定はありません</div>
        ) : (
          <div className="space-y-2">
            {selectedItems.map((it) => <LessonCard key={`${it.type}-${it.id}`} item={it} isAdmin={isAdmin} />)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── メイン ───────────────────────────────────────────
export function ScheduleClient({
  items, memberName, isAdmin = false, currentMemberId, members = [],
}: {
  items: ScheduleItem[];
  memberName: string;
  isAdmin?: boolean;
  currentMemberId?: string;
  members?: { id: string; name: string }[];
}) {
  const [view, setView] = useState<"list" | "calendar">("list");
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  // 担当者で絞り込み（"all" = 全員）。全員が全員分を閲覧可。
  const [filterMember, setFilterMember] = useState<string>("all");

  // 絞り込み後のアイテム（"all" は全件）
  const visibleItems = useMemo(() => {
    if (filterMember === "all") return items;
    return items.filter((it) => it.trainerId === filterMember || it.salesId === filterMember);
  }, [items, filterMember]);

  const { upcoming, past } = useMemo(() => {
    const today = startOfDay(new Date()).getTime();
    const up: ScheduleItem[] = [];
    const pa: ScheduleItem[] = [];
    for (const it of visibleItems) {
      const d = startOfDay(new Date(it.scheduledAt)).getTime();
      if (d >= today && it.status !== "cancelled") up.push(it);
      else pa.push(it);
    }
    up.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    pa.sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
    return { upcoming: up, past: pa };
  }, [visibleItems]);

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
        <p className="text-sm text-gray-500 mt-0.5">
          {filterMember === "all"
            ? "全員のスケジュール"
            : `${members.find((m) => m.id === filterMember)?.name ?? ""} さんのスケジュール`}
        </p>
      </div>

      {/* 表示切替（リスト / カレンダー） */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-4">
        {([["list", "リスト", List], ["calendar", "カレンダー", LayoutGrid]] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition",
              view === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* 担当者フィルタ（全員が利用可） */}
      {members.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <UserRound size={15} className="text-gray-400 flex-shrink-0" />
          <select
            value={filterMember}
            onChange={(e) => setFilterMember(e.target.value)}
            className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">全員のスケジュール</option>
            {currentMemberId && (
              <option value={currentMemberId}>自分（{memberName}）</option>
            )}
            {members
              .filter((m) => m.id !== currentMemberId)
              .map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
          </select>
        </div>
      )}

      {view === "calendar" ? (
        <CalendarView items={visibleItems} isAdmin={isAdmin} />
      ) : (
        <>
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
          {groups.map((g) => <DayGroup key={dayKey(g.date)} date={g.date} items={g.items} isAdmin={isAdmin} />)}
        </div>
      )}
        </>
      )}
    </div>
  );
}

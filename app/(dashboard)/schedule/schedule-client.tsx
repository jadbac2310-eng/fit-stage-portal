"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays, MapPin, ChevronDown, Clock,
  Dumbbell, FlaskConical, CheckCircle, XCircle, UserRound, Users,
  Calendar, Ticket, StickyNote, Pencil,
  ChevronLeft, ChevronRight, List, LayoutGrid,
  Plus, Trash2, X, CalendarPlus, RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { AuthorStamp } from "@/components/ui/author-stamp";
import { EVENT_COLORS, type EventColor } from "@/lib/personal-events-types";
import { createPersonalEventAction, updatePersonalEventAction, deletePersonalEventAction } from "./actions";
import type { Member } from "@/lib/members";
import type { Customer } from "@/lib/customers-types";
import type { Lesson } from "@/lib/lessons-types";
import type { SessionPass } from "@/lib/session-passes-types";
import type { CustomerPlanRecord } from "@/lib/customer-plans-types";
import type { RentalGym } from "@/lib/rental-gyms";
import type { Store } from "@/lib/stores";
import { LessonForm } from "../lessons/regular/regular-lessons-client";
import { createLessonAction, setLessonStatusAction } from "../lessons/regular/actions";

export type ScheduleItem = {
  id: string;
  type: "regular" | "trial" | "personal";
  customerName: string;
  scheduledAt: string;
  endAt?: string;
  allDay?: boolean;
  color?: EventColor;
  location?: string;
  course?: string;
  status: "scheduled" | "completed" | "cancelled";
  trainerId?: string;
  trainerName?: string;
  salesId?: string;
  salesName?: string;
  ownerId?: string;
  ownerName?: string;
  createdById?: string;
  createdByName?: string;
  createdAt?: string;
  updatedByName?: string;
  updatedAt?: string;
  note?: string;
  contracted?: boolean | null;
  participantIds?: string[];
  participantNames?: string[];
  notify?: boolean;
};

// ─── 個人予定の色 ─────────────────────────────────────
const COLOR_MAP: Record<EventColor, { dot: string; chip: string; accent: string; swatch: string }> = {
  blue:   { dot: "bg-blue-500",   chip: "bg-blue-100 text-blue-700",     accent: "bg-blue-500",   swatch: "bg-blue-500" },
  green:  { dot: "bg-green-500",  chip: "bg-green-100 text-green-700",   accent: "bg-green-500",  swatch: "bg-green-500" },
  red:    { dot: "bg-red-500",    chip: "bg-red-100 text-red-700",       accent: "bg-red-500",    swatch: "bg-red-500" },
  purple: { dot: "bg-purple-500", chip: "bg-purple-100 text-purple-700", accent: "bg-purple-500", swatch: "bg-purple-500" },
  amber:  { dot: "bg-amber-500",  chip: "bg-amber-100 text-amber-800",   accent: "bg-amber-500",  swatch: "bg-amber-500" },
  pink:   { dot: "bg-pink-500",   chip: "bg-pink-100 text-pink-700",     accent: "bg-pink-500",   swatch: "bg-pink-500" },
  gray:   { dot: "bg-gray-500",   chip: "bg-gray-200 text-gray-700",     accent: "bg-gray-400",   swatch: "bg-gray-500" },
};
const COLOR_LABEL: Record<EventColor, string> = {
  blue: "青", green: "緑", red: "赤", purple: "紫", amber: "橙", pink: "桃", gray: "灰",
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
  // タイムゾーンをJST固定にする（サーバ=UTCとクライアント=JSTで表示がズレるのを防ぐ）
  return new Date(iso).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" });
}

function fullDateStr(iso: string) {
  return new Date(iso).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short", timeZone: "Asia/Tokyo" });
}

const pad2 = (n: number) => String(n).padStart(2, "0");
function datePart(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function timePart(iso: string) {
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function todayDate() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
// "HH:MM" を1時間後にする（同日内に収め、24時を超える場合は23:59で止める）
function addOneHour(time: string): string {
  const [h, m] = time.split(":").map((x) => parseInt(x, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const total = Math.min(h * 60 + m + 60, 23 * 60 + 59);
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
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

// 個人予定の時刻表示（終日 / 時間範囲）
function personalTimeLabel(item: ScheduleItem): string {
  if (item.allDay) return "終日";
  const start = timeStr(item.scheduledAt);
  if (item.endAt) return `${start}〜${timeStr(item.endAt)}`;
  return start;
}

// ─── 1件のカード（クリックでその場で展開） ───────────────
function LessonCard({
  item, isAdmin, currentMemberId, onEditPersonal,
}: {
  item: ScheduleItem;
  isAdmin?: boolean;
  currentMemberId?: string;
  onEditPersonal?: (item: ScheduleItem) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [settingStatus, setSettingStatus] = useState(false);
  const isTrial = item.type === "trial";
  const isPersonal = item.type === "personal";
  const cancelled = item.status === "cancelled";
  const color = item.color ?? "blue";
  const canManage = isPersonal && (isAdmin || item.ownerId === currentMemberId);
  // 通常レッスンの編集可否（管理者 or 追加した本人）
  const canEditLesson = item.type === "regular" && (isAdmin || (!!item.createdById && item.createdById === currentMemberId));
  // 完了/予定に戻すは「担当トレーナー本人」のみ
  const canCompleteLesson = item.type === "regular" && !!currentMemberId && item.trainerId === currentMemberId;

  // 担当者ラベル
  const staff = isPersonal
    ? (item.ownerName ?? "")
    : isTrial
    ? [
        item.trainerName && `${item.trainerName}(ﾄﾚｰﾅｰ)`,
        item.salesName && `${item.salesName}(営業)`,
      ].filter(Boolean).join(" / ")
    : item.trainerName ?? "";

  const editHref = isTrial ? "/lessons/trial" : "/lessons/regular";

  async function handleDelete() {
    if (!confirm("この予定を削除しますか？")) return;
    setDeleting(true);
    try {
      await deletePersonalEventAction(item.id);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "削除に失敗しました");
      setDeleting(false);
    }
  }

  async function handleSetStatus(status: "completed" | "scheduled") {
    setSettingStatus(true);
    try {
      await setLessonStatusAction(item.id, status);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "状態の変更に失敗しました");
      setSettingStatus(false);
    }
  }

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
        <div className={cn("w-1 flex-shrink-0",
          isPersonal ? COLOR_MAP[color].accent : isTrial ? "bg-purple-400" : "bg-blue-500"
        )} />

        {/* 時刻 */}
        <div className="flex flex-col items-center justify-center py-3 pl-1 pr-1 min-w-[56px]">
          <span className={cn(
            "font-bold tabular-nums",
            isPersonal && item.allDay ? "text-[11px]" : "text-base",
            cancelled ? "text-gray-400 line-through" : "text-gray-900"
          )}>
            {isPersonal && item.allDay ? "終日" : timeStr(item.scheduledAt)}
          </span>
        </div>

        {/* 本文 */}
        <div className="flex-1 min-w-0 py-3 pr-2 border-l border-gray-100 pl-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold",
              isPersonal ? COLOR_MAP[color].chip : isTrial ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
            )}>
              {isPersonal ? <CalendarPlus size={9} /> : isTrial ? <FlaskConical size={9} /> : <Dumbbell size={9} />}
              {isPersonal ? "個人" : isTrial ? "体験" : "通常"}
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
            {fullDateStr(item.scheduledAt)} {isPersonal ? personalTimeLabel(item) : timeStr(item.scheduledAt)}
          </DetailRow>
          {isPersonal ? (
            <>
              <DetailRow icon={<UserRound size={13} />} label="作成者">{item.ownerName ?? "—"}</DetailRow>
              {item.participantNames && item.participantNames.length > 0 && (
                <DetailRow icon={<Users size={13} />} label="参加者">
                  {item.participantNames.join("、")}
                </DetailRow>
              )}
            </>
          ) : isTrial ? (
            <>
              <DetailRow icon={<UserRound size={13} />} label="営業担当">{item.salesName ?? "未設定"}</DetailRow>
              <DetailRow icon={<UserRound size={13} />} label="トレーナー">{item.trainerName ?? "未設定"}</DetailRow>
            </>
          ) : (
            <DetailRow icon={<UserRound size={13} />} label="担当トレーナー">{item.trainerName ?? "未設定"}</DetailRow>
          )}
          {item.type === "regular" && item.createdByName && (
            <DetailRow icon={<CalendarPlus size={13} />} label="追加者">{item.createdByName}</DetailRow>
          )}
          {item.course && <DetailRow icon={<Ticket size={13} />} label="コース">{item.course}</DetailRow>}
          {item.location && <DetailRow icon={<MapPin size={13} />} label="場所">{item.location}</DetailRow>}
          {item.note && (
            <DetailRow icon={<StickyNote size={13} />} label={isPersonal ? "メモ" : "備考"}>
              <span className="whitespace-pre-wrap">{item.note}</span>
            </DetailRow>
          )}
          <AuthorStamp
            createdByName={item.createdByName}
            createdAt={item.createdAt}
            updatedByName={item.updatedByName}
            updatedAt={item.updatedAt}
            className="mt-2 pt-2 border-t border-gray-50"
          />
          {canManage && (
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => onEditPersonal?.(item)}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-xl py-2 transition"
              >
                <Pencil size={13} /> 編集
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center justify-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 rounded-xl py-2 px-4 transition disabled:opacity-50"
              >
                <Trash2 size={13} /> {deleting ? "削除中…" : "削除"}
              </button>
            </div>
          )}
          {canCompleteLesson && !cancelled && (
            item.status === "completed" ? (
              <button
                type="button"
                onClick={() => handleSetStatus("scheduled")}
                disabled={settingStatus}
                className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-xl py-2 transition disabled:opacity-50"
              >
                <RotateCcw size={13} /> {settingStatus ? "変更中…" : "予定に戻す"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSetStatus("completed")}
                disabled={settingStatus}
                className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl py-2 transition disabled:opacity-50"
              >
                <CheckCircle size={13} /> {settingStatus ? "変更中…" : "完了にする"}
              </button>
            )
          )}
          {((isTrial && isAdmin) || canEditLesson) && (
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
function DayGroup({
  date, items, isAdmin, currentMemberId, onEditPersonal,
}: {
  date: Date;
  items: ScheduleItem[];
  isAdmin?: boolean;
  currentMemberId?: string;
  onEditPersonal?: (item: ScheduleItem) => void;
}) {
  const { main, sub, accent } = dayLabel(date);
  return (
    <div>
      <div className="flex items-baseline gap-2 px-1 mb-2">
        <span className={cn("text-sm font-bold", accent ? "text-blue-600" : "text-gray-700")}>{main}</span>
        {sub && <span className="text-xs text-gray-400">{sub}</span>}
        <span className="text-xs text-gray-300 ml-auto">{items.length}件</span>
      </div>
      <div className="space-y-2">
        {items.map((it) => (
          <LessonCard key={`${it.type}-${it.id}`} item={it} isAdmin={isAdmin}
            currentMemberId={currentMemberId} onEditPersonal={onEditPersonal} />
        ))}
      </div>
    </div>
  );
}

function keyToYmd(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return `${y}-${pad2(m + 1)}-${pad2(d)}`; // dayKey の月は0始まり
}

// ─── 月グリッドカレンダー（サイボウズ風） ─────────────────
function CalendarView({
  items, isAdmin, currentMemberId, onEditPersonal, onAddPersonal, onAddLesson,
}: {
  items: ScheduleItem[];
  isAdmin?: boolean;
  currentMemberId?: string;
  onEditPersonal?: (item: ScheduleItem) => void;
  onAddPersonal?: (ymd: string) => void;
  onAddLesson?: (ymd: string) => void;
}) {
  const [cursor, setCursor] = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });
  const [selectedKey, setSelectedKey] = useState<string | null>(() => dayKey(startOfDay(new Date())));
  const [addOpen, setAddOpen] = useState(false);

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
      <div className="grid grid-cols-7 mb-1.5">
        {WD.map((w, i) => (
          <div key={w} className={cn(
            "text-center text-xs font-bold py-1.5",
            i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-gray-600"
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
                "min-h-[64px] md:min-h-[88px] rounded-lg border p-1 text-left flex flex-col gap-0.5 transition",
                isSelected ? "border-blue-500 ring-1 ring-blue-500 bg-blue-50"
                  : inMonth ? "bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50/40"
                            : "bg-gray-50 border-gray-100"
              )}
            >
              <span className={cn(
                "text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full",
                isToday ? "bg-blue-600 text-white" :
                !inMonth ? "text-gray-300" :
                d.getDay() === 0 ? "text-red-500" : d.getDay() === 6 ? "text-blue-500" : "text-gray-700"
              )}>{d.getDate()}</span>
              <div className="flex flex-col gap-0.5 min-w-0">
                {dayItems.slice(0, 3).map((it) => (
                  <span
                    key={`${it.type}-${it.id}`}
                    className={cn(
                      "text-[9px] font-medium leading-tight px-1 py-0.5 rounded truncate",
                      it.status === "cancelled" ? "bg-gray-100 text-gray-400 line-through" :
                      it.type === "personal" ? COLOR_MAP[it.color ?? "blue"].chip :
                      it.type === "trial" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                    )}
                  >
                    {it.type === "personal" && it.allDay ? "終日" : timeStr(it.scheduledAt)} {it.customerName}
                  </span>
                ))}
                {dayItems.length > 3 && (
                  <span className="text-[9px] font-semibold text-gray-500 px-1">+{dayItems.length - 3}件</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* 選択日の詳細 */}
      <div className="mt-5">
        <div className="flex items-center gap-2 px-1 mb-2">
          <span className="text-sm font-bold text-gray-700">
            {selectedKey ? fullDateStr(keyToYmd(selectedKey) + "T00:00:00+09:00") : "日付を選択"}
          </span>
          {selectedItems.length > 0 && <span className="text-xs text-gray-300">{selectedItems.length}件</span>}
          {selectedKey && (onAddPersonal || onAddLesson) && (
            <div className="relative ml-auto flex-shrink-0">
              <button
                type="button"
                onClick={() => setAddOpen((v) => !v)}
                className="flex items-center gap-1 bg-blue-600 text-white text-xs font-semibold rounded-lg px-2.5 py-1.5 hover:bg-blue-700 transition"
              >
                <Plus size={13} /> この日に追加
              </button>
              {addOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setAddOpen(false)} />
                  <div className="absolute right-0 mt-1 z-20 w-40 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden py-1">
                    {onAddLesson && (
                      <button
                        type="button"
                        onClick={() => { setAddOpen(false); onAddLesson(keyToYmd(selectedKey)); }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                      >
                        <Dumbbell size={14} className="text-blue-500" /> 通常レッスン
                      </button>
                    )}
                    {onAddPersonal && (
                      <button
                        type="button"
                        onClick={() => { setAddOpen(false); onAddPersonal(keyToYmd(selectedKey)); }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                      >
                        <CalendarPlus size={14} className="text-green-500" /> 個人予定
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        {selectedItems.length === 0 ? (
          <div className="text-center py-10 text-sm text-gray-400">この日の予定はありません</div>
        ) : (
          <div className="space-y-2">
            {selectedItems.map((it) => (
              <LessonCard key={`${it.type}-${it.id}`} item={it} isAdmin={isAdmin}
                currentMemberId={currentMemberId} onEditPersonal={onEditPersonal} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 個人予定の追加/編集モーダル ─────────────────────────
function PersonalEventModal({
  mode, initial, defaultDate, members, currentMemberId, onClose,
}: {
  mode: "create" | "edit";
  initial?: ScheduleItem;
  defaultDate?: string;
  members: Member[];
  currentMemberId?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const startDateInit = initial ? datePart(initial.scheduledAt) : (defaultDate ?? todayDate());
  const startTimeInit = initial && !initial.allDay ? timePart(initial.scheduledAt) : "10:00";
  const [allDay, setAllDay] = useState(initial?.allDay ?? false);
  // 開始/終了は連動させたいので制御コンポーネントにする
  const [startDate, setStartDate] = useState(startDateInit);
  const [startTime, setStartTime] = useState(startTimeInit);
  const [endDate, setEndDate] = useState(initial?.endAt ? datePart(initial.endAt) : startDateInit);
  const [endTime, setEndTime] = useState(
    initial?.endAt && !initial.allDay ? timePart(initial.endAt) : addOneHour(startTimeInit),
  );

  // 開始日を変えたら終了日も同じ日に合わせる
  function onStartDateChange(v: string) {
    setStartDate(v);
    setEndDate(v);
  }
  // 開始時刻を変えたら終了は同日・1時間後に合わせる
  function onStartTimeChange(v: string) {
    setStartTime(v);
    setEndDate(startDate);
    setEndTime(addOneHour(v));
  }
  const [color, setColor] = useState<EventColor>(initial?.color ?? "blue");
  const [participants, setParticipants] = useState<string[]>(initial?.participantIds ?? []);
  const [notify, setNotify] = useState(initial?.notify ?? true);
  const [memberQuery, setMemberQuery] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 作成者本人は「参加者」候補から除外（主催者として自動的に含まれる扱い）
  const ownerId = mode === "edit" ? initial?.ownerId : currentMemberId;
  const selectableMembers = members.filter((m) => m.id !== ownerId);
  const toggleParticipant = (id: string) =>
    setParticipants((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  const filteredMembers = selectableMembers.filter(
    (m) => !memberQuery.trim() || m.name.includes(memberQuery.trim()),
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      if (mode === "edit" && initial) await updatePersonalEventAction(initial.id, fd);
      else await createPersonalEventAction(fd);
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full md:max-w-md md:rounded-3xl rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <p className="text-base font-bold text-gray-900">{mode === "edit" ? "予定を編集" : "予定を追加"}</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={20} /></button>
        </div>

        <form onSubmit={onSubmit} className="p-5 space-y-4">
          {/* タイトル */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">タイトル <span className="text-red-400">*</span></label>
            <input name="title" defaultValue={initial?.customerName ?? ""} required
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例: 面談、外出、私用" />
          </div>

          {/* 終日 */}
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" name="allDay" checked={allDay} onChange={(e) => setAllDay(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300" />
            終日
          </label>

          {/* 開始 */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">開始</label>
            <div className="flex gap-2">
              <input type="date" name="startDate" value={startDate} onChange={(e) => onStartDateChange(e.target.value)} required
                className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {!allDay && (
                <input type="time" name="startTime" value={startTime} onChange={(e) => onStartTimeChange(e.target.value)}
                  className="w-28 px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              )}
            </div>
          </div>

          {/* 終了 */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">終了 <span className="text-gray-300 font-normal">（任意）</span></label>
            <div className="flex gap-2">
              <input type="date" name="endDate" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {!allDay && (
                <input type="time" name="endTime" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                  className="w-28 px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              )}
            </div>
          </div>

          {/* 場所 */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">場所</label>
            <input name="location" defaultValue={initial?.location ?? ""}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* 参加者（担当者マスタから複数選択） */}
          <div>
            <input type="hidden" name="participantIds" value={JSON.stringify(participants)} />
            <label className="text-xs font-semibold text-gray-500 mb-1 block">
              参加者 <span className="text-gray-300 font-normal">（任意）</span>
            </label>
            {participants.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {participants.map((id) => {
                  const m = members.find((mm) => mm.id === id);
                  return (
                    <button key={id} type="button" onClick={() => toggleParticipant(id)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-full pl-2.5 pr-1.5 py-1 hover:bg-blue-100 transition">
                      {m?.name ?? "不明"}
                      <X size={12} />
                    </button>
                  );
                })}
              </div>
            )}
            <input
              value={memberQuery}
              onChange={(e) => setMemberQuery(e.target.value)}
              placeholder="担当者を検索して追加..."
              className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-1.5"
            />
            <div className="max-h-36 overflow-y-auto rounded-xl border border-gray-100 divide-y divide-gray-50">
              {filteredMembers.length === 0 ? (
                <p className="text-xs text-gray-400 px-3 py-2">該当する担当者がいません</p>
              ) : (
                filteredMembers.map((m) => {
                  const selected = participants.includes(m.id);
                  return (
                    <button key={m.id} type="button" onClick={() => toggleParticipant(m.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 transition">
                      <span className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0",
                        selected ? "bg-blue-600 border-blue-600" : "border-gray-300",
                      )}>
                        {selected && <CheckCircle size={12} className="text-white" />}
                      </span>
                      <span className="text-sm text-gray-700">{m.name}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* LINE通知の有無 */}
          <div className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-2.5">
            <label className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" name="notify" checked={notify} onChange={(e) => setNotify(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300" />
              <span className="font-medium">参加者にLINEで通知する</span>
            </label>
            <p className="text-[11px] text-gray-400 mt-1 ml-6">オフにすると、追加・変更・削除のLINE通知を送りません。</p>
          </div>

          {/* メモ */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">メモ</label>
            <textarea name="memo" defaultValue={initial?.note ?? ""} rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          {/* 色 */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">色</label>
            <input type="hidden" name="color" value={color} />
            <div className="flex gap-2 flex-wrap">
              {EVENT_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)} aria-label={COLOR_LABEL[c]}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition",
                    COLOR_MAP[c].swatch,
                    color === c ? "ring-2 ring-offset-2 ring-gray-400" : "opacity-70 hover:opacity-100"
                  )}>
                  {color === c && <CheckCircle size={14} className="text-white" />}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
              キャンセル
            </button>
            <button type="submit" disabled={pending}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50">
              {pending ? "保存中…" : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── 通常レッスンの追加モーダル（既存の LessonForm を再利用） ───
function LessonModal({
  customers, members, sessionPasses, customerPlans, lessons, rentalGyms, stores, defaultDate, onClose,
}: {
  customers: Customer[];
  members: Member[];
  sessionPasses: SessionPass[];
  customerPlans: CustomerPlanRecord[];
  lessons: Lesson[];
  rentalGyms: RentalGym[];
  stores: Store[];
  defaultDate?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const close = () => { router.refresh(); onClose(); };
  const defaultValues = defaultDate ? { scheduledAt: `${defaultDate}T10:00:00+09:00` } : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full md:max-w-md md:rounded-3xl rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <p className="text-base font-bold text-gray-900">通常レッスンを追加</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={20} /></button>
        </div>
        <div className="p-5">
          <LessonForm
            customers={customers}
            members={members}
            sessionPasses={sessionPasses}
            customerPlans={customerPlans}
            allLessons={lessons}
            rentalGyms={rentalGyms}
            stores={stores}
            defaultValues={defaultValues}
            onClose={close}
            action={createLessonAction}
            submitLabel="追加する"
          />
        </div>
      </div>
    </div>
  );
}

// ─── メイン ───────────────────────────────────────────
export function ScheduleClient({
  items, memberName, isAdmin = false, currentMemberId, members = [],
  customers = [], sessionPasses = [], customerPlans = [], lessons = [], rentalGyms = [], stores = [],
}: {
  items: ScheduleItem[];
  memberName: string;
  isAdmin?: boolean;
  currentMemberId?: string;
  members?: Member[];
  customers?: Customer[];
  sessionPasses?: SessionPass[];
  customerPlans?: CustomerPlanRecord[];
  lessons?: Lesson[];
  rentalGyms?: RentalGym[];
  stores?: Store[];
}) {
  const [view, setView] = useState<"list" | "calendar">("list");
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  // 担当者で絞り込み（"all" = 全員）。初期は自分の予定。全員が全員分を閲覧可。
  const [filterMember, setFilterMember] = useState<string>(currentMemberId ?? "all");
  // 個人予定の追加/編集モーダル
  const [modal, setModal] = useState<{ mode: "create" | "edit"; initial?: ScheduleItem; defaultDate?: string } | null>(null);
  // 通常レッスンの追加モーダル（defaultDate を持つときはその日付で開く）
  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [lessonDate, setLessonDate] = useState<string | undefined>(undefined);
  const openLesson = (defaultDate?: string) => { setLessonDate(defaultDate); setLessonModalOpen(true); };
  // 追加メニュー（レッスン / 個人予定）の開閉
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const canAddLesson = customers.length > 0;

  // 絞り込み後のアイテム（"all" は全件）。個人予定は作成者で絞り込む。
  const visibleItems = useMemo(() => {
    if (filterMember === "all") return items;
    return items.filter((it) =>
      it.trainerId === filterMember || it.salesId === filterMember || it.ownerId === filterMember ||
      !!it.participantIds?.includes(filterMember)
    );
  }, [items, filterMember]);

  const openCreate = (defaultDate?: string) => setModal({ mode: "create", defaultDate });
  const openEdit = (item: ScheduleItem) => setModal({ mode: "edit", initial: item });

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

  // 「次の予定」= まだ始まっていない最も近い予定（今日でも時刻が過ぎたものは除く）。
  // 終日予定は時刻が無いため対象外。
  const nextItem = upcoming.find(
    (it) => !it.allDay && new Date(it.scheduledAt).getTime() >= Date.now(),
  );

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto pb-10">
      {/* ヘッダー */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
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
        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setAddMenuOpen((v) => !v)}
            className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-semibold rounded-xl px-3.5 py-2 hover:bg-blue-700 transition shadow-sm"
          >
            <Plus size={16} /> 追加
          </button>
          {addMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setAddMenuOpen(false)} />
              <div className="absolute right-0 mt-1 z-20 w-44 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden py-1">
                {canAddLesson && (
                  <button
                    type="button"
                    onClick={() => { setAddMenuOpen(false); openLesson(); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                  >
                    <Dumbbell size={14} className="text-blue-500" /> 通常レッスン
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setAddMenuOpen(false); openCreate(); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                >
                  <CalendarPlus size={14} className="text-green-500" /> 個人予定
                </button>
              </div>
            </>
          )}
        </div>
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
        <CalendarView items={visibleItems} isAdmin={isAdmin}
          currentMemberId={currentMemberId} onEditPersonal={openEdit}
          onAddPersonal={(ymd) => openCreate(ymd)}
          onAddLesson={canAddLesson ? (ymd) => openLesson(ymd) : undefined} />
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
                {new Date(nextItem.scheduledAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", weekday: "short", timeZone: "Asia/Tokyo" })}
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
          {groups.map((g) => (
            <DayGroup key={dayKey(g.date)} date={g.date} items={g.items} isAdmin={isAdmin}
              currentMemberId={currentMemberId} onEditPersonal={openEdit} />
          ))}
        </div>
      )}
        </>
      )}

      {modal && (
        <PersonalEventModal
          mode={modal.mode}
          initial={modal.initial}
          defaultDate={modal.defaultDate}
          members={members}
          currentMemberId={currentMemberId}
          onClose={() => setModal(null)}
        />
      )}

      {lessonModalOpen && (
        <LessonModal
          customers={customers}
          members={members}
          sessionPasses={sessionPasses}
          customerPlans={customerPlans}
          lessons={lessons}
          rentalGyms={rentalGyms}
          stores={stores}
          defaultDate={lessonDate}
          onClose={() => setLessonModalOpen(false)}
        />
      )}
    </div>
  );
}

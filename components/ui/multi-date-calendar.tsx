"use client";

// 日をまとめて選ぶカレンダー（レッスン・予定の「複数日時」で使う）。
// 日をタップすると選ばれ、もう一度タップすると外れる。時刻は持たない（呼び出し側が開始と同じ時刻で足す）。
// 2026-11-19 尚樹「カレンダーで一気に選択できるようにしたい。時間は一緒でいい」。

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

function todayYmd(): string {
  const d = new Date();
  return ymd(d.getFullYear(), d.getMonth(), d.getDate());
}

const WEEK_JA = ["日", "月", "火", "水", "木", "金", "土"];
const WEEK_EN = ["S", "M", "T", "W", "T", "F", "S"];

export function MultiDateCalendar({
  baseDate, selected, onToggle, busyDates, lang = "ja", disabled = false,
}: {
  /** 開始の日（YYYY-MM-DD）。いつも入っている日として印を付け、タップでは外せない */
  baseDate: string;
  /** 追加で選んだ日（YYYY-MM-DD） */
  selected: string[];
  onToggle: (date: string) => void;
  /** すでに予定が入っている日（小さな点を付けるだけ。選ぶことはできる） */
  busyDates?: Set<string>;
  lang?: "ja" | "en";
  disabled?: boolean;
}) {
  const init = /^\d{4}-\d{2}-\d{2}$/.test(baseDate) ? baseDate : todayYmd();
  const [view, setView] = useState({ y: Number(init.slice(0, 4)), m: Number(init.slice(5, 7)) - 1 });
  const today = todayYmd();
  const picked = new Set(selected);

  const firstDow = new Date(view.y, view.m, 1).getDay();
  const days = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  function move(n: number) {
    setView((v) => {
      const d = new Date(v.y, v.m + n, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  const title = lang === "en"
    ? new Date(view.y, view.m, 1).toLocaleDateString("en-US", { year: "numeric", month: "long" })
    : `${view.y}年${view.m + 1}月`;
  const week = lang === "en" ? WEEK_EN : WEEK_JA;

  return (
    <div className={cn("rounded-xl border border-gray-200 bg-white p-2.5 select-none", disabled && "opacity-50")}>
      <div className="flex items-center justify-between mb-1.5">
        <button type="button" onClick={() => move(-1)} aria-label={lang === "en" ? "Previous month" : "前の月"}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 active:bg-gray-200"><ChevronLeft size={18} /></button>
        <p className="text-sm font-bold text-gray-800 tabular-nums">{title}</p>
        <button type="button" onClick={() => move(1)} aria-label={lang === "en" ? "Next month" : "次の月"}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 active:bg-gray-200"><ChevronRight size={18} /></button>
      </div>
      <div className="grid grid-cols-7 text-center">
        {week.map((w, i) => (
          <span key={i} className={cn("text-[11px] font-medium py-1", i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400")}>{w}</span>
        ))}
        {cells.map((d, i) => {
          if (d == null) return <span key={i} />;
          const date = ymd(view.y, view.m, d);
          const isBase = date === baseDate;
          const isPicked = picked.has(date);
          const busy = busyDates?.has(date);
          return (
            <button
              key={i}
              type="button"
              disabled={disabled || isBase}
              aria-pressed={isBase || isPicked}
              aria-label={date}
              data-date={date}
              onClick={() => onToggle(date)}
              className="relative h-11 flex items-center justify-center"
            >
              <span className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center text-sm tabular-nums transition",
                isBase ? "bg-amber-600 text-white font-bold"
                  : isPicked ? "bg-blue-600 text-white font-bold"
                  : date === today ? "ring-1 ring-blue-400 text-blue-700 font-semibold"
                  : date < today ? "text-gray-400" : "text-gray-800",
                !isBase && !isPicked && !disabled && "active:bg-blue-100",
              )}>{d}</span>
              {busy && <span className="absolute bottom-0 w-1.5 h-1.5 rounded-full bg-emerald-500" />}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 px-1 text-[11px] text-gray-500">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-600" />{lang === "en" ? "Start date" : "開始の日"}</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-600" />{lang === "en" ? "Added" : "追加する日"}</span>
        {busyDates && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{lang === "en" ? "Already booked" : "すでに予定あり"}</span>}
      </div>
    </div>
  );
}

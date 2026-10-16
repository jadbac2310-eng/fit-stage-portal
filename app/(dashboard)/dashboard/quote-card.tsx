"use client";

import { useState } from "react";
import { Quote, Target, Lightbulb, Sparkles } from "lucide-react";
import { secretQuote, type DailyQuote } from "@/lib/daily-quote";
import type { DailyTip, DailyFortune } from "@/lib/daily-cards";

type Tab = "quote" | "mission" | "tip" | "fortune";

const TABS: { id: Tab; label: string; icon: typeof Quote }[] = [
  { id: "quote",   label: "格言",   icon: Quote },
  { id: "mission", label: "お題",   icon: Target },
  { id: "tip",     label: "豆知識", icon: Lightbulb },
  { id: "fortune", label: "運勢",   icon: Sparkles },
];

/**
 * 日替わりの1枚。
 *
 * 格言・今日のお題・豆知識・今日の運勢を、タブで切り替えて1枚にまとめている
 * （カードを4枚並べると画面が長くなり、かえって読まれないため）。
 * 「格言」を5回つづけてタップすると裏・格言が出る（気づいた人だけのお楽しみ）。
 */
export function QuoteCard({
  quote, mission, tip, fortune,
}: {
  quote: DailyQuote;
  mission: string;
  tip: DailyTip;
  fortune: DailyFortune;
}) {
  const [tab, setTab] = useState<Tab>("quote");
  const [taps, setTaps] = useState(0);
  const [secretNo, setSecretNo] = useState(0);

  const secret = tab === "quote" && taps >= 5;
  const shownQuote = secret ? secretQuote(secretNo) : quote;

  function onBodyTap() {
    if (tab !== "quote") return;
    if (secret) { setSecretNo((n) => n + 1); return; }
    setTaps((t) => t + 1);
  }

  return (
    <div className={[
      "rounded-2xl border overflow-hidden transition",
      secret ? "border-gray-800 bg-gray-900" : "border-gray-200 bg-white",
    ].join(" ")}>
      {/* タブ */}
      <div className={["flex gap-1 px-2 pt-2", secret ? "bg-gray-900" : "bg-gray-50"].join(" ")}>
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => { setTab(t.id); setTaps(0); }}
              className={[
                "flex-1 flex items-center justify-center gap-1 rounded-t-lg py-1.5 text-[11px] font-semibold transition",
                active
                  ? (secret ? "bg-gray-800 text-gray-100" : "bg-white text-gray-900")
                  : (secret ? "text-gray-500" : "text-gray-400 hover:text-gray-600"),
              ].join(" ")}
            >
              <Icon size={11} /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="p-4" onClick={onBodyTap}>
        {tab === "quote" && (
          <div className="select-none cursor-pointer">
            <p className={["text-[10px] font-semibold tracking-widest", secret ? "text-gray-500" : "text-gray-400"].join(" ")}>
              {secret ? "裏・格言" : "本日の格言"}
            </p>
            <p className={["text-sm font-bold mt-1", secret ? "text-gray-100" : "text-gray-800"].join(" ")}>
              {shownQuote.text}
            </p>
            <p className={["text-xs font-semibold mt-1", secret ? "text-gray-400" : "text-gray-500"].join(" ")}>
              ― {shownQuote.by}
            </p>
            {shownQuote.note && (
              <p className={["text-xs mt-1.5", secret ? "text-gray-400" : "text-gray-500"].join(" ")}>{shownQuote.note}</p>
            )}
            {secret && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setTaps(0); setSecretNo(0); }}
                className="text-[10px] text-gray-500 mt-2 underline"
              >
                本日の格言に戻す
              </button>
            )}
          </div>
        )}

        {tab === "mission" && (
          <div>
            <p className="text-[10px] font-semibold tracking-widest text-gray-400">今日のお題</p>
            <p className="text-sm font-bold text-gray-800 mt-1">{mission}</p>
            <p className="text-xs text-gray-400 mt-1.5">ひとつだけ。できたら今日は合格。</p>
          </div>
        )}

        {tab === "tip" && (
          <div>
            <p className="text-[10px] font-semibold tracking-widest text-gray-400">今日の豆知識</p>
            <p className="text-sm font-bold text-gray-800 mt-1">{tip.title}</p>
            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{tip.body}</p>
            <p className="text-[10px] text-gray-300 mt-1.5">お客さんにそのまま話せます。</p>
          </div>
        )}

        {tab === "fortune" && (
          <div>
            <p className="text-[10px] font-semibold tracking-widest text-gray-400">今日の運勢</p>
            <p className="text-lg font-bold text-gray-900 mt-1">
              <span className="mr-1.5">{fortune.emoji}</span>{fortune.level}
            </p>
            <p className="text-sm text-gray-700 mt-1">{fortune.message}</p>
            <p className="text-xs text-gray-500 mt-2">
              ラッキー種目：<span className="font-bold text-gray-700">{fortune.item}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

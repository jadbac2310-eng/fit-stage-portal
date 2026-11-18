"use client";

import { useState } from "react";
import Link from "next/link";
import { Quote, Target, Lightbulb, Sparkles } from "lucide-react";
import { secretQuote, type DailyQuote } from "@/lib/daily-quote";
import type { DailyTip, DailyFortune } from "@/lib/daily-cards";
import { useLang, useT } from "@/components/i18n/lang-provider";

type Tab = "quote" | "mission" | "tip" | "fortune";

const TABS: { id: Tab; label: string; en: string; icon: typeof Quote }[] = [
  { id: "quote",   label: "格言",   en: "Quote",   icon: Quote },
  { id: "mission", label: "お題",   en: "Task",    icon: Target },
  { id: "tip",     label: "豆知識", en: "Tip",     icon: Lightbulb },
  { id: "fortune", label: "運勢",   en: "Fortune", icon: Sparkles },
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
  const lang = useLang();
  const t = useT();
  const [tab, setTab] = useState<Tab>("quote");
  const [taps, setTaps] = useState(0);
  const [secretNo, setSecretNo] = useState(0);

  // 裏・格言は日本語だけ（英語のときは出さない）
  const secret = lang === "ja" && tab === "quote" && taps >= 5;
  const shownQuote = secret ? secretQuote(secretNo) : quote;

  function onBodyTap() {
    if (tab !== "quote") return;
    if (secret) { setSecretNo((n) => n + 1); return; }
    setTaps((n) => n + 1);
  }

  return (
    <div className={[
      "border overflow-hidden transition",
      secret ? "border-gray-800 bg-gray-900" : "border-[var(--portal-line)] bg-white",
    ].join(" ")}>
      {/* タブ */}
      <div className={["flex gap-1 px-2 pt-1.5", secret ? "bg-gray-900" : "bg-navy-900"].join(" ")}>
        {TABS.map((tb) => {
          const Icon = tb.icon;
          const active = tab === tb.id;
          return (
            <button
              key={tb.id}
              type="button"
              onClick={() => { setTab(tb.id); setTaps(0); }}
              className={[
                "flex-1 flex items-center justify-center gap-1 py-1.5 text-[11px] font-bold transition",
                active
                  ? (secret ? "bg-gray-800 text-gray-100" : "bg-white text-blue-700 shadow-[inset_0_3px_0_var(--portal-gold)]")
                  : (secret ? "text-gray-500" : "text-white/70 hover:text-white"),
              ].join(" ")}
            >
              <Icon size={11} /> {lang === "en" ? tb.en : tb.label}
            </button>
          );
        })}
      </div>

      <div className="p-4" onClick={onBodyTap}>
        {tab === "quote" && (
          <div className="select-none cursor-pointer">
            <p className={["text-[10px] font-semibold tracking-widest", secret ? "text-gray-500" : "text-gray-400"].join(" ")}>
              {secret ? "裏・格言" : t("本日の格言", "Quote of the day")}
            </p>
            <p className={["text-base font-bold mt-1", secret ? "text-gray-100" : "text-gray-900"].join(" ")}>
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
                {t("本日の格言に戻す", "Back")}
              </button>
            )}
          </div>
        )}

        {tab === "mission" && (
          <div>
            <p className="text-[10px] font-semibold tracking-widest text-gray-400">{t("今日のお題", "Today's task")}</p>
            <p className="text-sm font-bold text-gray-800 mt-1">{mission}</p>
            <p className="text-xs text-gray-400 mt-1.5">{t("ひとつだけ。できたら今日は合格。", "Just one. Do it and today's a win.")}</p>
          </div>
        )}

        {tab === "tip" && (
          <div>
            <p className="text-[10px] font-semibold tracking-widest text-gray-400">{t("今日の豆知識", "Tip of the day")}</p>
            <p className="text-sm font-bold text-gray-800 mt-1">{tip.title}</p>
            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{tip.body}</p>
            <p className="text-[10px] text-gray-300 mt-1.5">{t("お客さんにそのまま話せます。", "Something you can share with clients.")}</p>
          </div>
        )}

        {tab === "fortune" && fortune.star && (
          <div>
            <p className="text-[10px] font-semibold tracking-widest text-gray-400">今日の一手・{fortune.star.type}</p>
            <p className="text-lg font-bold text-gray-900 mt-1">
              <span className="mr-1.5">{fortune.emoji}</span>{fortune.star.phase}
              <span className="text-sm font-semibold text-gray-500 ml-2">{fortune.star.name}</span>
            </p>
            <p className="text-sm text-gray-700 mt-1">{fortune.message}</p>
            <p className="text-xs text-gray-700 mt-2">
              今日の一手：<span className="font-bold">{fortune.star.tip}</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              今月は {fortune.star.month}（{fortune.star.monthName}）・ラッキー種目：<span className="font-bold text-gray-700">{fortune.item}</span>
              <Link href="/fortune" className="ml-2 underline text-indigo-600">詳しく</Link>
            </p>
          </div>
        )}
        {tab === "fortune" && !fortune.star && (
          <div>
            <p className="text-[10px] font-semibold tracking-widest text-gray-400">{t("今日の運勢", "Today's fortune")}</p>
            <p className="text-lg font-bold text-gray-900 mt-1">
              <span className="mr-1.5">{fortune.emoji}</span>{fortune.level}
            </p>
            <p className="text-sm text-gray-700 mt-1">{fortune.message}</p>
            <p className="text-xs text-gray-500 mt-2">
              {t("ラッキー種目：", "Lucky exercise: ")}<span className="font-bold text-gray-700">{fortune.item}</span>
            </p>
            {/* 「今日の一手」（星まわり）は日本語だけなので、英語のときは案内しない */}
            {lang === "ja" && (
              <p className="text-xs text-indigo-600 mt-2">
                <Link href="/fortune" className="underline">生年月日を入れると、あなた専用の「今日の一手」に変わります</Link>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

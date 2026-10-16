"use client";

import { useState } from "react";
import { Quote } from "lucide-react";
import { secretQuote, type DailyQuote } from "@/lib/daily-quote";

/**
 * 本日の格言。
 *
 * 5回つづけてタップすると「裏・格言」が出る（気づいた人だけのお楽しみ）。
 * もう一度タップすると次の裏・格言、長押しせずに「戻す」で通常に戻る。
 */
export function QuoteCard({ quote }: { quote: DailyQuote }) {
  const [taps, setTaps] = useState(0);
  const [secretNo, setSecretNo] = useState(0);

  const secret = taps >= 5;
  const shown = secret ? secretQuote(secretNo) : quote;

  function onTap() {
    if (secret) { setSecretNo((n) => n + 1); return; }
    setTaps((t) => t + 1);
  }

  return (
    <div
      onClick={onTap}
      className={[
        "rounded-2xl border p-4 cursor-pointer select-none transition",
        secret ? "border-gray-800 bg-gray-900" : "border-gray-200 bg-white hover:border-gray-300",
      ].join(" ")}
    >
      <div className="flex items-start gap-2.5">
        <Quote size={15} className={secret ? "text-gray-600 flex-shrink-0 mt-0.5" : "text-gray-300 flex-shrink-0 mt-0.5"} />
        <div className="min-w-0">
          <p className={["text-[10px] font-semibold tracking-widest", secret ? "text-gray-500" : "text-gray-400"].join(" ")}>
            {secret ? "裏・格言" : "本日の格言"}
          </p>
          <p className={["text-sm font-bold mt-1", secret ? "text-gray-100" : "text-gray-800"].join(" ")}>
            {shown.text}
          </p>
          <p className={["text-xs font-semibold mt-1", secret ? "text-gray-400" : "text-gray-500"].join(" ")}>
            ― {shown.by}
          </p>
          {shown.note && (
            <p className={["text-xs mt-1.5", secret ? "text-gray-400" : "text-gray-500"].join(" ")}>{shown.note}</p>
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
      </div>
    </div>
  );
}

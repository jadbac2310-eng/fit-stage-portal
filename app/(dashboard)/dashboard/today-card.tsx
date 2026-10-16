import Link from "next/link";
import { Quote, ChevronRight, PhoneCall } from "lucide-react";
import type { TodayHeadline, Milestone, FollowUp } from "@/lib/highlights-types";
import type { DailyQuote } from "@/lib/daily-quote";

/**
 * 開いていちばん最初に目に入るところ。
 *
 * 数字だけだと「見せられている」感じになるので、今日の動き・お客さまの節目・
 * 声をかけたほうがいい人・その日の格言を、1枚にまとめて置く。
 * サーバー側で作る静的なHTMLなので、表示が重くなることはない。
 */
export function TodayCard({
  headline, milestones, quote, follows,
}: {
  headline: TodayHeadline;
  milestones: Milestone[];
  quote: DailyQuote;
  follows: FollowUp[];
}) {
  const diff = headline.monthCount - headline.lastMonthCount;
  const topFollows = follows.slice(0, 5);

  return (
    <div className="mb-6 space-y-3">
      {/* 今日の動き */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 p-4 text-white shadow-sm">
        <p className="text-[11px] font-semibold text-blue-100 uppercase tracking-widest">今日のFIT STAGE</p>
        {headline.lessonCount === 0 ? (
          <p className="text-lg font-bold mt-1">今日の予定は入っていません</p>
        ) : (
          <p className="text-lg font-bold mt-1">
            今日は {headline.lessonCount}レッスン・{headline.customerCount}名が来ます
          </p>
        )}
        <p className="text-xs text-blue-100 mt-1">
          今月はチームで{headline.monthCount}本目
          {headline.lastMonthCount > 0 && (
            <>（先月の今日は{headline.lastMonthCount}本{diff === 0 ? "・同じペース" : diff > 0 ? `・${diff}本ペースが速い` : `・${-diff}本ぶん遅い`}）</>
          )}
        </p>
      </div>

      {/* 今日の節目 */}
      {milestones.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-bold text-amber-700 mb-2">今日の節目</p>
          <div className="space-y-1.5">
            {milestones.map((m) => (
              <p key={m.customerId} className="text-sm text-amber-900">
                <span className="mr-1">{m.emoji}</span>
                <span className="font-bold">{m.customerName}</span>さん、{m.label}
              </p>
            ))}
          </div>
          <p className="text-[11px] text-amber-700 mt-2">ひとこと声をかけると喜ばれます。</p>
        </div>
      )}

      {/* 声かけリスト */}
      {topFollows.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <PhoneCall size={13} className="text-rose-500" />
            <p className="text-xs font-bold text-gray-700">声をかけたほうがいい人（{follows.length}名）</p>
          </div>
          <div className="space-y-1">
            {topFollows.map((f) => (
              <Link
                key={f.customerId}
                href={`/lessons/regular?q=${encodeURIComponent(f.customerName)}`}
                className="flex items-center gap-2 rounded-lg bg-gray-50 px-2.5 py-2 hover:bg-gray-100 transition"
              >
                <span className="text-sm font-semibold text-gray-800 truncate">{f.customerName}</span>
                <span className="text-[11px] text-gray-500 truncate">{f.reason}</span>
                <ChevronRight size={13} className="ml-auto flex-shrink-0 text-gray-300" />
              </Link>
            ))}
          </div>
          {follows.length > topFollows.length && (
            <p className="text-[11px] text-gray-400 mt-1.5">ほか {follows.length - topFollows.length}名</p>
          )}
        </div>
      )}

      {/* 本日の格言 */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex items-start gap-2.5">
          <Quote size={15} className="text-gray-300 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-gray-800">{quote.text}</p>
            {quote.note && <p className="text-xs text-gray-500 mt-1">{quote.note}</p>}
            <p className="text-[10px] text-gray-300 mt-1.5">本日の格言</p>
          </div>
        </div>
      </div>
    </div>
  );
}

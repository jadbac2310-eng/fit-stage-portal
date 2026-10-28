import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { QuoteCard } from "./quote-card";
import type { TodayHeadline, Milestone } from "@/lib/highlights-types";
import type { DailyQuote } from "@/lib/daily-quote";
import type { DailyTip, DailyFortune } from "@/lib/daily-cards";

/**
 * 開いていちばん最初に目に入るところ。
 *
 * 数字だけだと「見せられている」感じになるので、今日の動き・お客さまの節目・
 * その日の格言を、1枚にまとめて置く。声をかけたい人は「FIT STAGE のいま」の中へ移した。
 * サーバー側で作る静的なHTMLなので、表示が重くなることはない。
 */
export function TodayCard({
  headline, teamHeadline, milestones, quote, mission, tip, fortune,
}: {
  /** 自分の担当ぶん */
  headline: TodayHeadline;
  /** FIT STAGE全体（全員が見られる） */
  teamHeadline: TodayHeadline;
  milestones: Milestone[];
  quote: DailyQuote;
  mission: string;
  tip: DailyTip;
  fortune: DailyFortune;
}) {
  const diff = teamHeadline.monthCount - teamHeadline.lastMonthCount;

  return (
    <div className="mb-6 space-y-3">
      {/* 本日の格言（いちばん上。開いて最初に目に入るところ） */}
      <QuoteCard quote={quote} mission={mission} tip={tip} fortune={fortune} />

      {/* 今日の動き（FIT STAGE全体＋自分の担当）。
          数字だけ見せても誰が来るのか分からないので、タップでその日の予定に飛ばす。
          全体ぶんは全員分のスケジュール、自分の担当ぶんは自分のスケジュールを開く。 */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 p-4 text-white shadow-sm">
        <Link href="/schedule?member=all" className="block hover:opacity-90 transition">
          <p className="text-[11px] font-semibold text-blue-100 uppercase tracking-widest">今日のFIT STAGE</p>
          {teamHeadline.lessonCount === 0 ? (
            <p className="text-lg font-bold mt-1">今日の予定は入っていません</p>
          ) : (
            <p className="text-lg font-bold mt-1 flex items-start gap-1">
              <span>今日は {teamHeadline.lessonCount}レッスン・{teamHeadline.customerCount}名が来ます</span>
              <ChevronRight size={18} className="mt-1 flex-shrink-0 text-blue-100" />
            </p>
          )}
          <p className="text-xs text-blue-100 mt-1">
            今月はチームで{teamHeadline.monthCount}本目
            {teamHeadline.lastMonthCount > 0 && (
              <>（先月の今日は{teamHeadline.lastMonthCount}本{diff === 0 ? "・同じペース" : diff > 0 ? `・${diff}本ペースが速い` : `・${-diff}本ぶん遅い`}）</>
            )}
          </p>
          {teamHeadline.lessonCount > 0 && (
            <p className="text-[11px] text-blue-100/90 mt-1">タップすると今日の予定（全員ぶん）を表示します</p>
          )}
        </Link>

        <Link href="/schedule" className="block mt-3 pt-3 border-t border-white/25 hover:opacity-90 transition">
          <p className="text-[11px] font-semibold text-blue-100">あなたの担当</p>
          <p className="text-sm font-bold mt-0.5 flex items-start gap-1">
            <span>
              {headline.lessonCount === 0
                ? "今日の予定はありません"
                : `今日は ${headline.lessonCount}レッスン・${headline.customerCount}名`}
              <span className="font-semibold text-blue-100"> ／ 今月{headline.monthCount}本</span>
            </span>
            <ChevronRight size={15} className="mt-0.5 flex-shrink-0 text-blue-100" />
          </p>
        </Link>
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
    </div>
  );
}

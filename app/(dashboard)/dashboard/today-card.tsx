import Link from "next/link";
import { ChevronRight, PhoneCall } from "lucide-react";
import { QuoteCard } from "./quote-card";
import type { TodayHeadline, Milestone, FollowUp } from "@/lib/highlights-types";
import type { DailyQuote } from "@/lib/daily-quote";
import type { DailyTip, DailyFortune } from "@/lib/daily-cards";

/**
 * 開いていちばん最初に目に入るところ。
 *
 * 数字だけだと「見せられている」感じになるので、今日の動き・お客さまの節目・
 * 声をかけたほうがいい人・その日の格言を、1枚にまとめて置く。
 * サーバー側で作る静的なHTMLなので、表示が重くなることはない。
 */
/** 声かけリストの1行。上位5名ぶんと「ほか◯名」で同じ見た目にするため共通にする */
function FollowRow({ follow }: { follow: FollowUp }) {
  return (
    <Link
      href={`/lessons/regular?q=${encodeURIComponent(follow.customerName)}`}
      className="flex items-center gap-2 rounded-lg bg-gray-50 px-2.5 py-2 hover:bg-gray-100 transition"
    >
      <span className="text-sm font-semibold text-gray-800 truncate">{follow.customerName}</span>
      <span className="text-[11px] text-gray-500 truncate">{follow.reason}</span>
      <ChevronRight size={13} className="ml-auto flex-shrink-0 text-gray-300" />
    </Link>
  );
}

export function TodayCard({
  headline, teamHeadline, milestones, quote, mission, tip, fortune, follows, unassigned = [],
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
  /** 担当営業が自分のお客さまだけ（画面側で絞り込み済み） */
  follows: FollowUp[];
  /** 担当営業が未設定で、誰の画面にも出ていない人数（管理者のみ） */
  unassigned?: FollowUp[];
}) {
  const diff = teamHeadline.monthCount - teamHeadline.lastMonthCount;
  const topFollows = follows.slice(0, 5);
  const restFollows = follows.slice(5);

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

      {/* 声かけリスト（担当営業が自分のお客さまだけ） */}
      {(topFollows.length > 0 || unassigned.length > 0) && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <PhoneCall size={13} className="text-rose-500" />
            <p className="text-xs font-bold text-gray-700">声をかけたほうがいい人（{follows.length}名）</p>
          </div>
          <div className="space-y-1">
            {topFollows.length === 0 && (
              <p className="text-xs text-gray-400 py-1">自分が担当のお客さまで、声をかけたほうがいい人はいません。</p>
            )}
            {topFollows.map((f) => <FollowRow key={f.customerId} follow={f} />)}
          </div>
          {/* 残りは「ほか3名」で隠さず、その場で開けるようにする。
              誰か分からないままだと声のかけようがないため。
              details を使うので JavaScript は要らない（表示は重くならない）。 */}
          {restFollows.length > 0 && (
            <details className="mt-1.5">
              <summary className="cursor-pointer list-none text-[11px] font-semibold text-blue-600 hover:underline">
                ほか {restFollows.length}名を表示
              </summary>
              <div className="space-y-1 mt-1">
                {restFollows.map((f) => <FollowRow key={f.customerId} follow={f} />)}
              </div>
            </details>
          )}
          {unassigned.length > 0 && (
            <div className="mt-2 rounded-lg bg-amber-50 px-2.5 py-2">
              <p className="text-[11px] font-semibold text-amber-800">
                担当営業が未設定（誰の画面にも出ません）
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {unassigned.map((u) => (
                  <Link
                    key={u.customerId}
                    href={`/master/customers?q=${encodeURIComponent(u.customerName)}`}
                    className="rounded-full border border-amber-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-amber-800 hover:bg-amber-100"
                  >
                    {u.customerName}
                  </Link>
                ))}
              </div>
              <p className="text-[10px] text-amber-700 mt-1">名前をタップすると顧客マスタで開けます。</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

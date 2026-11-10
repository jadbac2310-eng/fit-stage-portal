import Link from "next/link";
import { QuoteCard } from "./quote-card";
import { SectionBox } from "@/components/ui/section-box";
import { cn } from "@/lib/cn";
import type { TodayRow, Milestone } from "@/lib/highlights-types";
import type { DailyQuote } from "@/lib/daily-quote";
import type { DailyTip, DailyFortune } from "@/lib/daily-cards";

/** 表に出す行数。これより多い日は残りを件数で示して、スケジュールへ飛ばす */
const MAX_ROWS = 8;

const STATE: Record<TodayRow["state"], { label: string; cls: string }> = {
  done:     { label: "完了", cls: "bg-emerald-50 border-emerald-200 text-emerald-700" },
  now:      { label: "いま", cls: "bg-gold-500 border-gold-500 text-white" },
  upcoming: { label: "予定", cls: "bg-white border-[var(--portal-line)] text-gray-500" },
  allday:   { label: "終日", cls: "bg-blue-50 border-[var(--portal-line)] text-blue-700" },
};

/**
 * 開いていちばん最初に目に入るところ。
 *
 * 日替わりの1枚（格言など）と「本日の予定」。
 * 本日の予定は、本人の今日の予定を時刻順の表で出す（2026-11-10。レッスン・体験と、面談や訪問などの個人予定）。
 * 全員ぶんは本数だけを右に出して、押すと全員のスケジュールへ。
 * 今月の本数は下の「今月のFIT STAGE」にだけ出す。ここは今日のことだけ。
 */
export function TodayCard({
  rows, teamCount, milestones, quote, mission, tip, fortune,
}: {
  /** 本人の今日の予定（時刻順） */
  rows: TodayRow[];
  /** 今日のレッスンの本数（全員ぶん） */
  teamCount: number;
  milestones: Milestone[];
  quote: DailyQuote;
  mission: string;
  tip: DailyTip;
  fortune: DailyFortune;
}) {
  const shown = rows.slice(0, MAX_ROWS);

  return (
    <div className="space-y-3">
      {/* 日替わりの1枚（格言・お題・豆知識・運勢） */}
      <QuoteCard quote={quote} mission={mission} tip={tip} fortune={fortune} />

      <SectionBox title="本日の予定" action={{ label: "スケジュールへ", href: "/schedule" }}>
        {/* 左が自分の予定の件数、右が全員ぶんのレッスン本数（押すと全員のスケジュール） */}
        <div className="grid grid-cols-2 border-b border-[var(--portal-line)]">
          <Link href="/schedule" className="px-3 py-2.5 flex items-baseline gap-1.5 hover:bg-gray-50 transition">
            <span className="text-xs text-gray-500">あなたの予定</span>
            <span className="text-2xl font-bold text-blue-700 tabular-nums leading-none">{rows.length}</span>
            <span className="text-xs font-bold">件</span>
          </Link>
          <Link href="/schedule?member=all" className="px-3 py-2.5 flex items-baseline gap-1.5 border-l border-[var(--portal-line)] hover:bg-gray-50 transition">
            <span className="text-xs text-gray-500">全員のレッスン</span>
            <span className="text-2xl font-bold text-gray-700 tabular-nums leading-none">{teamCount}</span>
            <span className="text-xs font-bold">本</span>
          </Link>
        </div>

        {rows.length === 0 ? (
          <p className="px-3 py-5 text-sm text-gray-500 text-center">今日のあなたの予定は入っていません</p>
        ) : (
          <ul>
            {shown.map((r) => (
              <li key={`${r.kind}-${r.id}`} className="border-b border-[var(--portal-line)] last:border-b-0">
                <Link href={r.href} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition">
                  <span className={cn("w-11 flex-shrink-0 text-sm font-bold tabular-nums", r.state === "done" ? "text-gray-400" : "text-blue-700")}>
                    {r.time}
                  </span>
                  <span className={cn("flex-shrink-0 border px-1.5 py-px text-[10px] font-bold", STATE[r.state].cls)}>
                    {STATE[r.state].label}
                  </span>
                  {/* 名前を優先して広く取る。場所は残った幅に入るぶんだけ */}
                  <span className={cn("flex-1 min-w-0 truncate text-sm", r.state === "done" ? "text-gray-400" : "font-bold text-gray-900")}>
                    {r.name}
                    {r.kind === "trial" && <span className="ml-1.5 text-[10px] font-bold text-purple-600">体験</span>}
                  </span>
                  {r.place && (
                    <span className="flex-shrink min-w-0 max-w-[38%] truncate text-right text-[11px] text-gray-500">{r.place}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
        {rows.length > MAX_ROWS && (
          <Link href="/schedule" className="block border-t border-[var(--portal-line)] px-3 py-2 text-center text-xs text-blue-600 underline underline-offset-2">
            ほか {rows.length - MAX_ROWS} 件を見る
          </Link>
        )}
      </SectionBox>

      {/* 今日の節目 */}
      {milestones.length > 0 && (
        <div className="border border-gold-200 bg-gold-50 p-3">
          <p className="text-xs font-bold text-gold-600 mb-2">今日の節目</p>
          <div className="space-y-1.5">
            {milestones.map((m) => (
              <p key={m.customerId} className="text-sm text-gray-900">
                <span className="mr-1">{m.emoji}</span>
                <span className="font-bold">{m.customerName}</span>さん、{m.label}
              </p>
            ))}
          </div>
          <p className="text-[11px] text-gold-600 mt-2">ひとこと声をかけると喜ばれます。</p>
        </div>
      )}
    </div>
  );
}

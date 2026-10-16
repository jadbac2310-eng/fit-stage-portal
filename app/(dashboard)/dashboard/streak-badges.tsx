import type { Streak, Badge } from "@/lib/badges-types";

/**
 * 連続記録と称号。
 *
 * 順位は出さない。他人と比べるのではなく、自分の記録を切らさないことだけを見せる。
 */
export function StreakBadges({ streak, badges }: { streak: Streak; badges: Badge[] }) {
  if (streak.weeks === 0 && badges.length === 0) return null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 mb-6">
      {streak.weeks > 0 && (
        <div className="flex items-baseline gap-2">
          <span className="text-xl">🔥</span>
          <p className="text-base font-bold text-gray-900">
            {streak.weeks}週連続でレッスンしています
          </p>
        </div>
      )}
      {streak.weeks > 0 && (
        <p className="text-xs text-gray-400 mt-1">
          {streak.thisWeek > 0 ? `今週は${streak.thisWeek}本` : "今週はまだ0本（1本やれば記録がのびます）"}
          {streak.best > streak.weeks && ` ・ 自己ベストは${streak.best}週`}
          {streak.best === streak.weeks && streak.weeks >= 2 && " ・ 自己ベスト更新中"}
        </p>
      )}

      {badges.length > 0 && (
        <div className={streak.weeks > 0 ? "mt-3 pt-3 border-t border-gray-100" : ""}>
          <div className="flex flex-wrap gap-1.5">
            {badges.map((b) => (
              <span
                key={b.id}
                title={b.note}
                className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700"
              >
                <span>{b.emoji}</span>
                {b.label}
                {b.isNew && (
                  <span className="ml-0.5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white">NEW</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

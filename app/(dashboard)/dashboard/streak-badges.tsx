import type { Streak, Badge } from "@/lib/badges-types";
import type { SalesStreak } from "@/lib/sales-stats";
import { SectionBox } from "@/components/ui/section-box";
import { makeT, type Lang } from "@/lib/i18n";

/** 称号の英語（称号の文は lib で日本語で作っているので、決まった形だけ英語に置きかえる。合わないものは日本語のまま） */
function badgeLabelEn(label: string): string {
  const rules: [RegExp, (m: RegExpMatchArray) => string][] = [
    [/^通算(\d+)レッスン$/, (m) => `${m[1]} sessions total`],
    [/^今月(\d+)本$/, (m) => `${m[1]} sessions this month`],
    [/^(\d+)週連続$/, (m) => `${m[1]}-week streak`],
    [/^今月キャンセル0$/, () => "No cancellations this month"],
    [/^成約率(\d+)%$/, (m) => `${m[1]}% close rate`],
    [/^通算(\d+)成約$/, (m) => `${m[1]} sign-ups total`],
    [/^今月(\d+)成約$/, (m) => `${m[1]} sign-ups this month`],
    [/^(\d+)週連続で成約$/, (m) => `${m[1]}-week sign-up streak`],
    [/^カバー率(\d+)%$/, (m) => `${m[1]}% booked ahead`],
  ];
  for (const [re, f] of rules) { const m = label.match(re); if (m) return f(m); }
  return label;
}

/**
 * 連続記録と称号。レッスンの連続と成約の連続を1枚にまとめる
 * （2枚に分かれていると 🔥 が2回出て、画面がごちゃつくため）。
 *
 * 順位は出さない。他人と比べるのではなく、自分の記録を切らさないことだけを見せる。
 * 営業専門の人はレッスンの連続が0なので、成約の連続だけが出る。
 */
function BadgeChips({ badges, lang }: { badges: Badge[]; lang: Lang }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((b) => (
        <span
          key={b.id}
          title={lang === "en" ? undefined : b.note}
          className="inline-flex items-center gap-1 border border-[var(--portal-line)] bg-blue-50 px-2 py-1 text-xs font-semibold text-gray-700"
        >
          <span>{b.emoji}</span>
          {lang === "en" ? badgeLabelEn(b.label) : b.label}
          {b.isNew && (
            <span className="ml-0.5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white">NEW</span>
          )}
        </span>
      ))}
    </div>
  );
}

export function StreakBadges({
  streak, badges, salesStreak, salesBadges = [], lang = "ja",
}: {
  lang?: Lang;
  streak: Streak;
  badges: Badge[];
  salesStreak?: SalesStreak;
  salesBadges?: Badge[];
}) {
  const hasLesson = streak.weeks > 0;
  const hasSales = !!salesStreak && salesStreak.weeks > 0;
  const allBadges = [...badges, ...salesBadges];
  const t = makeT(lang);
  if (!hasLesson && !hasSales && allBadges.length === 0) return null;

  return (
    <SectionBox title={t("連続記録", "Streaks")} padded>
      {hasLesson && (
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl">🔥</span>
            <p className="text-base font-bold text-gray-900">
              {t(`${streak.weeks}週連続でレッスンしています`, `${streak.weeks}-week coaching streak`)}
            </p>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {streak.thisWeek > 0 ? t(`今週は${streak.thisWeek}本`, `${streak.thisWeek} this week`) : t("今週はまだ0本（1本やれば記録がのびます）", "None yet this week (one session keeps it going)")}
            {streak.best > streak.weeks && t(` ・ 自己ベストは${streak.best}週`, ` · best: ${streak.best} weeks`)}
            {streak.best === streak.weeks && streak.weeks >= 2 && t(" ・ 自己ベスト更新中", " · new personal best")}
          </p>
        </div>
      )}

      {hasSales && salesStreak && (
        <div className={hasLesson ? "mt-3 pt-3 border-t border-gray-100" : ""}>
          <div className="flex items-baseline gap-2">
            <span className="text-xl">🤝</span>
            <p className="text-base font-bold text-gray-900">
              {t(`${salesStreak.weeks}週連続で成約が出ています`, `${salesStreak.weeks}-week sign-up streak`)}
            </p>
          </div>
          {salesStreak.best > salesStreak.weeks ? (
            <p className="text-xs text-gray-400 mt-1">{t(`自己ベストは${salesStreak.best}週`, `Best: ${salesStreak.best} weeks`)}</p>
          ) : salesStreak.weeks >= 2 ? (
            <p className="text-xs text-gray-400 mt-1">{t("自己ベスト更新中", "New personal best")}</p>
          ) : null}
        </div>
      )}

      {allBadges.length > 0 && (
        <div className={hasLesson || hasSales ? "mt-3 pt-3 border-t border-gray-100" : ""}>
          <BadgeChips badges={allBadges} lang={lang} />
        </div>
      )}
    </SectionBox>
  );
}

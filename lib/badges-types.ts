// 連続記録と称号（バッジ）。
//
// 新しくデータベースを読まない。すでに画面が読み込んでいるレッスンから数えるだけ。
// 順位は出さない（人と比べるのではなく、自分の記録を伸ばす形にする）。

import type { Lesson } from "./lessons-types";
import { isBillableLessonStatus } from "./lessons-types";
import type { TrialLesson } from "./trial-lessons-types";

const JST = 9 * 3600 * 1000;
const DAY = 86400000;

/** ISO(UTC) → 日本時間の 'YYYY-MM-DD' */
function jstDay(iso: string | number | Date): string {
  const t = typeof iso === "number" ? iso : new Date(iso).getTime();
  return new Date(t + JST).toISOString().slice(0, 10);
}

/** その日が属する週（月曜はじまり）の月曜日を 'YYYY-MM-DD' で返す */
export function weekStart(day: string): string {
  const t = Date.parse(`${day}T00:00:00Z`);
  const dow = new Date(t).getUTCDay();          // 0=日
  const back = (dow + 6) % 7;                   // 月曜までさかのぼる日数
  return new Date(t - back * DAY).toISOString().slice(0, 10);
}

function prevWeek(w: string): string {
  return new Date(Date.parse(`${w}T00:00:00Z`) - 7 * DAY).toISOString().slice(0, 10);
}

/** 自分が担当して実施したレッスン（通常＋体験）の日付を古い順で */
export function myDoneDays(
  lessons: Lesson[], trialLessons: TrialLesson[], memberId?: string,
): string[] {
  if (!memberId) return [];
  const days = [
    ...lessons.filter((l) => l.trainerMemberId === memberId && isBillableLessonStatus(l.status))
      .map((l) => jstDay(l.scheduledAt)),
    ...trialLessons.filter((t) => t.trainerMemberId === memberId && t.status === "completed")
      .map((t) => jstDay(t.scheduledAt)),
  ];
  return days.sort();
}

// ─── 連続記録 ──────────────────────────────────────────
export interface Streak {
  /** 今つながっている週数 */
  weeks:     number;
  /** これまでの最長（週） */
  best:      number;
  /** 今週すでに実施した本数 */
  thisWeek:  number;
}

/**
 * 「何週連続でレッスンをしているか」。
 *
 * 日数ではなく週で数える。休みの日があるのは当たり前なので、日で数えると
 * 必ず途切れてしまい、記録として意味を持たないため。
 * 週の始まりは月曜。今週まだ1本も実施していなくても、先月までつながっていれば
 * 記録は生きている扱いにする（週の途中で0になって見えると気持ちが切れるため）。
 */
export function weeklyStreak(
  lessons: Lesson[], trialLessons: TrialLesson[], memberId?: string,
  now: Date | number = Date.now(),
): Streak {
  const days = myDoneDays(lessons, trialLessons, memberId);
  const today = jstDay(now);
  const doneWeeks = new Set(days.filter((d) => d <= today).map(weekStart));
  const thisWeekStart = weekStart(today);
  const thisWeek = days.filter((d) => weekStart(d) === thisWeekStart && d <= today).length;

  // 今つながっている週数（今週が空なら先週から数える）
  let weeks = 0;
  let w = doneWeeks.has(thisWeekStart) ? thisWeekStart : prevWeek(thisWeekStart);
  while (doneWeeks.has(w)) { weeks++; w = prevWeek(w); }

  // これまでの最長
  let best = 0, run = 0;
  const sorted = Array.from(doneWeeks).sort();
  for (let i = 0; i < sorted.length; i++) {
    run = i > 0 && sorted[i] === new Date(Date.parse(`${sorted[i - 1]}T00:00:00Z`) + 7 * DAY).toISOString().slice(0, 10)
      ? run + 1 : 1;
    if (run > best) best = run;
  }

  return { weeks, best: Math.max(best, weeks), thisWeek };
}

// ─── 称号（バッジ） ────────────────────────────────────
export interface Badge {
  id:    string;
  emoji: string;
  label: string;
  note?: string;
  /** 今月とれたばかりなら true（画面で NEW を付ける） */
  isNew?: boolean;
}

const TOTAL_STEPS  = [10, 50, 100, 200, 300, 500, 1000];
const MONTH_STEPS  = [10, 20, 30, 40];
const STREAK_STEPS = [4, 12, 26, 52];

/** 到達している中でいちばん大きい段 */
function topStep(steps: number[], value: number): number | null {
  let hit: number | null = null;
  for (const s of steps) if (value >= s) hit = s;
  return hit;
}

/**
 * いま持っている称号。並びすぎると見なくなるので、種類ごとに最上位の1つだけ出す。
 */
export function earnedBadges(
  lessons: Lesson[], trialLessons: TrialLesson[], memberId: string | undefined,
  streak: Streak, now: Date | number = Date.now(),
): Badge[] {
  const days = myDoneDays(lessons, trialLessons, memberId);
  const today = jstDay(now);
  const month = today.slice(0, 7);
  const past = days.filter((d) => d <= today);
  const out: Badge[] = [];

  // ① 通算
  const total = past.length;
  const t = topStep(TOTAL_STEPS, total);
  if (t) {
    // その段に到達した日が今月なら NEW
    const reachedAt = past[t - 1];
    out.push({
      id: `total-${t}`, emoji: "🏅", label: `通算${t}レッスン`,
      note: `いまの通算は${total}本`, isNew: reachedAt?.slice(0, 7) === month,
    });
  }

  // ② 今月の本数
  const inMonth = past.filter((d) => d.slice(0, 7) === month).length;
  const m = topStep(MONTH_STEPS, inMonth);
  if (m) out.push({ id: `month-${m}`, emoji: "🌟", label: `今月${m}本`, note: `今月は${inMonth}本`, isNew: true });

  // ③ 連続記録
  const s = topStep(STREAK_STEPS, streak.weeks);
  if (s) out.push({ id: `streak-${s}`, emoji: "🔥", label: `${s}週連続`, note: `いま${streak.weeks}週つながっています` });

  // ④ 今月キャンセル0（10本以上やっている人だけ。少ない本数で出しても意味がない）
  if (memberId && inMonth >= 10) {
    const cancelled = lessons.filter(
      (l) => l.trainerMemberId === memberId && l.status === "cancelled" &&
             jstDay(l.scheduledAt).slice(0, 7) === month && jstDay(l.scheduledAt) <= today,
    ).length;
    if (cancelled === 0) out.push({ id: "no-cancel", emoji: "💪", label: "今月キャンセル0", isNew: true });
  }

  // ⑤ 体験の成約率（今月3件以上やった人だけ）
  if (memberId) {
    const held = trialLessons.filter(
      (t2) => (t2.trainerMemberId === memberId || t2.salesMemberId === memberId) &&
              t2.status === "completed" && jstDay(t2.scheduledAt).slice(0, 7) === month,
    );
    const got = held.filter((t2) => t2.contracted === true).length;
    if (held.length >= 3) {
      const rate = Math.round((got / held.length) * 100);
      if (rate >= 50) {
        out.push({ id: "conv-50", emoji: "🎯", label: `成約率${rate}%`, note: `${held.length}件中${got}件`, isNew: true });
      }
    }
  }

  return out;
}

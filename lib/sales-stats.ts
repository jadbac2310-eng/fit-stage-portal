// 営業のための数字。
//
// これまで連続記録も称号も「自分が指導したレッスン」基準だったので、
// 営業専任の人には何も出ていなかった。営業の仕事に合わせた数字をここで作る。
//
// 新しくデータベースは読まない。すでに画面が読み込んでいるデータから計算する。

import type { Customer } from "./customers-types";
import type { Lesson } from "./lessons-types";
import type { TrialLesson } from "./trial-lessons-types";
import { jstDay } from "./highlights-types";
import { weekStart, type Badge } from "./badges-types";

const DAY = 86400000;

function prevWeek(w: string): string {
  return new Date(Date.parse(`${w}T00:00:00Z`) - 7 * DAY).toISOString().slice(0, 10);
}
function daysAgo(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) - n * DAY).toISOString().slice(0, 10);
}

// ─── 次の予定カバー率 ──────────────────────────────────
export interface Coverage {
  /** 担当しているお客さま（在籍中）の人数 */
  total:   number;
  /** そのうち、次の予定が入っている人数 */
  covered: number;
  /** 割合（%） */
  rate:    number;
  /** 1週間前の同じ時点での割合。比べられないときは null */
  lastRate: number | null;
  /** 次の予定が入っていない人（声をかける相手） */
  uncovered: { customerId: string; customerName: string }[];
}

/**
 * 「次の予約が入っている状態をつくる」のが営業の仕事なので、それをそのまま数字にする。
 *
 * 1週間前との比較は、その時点で分かっていた予定だけで数え直す
 * （レッスンの作成日時を見るので、あとから入れた予定は当時の数には入らない）。
 */
export function nextVisitCoverage(
  customers: Customer[],
  lessons: Lesson[],
  trialLessons: TrialLesson[],
  memberId?: string,
  now: Date | number = Date.now(),
): Coverage {
  const today = jstDay(now);
  const mine = memberId
    ? customers.filter((c) => c.salesMemberId === memberId && c.status === "active")
    : [];

  // 「この日の時点で、その先の予定があったか」
  //
  // 今日ぶんは、いま入っている予定をそのまま見る。
  // 1週間前との比較のときだけ、その日までに作られた予定に限る（past=true）。
  // そうしないと「先週より増えた／減った」が正しく出ない。
  const hasFutureAt = (customerId: string, at: string, past = false): boolean => {
    const ok = (cid: string, iso: string, status: string, createdAt?: string) =>
      cid === customerId && status !== "cancelled" && jstDay(iso) > at &&
      (!past || !createdAt || jstDay(createdAt) <= at);
    return lessons.some((l) => ok(l.customerId, l.scheduledAt, l.status, l.createdAt))
      || trialLessons.some((t) => ok(t.customerId, t.scheduledAt, t.status, t.createdAt));
  };

  const uncovered: Coverage["uncovered"] = [];
  let covered = 0;
  for (const c of mine) {
    if (hasFutureAt(c.id, today)) covered++;
    else uncovered.push({ customerId: c.id, customerName: c.fullName });
  }

  const weekAgo = daysAgo(today, 7);
  const lastCovered = mine.filter((c) => hasFutureAt(c.id, weekAgo, true)).length;

  return {
    total: mine.length,
    covered,
    rate: mine.length > 0 ? Math.round((covered / mine.length) * 100) : 0,
    lastRate: mine.length > 0 ? Math.round((lastCovered / mine.length) * 100) : null,
    uncovered: uncovered.sort((a, b) => a.customerName.localeCompare(b.customerName, "ja")),
  };
}

// ─── 今月の営業の数字 ──────────────────────────────────
export interface SalesMonth {
  /** 今月の成約数 */
  contracts:     number;
  /** 先月の同じ日までの成約数 */
  lastContracts: number;
  /** 担当しているお客さま（在籍中）の人数 */
  customers:     number;
  /** 担当のお客さまが今月うけたレッスン数（営業歩合のもと） */
  lessons:       number;
  /** 先月の同じ日までのレッスン数。比べられるように同じ条件で数える */
  lastLessons:   number;
}

/** 'YYYY-MM-DD' の「先月の同じ日」。31日が無い月は末日に寄せる */
function sameDayLastMonth(day: string): string {
  const [y, m, dd] = day.split("-").map((x) => parseInt(x, 10));
  const lastDay = new Date(Date.UTC(y, m - 1, 0)).getUTCDate();
  const d = Math.min(dd, lastDay);
  return new Date(Date.UTC(y, m - 2, d)).toISOString().slice(0, 10);
}
function monthStart(day: string, monthsAgo = 0): string {
  const [y, m] = day.split("-").map((x) => parseInt(x, 10));
  return new Date(Date.UTC(y, m - 1 - monthsAgo, 1)).toISOString().slice(0, 10);
}

export function salesMonth(
  customers: Customer[],
  lessons: Lesson[],
  trialLessons: TrialLesson[],
  memberId?: string,
  now: Date | number = Date.now(),
): SalesMonth {
  const today = jstDay(now);
  const mineIds = new Set(
    memberId ? customers.filter((c) => c.salesMemberId === memberId).map((c) => c.id) : [],
  );
  const activeMine = memberId
    ? customers.filter((c) => c.salesMemberId === memberId && c.status === "active").length
    : 0;

  const myContracts = trialLessons.filter((t) => t.salesMemberId === memberId && t.contracted === true);
  const thisFrom = monthStart(today);
  const lastFrom = monthStart(today, 1);
  const lastTo   = sameDayLastMonth(today);

  return {
    contracts: myContracts.filter((t) => {
      const d = jstDay(t.scheduledAt);
      return d >= thisFrom && d <= today;
    }).length,
    lastContracts: myContracts.filter((t) => {
      const d = jstDay(t.scheduledAt);
      return d >= lastFrom && d <= lastTo;
    }).length,
    customers: activeMine,
    lessons: countLessons(thisFrom, today),
    lastLessons: countLessons(lastFrom, lastTo),
  };

  function countLessons(from: string, to: string): number {
    return lessons.filter((l) => {
      if (!mineIds.has(l.customerId) || l.status === "cancelled") return false;
      const d = jstDay(l.scheduledAt);
      return d >= from && d <= to;
    }).length;
  }
}

// ─── 営業の連続記録 ────────────────────────────────────
export interface SalesStreak { weeks: number; best: number }

/**
 * 「何週連続で成約が出ているか」。
 * 成約はレッスンより数が少ないので、こちらも週で数える。
 * 今週まだ0件でも、先週まで続いていれば記録は生きている。
 */
export function salesStreak(
  trialLessons: TrialLesson[], memberId?: string, now: Date | number = Date.now(),
): SalesStreak {
  const today = jstDay(now);
  const weeks = new Set(
    trialLessons
      .filter((t) => t.salesMemberId === memberId && t.contracted === true && jstDay(t.scheduledAt) <= today)
      .map((t) => weekStart(jstDay(t.scheduledAt))),
  );
  const thisWeek = weekStart(today);

  let run = 0;
  let w = weeks.has(thisWeek) ? thisWeek : prevWeek(thisWeek);
  while (weeks.has(w)) { run++; w = prevWeek(w); }

  let best = 0, cur = 0;
  const sorted = Array.from(weeks).sort();
  for (let i = 0; i < sorted.length; i++) {
    cur = i > 0 && sorted[i] === new Date(Date.parse(`${sorted[i - 1]}T00:00:00Z`) + 7 * DAY).toISOString().slice(0, 10)
      ? cur + 1 : 1;
    if (cur > best) best = cur;
  }

  return { weeks: run, best: Math.max(best, run) };
}

// ─── 営業の称号 ────────────────────────────────────────
const TOTAL_STEPS = [5, 10, 25, 50, 100, 200];
const MONTH_STEPS = [1, 3, 5, 10];
const WEEK_STEPS  = [2, 4, 8, 12, 26];

function topStep(steps: number[], v: number): number | null {
  let hit: number | null = null;
  for (const s of steps) if (v >= s) hit = s;
  return hit;
}

export function salesBadges(
  trialLessons: TrialLesson[],
  memberId: string | undefined,
  month: SalesMonth,
  streak: SalesStreak,
  coverage: Coverage,
  now: Date | number = Date.now(),
): Badge[] {
  if (!memberId) return [];
  const today = jstDay(now);
  const out: Badge[] = [];

  // ① 通算の成約数
  const all = trialLessons
    .filter((t) => t.salesMemberId === memberId && t.contracted === true && jstDay(t.scheduledAt) <= today)
    .map((t) => jstDay(t.scheduledAt))
    .sort();
  const t = topStep(TOTAL_STEPS, all.length);
  if (t) {
    const on = all[t - 1];
    out.push({
      id: `sales-total-${t}`, emoji: "🏅", label: `通算${t}成約`,
      note: `いまの通算は${all.length}件`, isNew: on?.slice(0, 7) === today.slice(0, 7), earnedOn: on,
    });
  }

  // ② 今月の成約数
  const m = topStep(MONTH_STEPS, month.contracts);
  if (m) {
    const inMonth = all.filter((d) => d.slice(0, 7) === today.slice(0, 7));
    out.push({
      id: `sales-month-${m}`, emoji: "🌟", label: `今月${m}成約`,
      note: `今月は${month.contracts}件`, isNew: true, earnedOn: inMonth[m - 1],
    });
  }

  // ③ 連続記録
  const w = topStep(WEEK_STEPS, streak.weeks);
  if (w) out.push({ id: `sales-streak-${w}`, emoji: "🔥", label: `${w}週連続で成約`, note: `いま${streak.weeks}週` });

  // ④ 次の予定カバー率（担当5名以上の人だけ。少人数で100%でも意味がないため）
  if (coverage.total >= 5) {
    if (coverage.rate >= 100) out.push({ id: "cover-100", emoji: "💎", label: "カバー率100%", note: "担当全員に次の予定あり", isNew: true });
    else if (coverage.rate >= 90) out.push({ id: "cover-90", emoji: "💎", label: `カバー率${coverage.rate}%`, isNew: true });
  }

  return out;
}

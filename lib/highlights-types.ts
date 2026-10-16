// ダッシュボードの「今日のひとこと」「節目」「声かけリスト」。
//
// 速さのために、新しくデータベースを読まない。すでに画面が読み込んでいる
// レッスン・顧客・回数券・プランから、その場で計算するだけにしている。

import type { Customer } from "./customers-types";
import type { Lesson } from "./lessons-types";
import { isBillableLessonStatus } from "./lessons-types";
import type { TrialLesson } from "./trial-lessons-types";
import type { SessionPass } from "./session-passes-types";
import type { CustomerPlanRecord } from "./customer-plans-types";

const JST = 9 * 3600 * 1000;
const DAY = 86400000;

/** ISO(UTC) → 日本時間の 'YYYY-MM-DD' */
export function jstDay(iso: string | number | Date): string {
  const t = typeof iso === "number" ? iso : new Date(iso).getTime();
  return new Date(t + JST).toISOString().slice(0, 10);
}

/** 'YYYY-MM-DD' 同士の日数差（a - b） */
function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / DAY);
}

// ─── 今日のひとこと ────────────────────────────────────
export interface TodayHeadline {
  /** 今日のレッスン件数（通常＋体験・キャンセル以外） */
  lessonCount:   number;
  /** 今日来るお客さまの人数 */
  customerCount: number;
  /** 今月これまでに実施した件数（チーム全体） */
  monthCount:    number;
  /** 先月の同じ日までの件数（比較用） */
  lastMonthCount: number;
}

function monthStartDay(day: string, monthsAgo = 0): string {
  const [y, m] = day.split("-").map((x) => parseInt(x, 10));
  const d = new Date(Date.UTC(y, m - 1 - monthsAgo, 1));
  return d.toISOString().slice(0, 10);
}

/** 先月の「同じ日」。31日が無い月は末日に寄せる */
function sameDayLastMonth(day: string): string {
  const [y, m, dd] = day.split("-").map((x) => parseInt(x, 10));
  const lastDay = new Date(Date.UTC(y, m - 1, 0)).getUTCDate(); // 先月の末日
  const d = Math.min(dd, lastDay);
  const dt = new Date(Date.UTC(y, m - 2, d));
  return dt.toISOString().slice(0, 10);
}

export function todayHeadline(
  lessons: Lesson[],
  trialLessons: TrialLesson[],
  now: Date | number = Date.now(),
): TodayHeadline {
  const today = jstDay(now);
  const all = [
    ...lessons.map((l) => ({ day: jstDay(l.scheduledAt), status: l.status, customerId: l.customerId })),
    ...trialLessons.map((t) => ({ day: jstDay(t.scheduledAt), status: t.status, customerId: t.customerId })),
  ].filter((x) => x.status !== "cancelled");

  const todays = all.filter((x) => x.day === today);
  const thisMonthFrom = monthStartDay(today);
  const lastFrom = monthStartDay(today, 1);
  const lastTo   = sameDayLastMonth(today);

  return {
    lessonCount:   todays.length,
    customerCount: new Set(todays.map((x) => x.customerId)).size,
    monthCount:    all.filter((x) => x.day >= thisMonthFrom && x.day <= today).length,
    lastMonthCount: all.filter((x) => x.day >= lastFrom && x.day <= lastTo).length,
  };
}

// ─── 今日の節目 ────────────────────────────────────────
/** お祝いする回数。これ以外の回数では出さない（毎回出ると見なくなるため） */
const MILESTONE_COUNTS = [1, 5, 10, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500];

export interface Milestone {
  customerId:   string;
  customerName: string;
  /** 画面に出す一言 */
  label:        string;
  /** 🎉 など */
  emoji:        string;
}

/**
 * 今日レッスンがある人の節目を拾う。
 * - 通算◯回目（5回・10回・25回…）
 * - 初めて来てくれた日からちょうど◯年
 * 体験レッスンも1回に数える（お客さんにとっては同じ1回なので）。
 */
export function todayMilestones(
  lessons: Lesson[],
  trialLessons: TrialLesson[],
  now: Date | number = Date.now(),
): Milestone[] {
  const today = jstDay(now);

  // 顧客ごとの履歴（キャンセル以外）を日付順に
  const byCustomer = new Map<string, { day: string; name: string; done: boolean }[]>();
  const push = (customerId: string, name: string, iso: string, status: Lesson["status"]) => {
    if (status === "cancelled") return;
    const rows = byCustomer.get(customerId) ?? [];
    rows.push({ day: jstDay(iso), name, done: isBillableLessonStatus(status) });
    byCustomer.set(customerId, rows);
  };
  for (const l of lessons)      push(l.customerId, l.customerName, l.scheduledAt, l.status);
  for (const t of trialLessons) push(t.customerId, t.customerName, t.scheduledAt, t.status as Lesson["status"]);

  const out: Milestone[] = [];
  for (const [customerId, rows] of byCustomer) {
    if (!rows.some((r) => r.day === today)) continue;   // 今日の予定がある人だけ
    rows.sort((a, b) => a.day.localeCompare(b.day));
    const name = rows[rows.length - 1].name;

    // 通算回数（今日の分を含む。今日より後の予定は数えない）
    const count = rows.filter((r) => r.day <= today).length;
    if (MILESTONE_COUNTS.includes(count)) {
      out.push({
        customerId, customerName: name, emoji: count === 1 ? "🌱" : "🎉",
        label: count === 1 ? "今日が初めてのレッスンです" : `今日で通算${count}回目のレッスンです`,
      });
      continue; // 1人につき1つまで（並びすぎると読まれない）
    }

    // 初回からちょうど◯年
    const first = rows[0].day;
    if (first !== today && first.slice(5) === today.slice(5)) {
      const years = parseInt(today.slice(0, 4), 10) - parseInt(first.slice(0, 4), 10);
      if (years >= 1) {
        out.push({ customerId, customerName: name, emoji: "🎂", label: `初めて来てくれた日から${years}年です` });
      }
    }
  }
  return out.sort((a, b) => a.customerName.localeCompare(b.customerName, "ja"));
}

// ─── 声かけリスト ──────────────────────────────────────
export type FollowUpKind = "away" | "passLow" | "noNext" | "planUnused";

export interface FollowUp {
  customerId:   string;
  customerName: string;
  /** そのお客さまの担当営業（members.id）。未設定なら undefined */
  salesMemberId?: string;
  kind:         FollowUpKind;
  /** 画面に出す理由 */
  reason:       string;
  /** 小さいほど先に出す */
  priority:     number;
}

/** しばらく来ていないと見なす日数 */
const AWAY_DAYS = 28;
/** 回数券の残りがこの数以下なら更新の声かけどき */
const PASS_LOW = 2;

/**
 * 声をかけたほうがいいお客さま。
 *
 * ・前からしばらく空いている（離れかけ）
 * ・回数券の残りが少ない（更新の相談どき）
 * ・月プランなのに今月まだ来ていない
 * ・次の予定が入っていない
 * 退会した人は出さない。1人につき理由は1つ（いちばん重いもの）だけ出す。
 * 誰に見せるかは画面側で決める（担当営業が自分のお客さまだけ出す、など）。
 */
export function followUps(
  customers: Customer[],
  lessons: Lesson[],
  trialLessons: TrialLesson[],
  sessionPasses: SessionPass[],
  customerPlans: CustomerPlanRecord[],
  now: Date | number = Date.now(),
): FollowUp[] {
  const today = jstDay(now);
  const monthFrom = monthStartDay(today);

  // 顧客ごとの「最後に来た日」と「次の予定の有無」
  const lastDay = new Map<string, string>();
  const hasNext = new Set<string>();
  const cameThisMonth = new Set<string>();
  const mark = (customerId: string, iso: string, status: string) => {
    if (status === "cancelled") return;
    const day = jstDay(iso);
    if (day > today) { hasNext.add(customerId); return; }
    const cur = lastDay.get(customerId);
    if (!cur || day > cur) lastDay.set(customerId, day);
    if (day >= monthFrom) cameThisMonth.add(customerId);
  };
  for (const l of lessons)      mark(l.customerId, l.scheduledAt, l.status);
  for (const t of trialLessons) mark(t.customerId, t.scheduledAt, t.status);

  const passLeft = new Map<string, number>();
  for (const p of sessionPasses) {
    if (p.remainingCount <= 0) continue;
    passLeft.set(p.customerId, (passLeft.get(p.customerId) ?? 0) + p.remainingCount);
  }

  const activePlan = new Set(
    customerPlans
      .filter((p) => p.startedAt <= today && (!p.endedAt || p.endedAt >= today))
      .map((p) => p.customerId),
  );

  const out: FollowUp[] = [];
  for (const c of customers) {
    if (c.status !== "active") continue;      // 在籍中の人だけ
    const last = lastDay.get(c.id);
    const away = last ? daysBetween(today, last) : null;
    const left = passLeft.get(c.id);

    // ① しばらく来ていない（いちばん重い）
    if (away != null && away >= AWAY_DAYS && !hasNext.has(c.id)) {
      out.push({
        customerId: c.id, customerName: c.fullName, salesMemberId: c.salesMemberId, kind: "away", priority: 1,
        reason: `前回から${Math.floor(away / 7)}週間、次の予定もありません`,
      });
      continue;
    }
    // ② 月プランなのに今月まだ来ていない
    if (activePlan.has(c.id) && !cameThisMonth.has(c.id) && !hasNext.has(c.id)) {
      out.push({
        customerId: c.id, customerName: c.fullName, salesMemberId: c.salesMemberId, kind: "planUnused", priority: 2,
        reason: "月プランですが、今月まだ予定がありません",
      });
      continue;
    }
    // ③ 回数券の残りが少ない
    if (left != null && left <= PASS_LOW) {
      out.push({
        customerId: c.id, customerName: c.fullName, salesMemberId: c.salesMemberId, kind: "passLow", priority: 3,
        reason: `回数券の残りが${left}回です`,
      });
      continue;
    }
    // ④ 次の予定が入っていない
    if (!hasNext.has(c.id) && last) {
      out.push({
        customerId: c.id, customerName: c.fullName, salesMemberId: c.salesMemberId, kind: "noNext", priority: 4,
        reason: "次の予定が入っていません",
      });
    }
  }

  return out.sort((a, b) =>
    a.priority - b.priority || a.customerName.localeCompare(b.customerName, "ja"));
}

// スタッフ全員に見せる「FIT STAGE のいま」。
//
// 線引き:
//   見せる … レッスン本数・お客さまの人数・成約率・売上の「伸び率(%)」
//   見せない … 売上や利益の金額、他人の歩合、お客さまごとの単価、個人別の順位
//
// 売上は％だけを出す。金額を出すと「自分の歩合 ÷ 全体の売上」の話になり、
// やる気の話が待遇の話にすり替わるため。％なら伸びていることだけが伝わる。
//
// ★ この型には円の数字を一切入れないこと。
//   画面は server component で作ってこの型だけを渡すので、
//   ここに金額を入れなければ、ブラウザに送られるデータにも金額は乗らない。
//   「画面に出さない」だけでは、開発者ツールで中身が見えてしまう。

import type { Customer } from "./customers-types";
import type { Lesson } from "./lessons-types";
import { isBillableLessonStatus } from "./lessons-types";
import type { TrialLesson } from "./trial-lessons-types";
import { resolveLessonFee, resolveTrialFee, type CommissionContext } from "./commissions";
import { jstDay } from "./highlights-types";

/** お祝いする通算本数。細かく出すと見なくなるので、節目だけ */
const MILESTONES = [100, 250, 500, 1000, 2000, 3000, 5000, 7500, 10000, 15000, 20000, 30000, 50000];

export interface CompanyStats {
  /** 今月のチーム全体の本数（今日まで） */
  monthLessons:     number;
  /** 先月の同じ日までの本数 */
  lastMonthLessons: number;
  /** 今月の新規のお客さま */
  newCustomers:     number;
  /** 今月の新規のお客さまのお名前（新しい順）。多いときは先頭だけ。金額は持たない */
  newCustomerNames: string[];
  /** 先月の同じ日までの新規のお客さま */
  lastNewCustomers: number;
  /** 在籍中のお客さま */
  activeCustomers:  number;
  /** 通算のレッスン本数 */
  totalLessons:     number;
  /** 次の節目（通算本数）。もう無ければ null */
  nextMilestone:    number | null;
  /** 今月の体験の実施件数と成約率（全体） */
  trialHeld:        number;
  trialContracted:  number;
  trialRate:        number | null;
  /** 売上の前月比（%・同じ日まで）。比べられないときは null。※金額は持たない */
  revenueGrowth:    number | null;
  /** 売上の前年同月比（%・同じ日まで）。比べられないときは null。※金額は持たない */
  revenueGrowthYoY: number | null;
  /** 直近12か月の本数（古い→新しい）。グラフ用。金額は入れない */
  monthlyCounts:    { month: string; label: string; count: number }[];
}

function pad(n: number): string { return String(n).padStart(2, "0"); }

/** 'YYYY-MM-DD' の n か月前の「同じ日まで」の範囲。無い日は月末に寄せる */
function sameDayRange(day: string, monthsAgo: number): { from: string; to: string } {
  const [y, m, d] = day.split("-").map((x) => parseInt(x, 10));
  const target = new Date(Date.UTC(y, m - 1 - monthsAgo, 1));
  const ty = target.getUTCFullYear();
  const tm = target.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(ty, tm, 0)).getUTCDate();
  return { from: `${ty}-${pad(tm)}-01`, to: `${ty}-${pad(tm)}-${pad(Math.min(d, lastDay))}` };
}

/** 増減の割合（%）。比べる相手が無い／0のときは null */
function growth(now: number, prev: number): number | null {
  if (prev <= 0) return null;
  return Math.round(((now - prev) / prev) * 100);
}

export function companyStats(
  customers: Customer[],
  lessons: Lesson[],
  trialLessons: TrialLesson[],
  ctx: CommissionContext,
  now: Date | number = Date.now(),
): CompanyStats {
  const today = jstDay(now);

  // 実施したぶんだけを対象にする（キャンセル・予定は数えない）
  const done = lessons.filter((l) => isBillableLessonStatus(l.status));
  const doneTrials = trialLessons.filter((t) => t.status === "completed");

  const inRange = (iso: string, r: { from: string; to: string }) => {
    const d = jstDay(iso);
    return d >= r.from && d <= r.to;
  };

  // ─── 本数と売上を、同じ期間の切り方で数える ───
  const countAndRevenue = (r: { from: string; to: string }) => {
    let count = 0;
    let revenue = 0;
    for (const l of done) {
      if (!inRange(l.scheduledAt, r)) continue;
      count++;
      revenue += resolveLessonFee(l, ctx);
    }
    for (const t of doneTrials) {
      if (!inRange(t.scheduledAt, r)) continue;
      count++;
      revenue += resolveTrialFee(t, ctx);
    }
    return { count, revenue };
  };

  const thisR = sameDayRange(today, 0);
  const cur  = countAndRevenue(thisR);
  const prev = countAndRevenue(sameDayRange(today, 1));
  const yoy  = countAndRevenue(sameDayRange(today, 12));

  // ─── 新規のお客さま ───
  const newListIn = (r: { from: string; to: string }) =>
    customers.filter((c) => c.createdAt && inRange(c.createdAt, r));
  const newIn = (r: { from: string; to: string }) => newListIn(r).length;

  // 数字だけだと「誰が増えたのか」が分からず、見ても次の行動につながらない。
  // 新しい順に並べて、多いときは先頭だけ渡す（残りは件数で足りる）。
  const NEW_NAMES_MAX = 8;
  const newCustomerNames = newListIn(thisR)
    .slice()
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
    .slice(0, NEW_NAMES_MAX)
    .map((c) => c.fullName);

  // ─── 今月の体験（全体） ───
  const trialsThisMonth = doneTrials.filter((t) => inRange(t.scheduledAt, thisR));
  const trialHeld = trialsThisMonth.length;
  const trialContracted = trialsThisMonth.filter((t) => t.contracted === true).length;

  // ─── 通算と次の節目 ───
  const totalLessons = done.length + doneTrials.length;
  const nextMilestone = MILESTONES.find((m) => m > totalLessons) ?? null;

  // ─── 直近12か月の本数（1回で数える） ───
  const byMonth = new Map<string, number>();
  for (const x of [...done, ...doneTrials]) {
    const m = jstDay(x.scheduledAt).slice(0, 7);
    byMonth.set(m, (byMonth.get(m) ?? 0) + 1);
  }
  const [cy, cm] = today.split("-").map((x) => parseInt(x, 10));
  const monthlyCounts = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(cy, cm - 1 - (11 - i), 1));
    const month = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
    return { month, label: `${d.getUTCMonth() + 1}月`, count: byMonth.get(month) ?? 0 };
  });

  return {
    monthLessons:     cur.count,
    lastMonthLessons: prev.count,
    newCustomers:     newIn(thisR),
    newCustomerNames,
    lastNewCustomers: newIn(sameDayRange(today, 1)),
    activeCustomers:  customers.filter((c) => c.status === "active").length,
    totalLessons,
    nextMilestone,
    trialHeld,
    trialContracted,
    trialRate: trialHeld > 0 ? Math.round((trialContracted / trialHeld) * 1000) / 10 : null,
    revenueGrowth:    growth(cur.revenue, prev.revenue),
    revenueGrowthYoY: growth(cur.revenue, yoy.revenue),
    monthlyCounts,
  };
}

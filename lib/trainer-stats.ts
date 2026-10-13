import type { Lesson } from "./lessons-types";
import { isBillableLessonStatus } from "./lessons-types";
import type { TrialLesson } from "./trial-lessons-types";
import { trialCourseLabel } from "./trial-lessons-types";
import {
  resolveLessonFee, resolveTrialFee, resolveTrainerPay, isOwnerMember, isoToMonth,
  type CommissionContext,
} from "./commissions";

/**
 * トレーナー本人のダッシュボードに出す数字。
 *
 * ここで扱う金額はすべて「その人に払う歩合」であって、売上（お客さんへの請求額）ではない。
 * 画面でもそう書くこと。
 */

export interface PendingLessonRow {
  id:           string;
  lessonId:     string;   // 完了にするときに使う（体験は trial- が付かない素のid）
  isTrial:      boolean;
  customerName: string;
  course:       string;
  scheduledAt:  string;
  /** 完了にしたときに増える歩合 */
  amount:       number;
}

/**
 * 「終わったのに予定のまま」の自分のレッスン。
 *
 * 完了にしないと歩合にならないので、本人に気付いてもらうために出す。
 * これからのレッスンは対象にしない（まだ終わっていないので完了にしようがない）。
 */
export function pendingTrainerLessons(
  lessons: Lesson[],
  trialLessons: TrialLesson[],
  memberId: string,
  now: Date,
  ctx: CommissionContext,
): PendingLessonRow[] {
  if (!memberId || isOwnerMember(memberId, ctx)) return [];
  const t = now.getTime();

  const rows: PendingLessonRow[] = [];

  for (const l of lessons) {
    if (l.trainerMemberId !== memberId) continue;
    if (l.status !== "scheduled") continue;
    if (new Date(l.scheduledAt).getTime() > t) continue;   // まだ終わっていない
    const fee = resolveLessonFee(l, ctx);
    rows.push({
      id: l.id, lessonId: l.id, isTrial: false,
      customerName: l.customerName, course: l.course ?? "",
      scheduledAt: l.scheduledAt,
      amount: resolveTrainerPay(memberId, l.customerId, fee, ctx).amount,
    });
  }

  for (const tl of trialLessons) {
    if (tl.trainerMemberId !== memberId) continue;
    if (tl.status !== "scheduled") continue;
    if (new Date(tl.scheduledAt).getTime() > t) continue;
    const fee = resolveTrialFee(tl, ctx);
    rows.push({
      id: `trial-${tl.id}`, lessonId: tl.id, isTrial: true,
      customerName: tl.customerName, course: trialCourseLabel(tl.course),
      scheduledAt: tl.scheduledAt,
      amount: resolveTrainerPay(memberId, tl.customerId, fee, ctx).amount,
    });
  }

  return rows.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
}

/** 期間（両端を含む日付）に確定した自分の歩合。トレーナー担当ぶんのみ。 */
export function trainerCommissionInRange(
  lessons: Lesson[],
  trialLessons: TrialLesson[],
  memberId: string,
  fromDate: string,  // YYYY-MM-DD
  toDate: string,    // YYYY-MM-DD
  ctx: CommissionContext,
): number {
  if (!memberId || isOwnerMember(memberId, ctx)) return 0;
  const inRange = (iso: string) => {
    const d = iso.slice(0, 10);
    return d >= fromDate && d <= toDate;
  };

  let total = 0;
  for (const l of lessons) {
    if (l.trainerMemberId !== memberId || !isBillableLessonStatus(l.status)) continue;
    if (!inRange(l.scheduledAt)) continue;
    total += resolveTrainerPay(memberId, l.customerId, resolveLessonFee(l, ctx), ctx).amount;
  }
  for (const tl of trialLessons) {
    if (tl.trainerMemberId !== memberId || tl.status !== "completed") continue;
    if (!inRange(tl.scheduledAt)) continue;
    total += resolveTrainerPay(memberId, tl.customerId, resolveTrialFee(tl, ctx), ctx).amount;
  }
  return total;
}

/**
 * 今月の着地見込み。
 *
 * ペースからの按分ではなく「今月まだ残っている予定を全部こなしたら」で出す。
 * 予定が実データなので、本人が見て納得しやすい。
 */
export function trainerMonthProjection(
  lessons: Lesson[],
  trialLessons: TrialLesson[],
  memberId: string,
  month: string,
  now: Date,
  ctx: CommissionContext,
): { remaining: number; count: number } {
  if (!memberId || isOwnerMember(memberId, ctx)) return { remaining: 0, count: 0 };
  const t = now.getTime();
  let remaining = 0;
  let count = 0;

  for (const l of lessons) {
    if (l.trainerMemberId !== memberId || l.status !== "scheduled") continue;
    if (isoToMonth(l.scheduledAt) !== month) continue;
    if (new Date(l.scheduledAt).getTime() <= t) continue;   // 過ぎたぶんは「完了待ち」側で数える
    remaining += resolveTrainerPay(memberId, l.customerId, resolveLessonFee(l, ctx), ctx).amount;
    count++;
  }
  for (const tl of trialLessons) {
    if (tl.trainerMemberId !== memberId || tl.status !== "scheduled") continue;
    if (isoToMonth(tl.scheduledAt) !== month) continue;
    if (new Date(tl.scheduledAt).getTime() <= t) continue;
    remaining += resolveTrainerPay(memberId, tl.customerId, resolveTrialFee(tl, ctx), ctx).amount;
    count++;
  }
  return { remaining, count };
}

export interface TrialConversion {
  /** 実施した体験の件数（結果が未入力のものも含む） */
  held:       number;
  contracted: number;
  /** 成約・未成約が未入力の件数。入れてもらうために別で出す */
  unknown:    number;
  /** 成約率（％）。実施0件なら null */
  rate:       number | null;
}

/**
 * 体験レッスンの成約率。担当トレーナーか担当営業のどちらかが自分のものを数える。
 * month を省くと通算。
 */
export function trialConversion(
  trialLessons: TrialLesson[],
  memberId: string,
  month?: string,
): TrialConversion {
  const mine = trialLessons.filter((t) =>
    (t.trainerMemberId === memberId || t.salesMemberId === memberId)
    && t.status === "completed"
    && (!month || isoToMonth(t.scheduledAt) === month));

  const held       = mine.length;
  const contracted = mine.filter((t) => t.contracted === true).length;
  const unknown    = mine.filter((t) => t.contracted == null).length;
  return {
    held, contracted, unknown,
    rate: held > 0 ? Math.round((contracted / held) * 1000) / 10 : null,
  };
}

/** 先月の「同じ日まで」の範囲。月をまたぐ比較を同じ条件にするため、月末は超えない。 */
export function lastMonthSameDayRange(now: Date): { from: string; to: string } {
  const y = now.getFullYear();
  const m = now.getMonth();          // 0始まり
  const day = now.getDate();
  const lastDayOfPrevMonth = new Date(y, m, 0).getDate();
  const d = Math.min(day, lastDayOfPrevMonth);
  const prev = new Date(y, m - 1, 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  const ym = `${prev.getFullYear()}-${pad(prev.getMonth() + 1)}`;
  return { from: `${ym}-01`, to: `${ym}-${pad(d)}` };
}

/** 今月の1日から今日まで */
export function monthToDateRange(now: Date): { from: string; to: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const ym = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  return { from: `${ym}-01`, to: `${ym}-${pad(now.getDate())}` };
}

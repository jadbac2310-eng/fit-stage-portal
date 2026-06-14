import type { Customer, CustomerType } from "./customers-types";
import type { Lesson } from "./lessons-types";
import type { TrialLesson } from "./trial-lessons-types";
import type { SessionPass } from "./session-passes-types";
import { planSessions, type CustomerPlanRecord } from "./customer-plans-types";
import { getLessonFee, TRAINER_RATE, SALES_RATE, CONTRACT_BONUS } from "./commissions-types";

// ─── 表示行・集計の型 ────────────────────────────────────
export interface TrainerLessonRow {
  lessonId:     string;
  customerName: string;
  course:       string;
  scheduledAt:  string;
  fee:          number;
  commission:   number;
}

export interface TrainerEntry {
  memberId:   string;
  memberName: string;
  lessons:    TrainerLessonRow[];
  total:      number;
}

export interface SalesLessonRow {
  lessonId:     string;
  customerName: string;
  customerType: CustomerType;
  course:       string;
  scheduledAt:  string;
  fee:          number;
  commission:   number;
}

export interface BonusRow {
  trialId:      string;
  customerName: string;
  customerType: CustomerType;
  scheduledAt:  string;
  amount:       number;
}

export interface SalesEntry {
  memberId:    string;
  memberName:  string;
  lessons:     SalesLessonRow[];
  bonuses:     BonusRow[];
  lessonTotal: number;
  bonusTotal:  number;
  total:       number;
}

/**
 * 単価算出に必要な周辺データ。
 * - 回数券レッスン: 入金額 ÷ 回数
 * - 月プランレッスン: 入金額 ÷ 月回数
 * - 都度レッスン: レッスン個別金額 → 顧客の都度単価 → 固定単価表 の順
 */
export interface CommissionContext {
  customers:     Customer[];
  sessionPasses: SessionPass[];
  customerPlans: CustomerPlanRecord[];
  members:       { id: string; name: string }[];
  /** プランマスタ由来のコース名→1回単価。未指定コースは固定単価表にフォールバック */
  lessonFees?:   Record<string, number>;
  /** 回数券標準金額マスタ { 人数: { 回数: 総額 } }。回数券に price 未設定時のフォールバック */
  sessionPassPriceMap?: Record<number, Record<number, number>>;
}

export function isoToMonth(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** 1レッスンの単価（売上計上額）を算出する */
export function resolveLessonFee(lesson: Lesson, ctx: CommissionContext): number {
  // 回数券: 入金額 ÷ 回数
  if (lesson.sessionPassId) {
    const pass = ctx.sessionPasses.find((p) => p.id === lesson.sessionPassId);
    if (pass) {
      if (pass.price && pass.totalCount > 0) return Math.round(pass.price / pass.totalCount);
      // price 未設定の場合は人数×回数でマスタから標準単価を算出
      const masterTotal = ctx.sessionPassPriceMap?.[pass.personCount]?.[pass.totalCount];
      if (masterTotal && pass.totalCount > 0) return Math.round(masterTotal / pass.totalCount);
      // それもなければ固定単価表
      return getLessonFee("回数券");
    }
  }

  const course = lesson.course ?? "";

  // 月プラン: 入金額 ÷ 月回数（レッスン日に適用中で同名のプランを照合）
  if (course.startsWith("月")) {
    const date = lesson.scheduledAt.slice(0, 10);
    const plan = ctx.customerPlans.find(
      (p) => p.customerId === lesson.customerId && p.plan === course &&
             p.startedAt <= date && (!p.endedAt || p.endedAt >= date)
    );
    const sessions = planSessions(course);
    if (plan?.price && sessions > 0) return Math.round(plan.price / sessions);
  }

  // 都度: レッスン個別金額 → 顧客の都度単価
  if (course === "都度") {
    if (typeof lesson.amount === "number" && lesson.amount > 0) return lesson.amount;
    const cust = ctx.customers.find((c) => c.id === lesson.customerId);
    if (cust?.singleSessionPrice && cust.singleSessionPrice > 0) return cust.singleSessionPrice;
  }

  // フォールバック: プランマスタの標準単価 → 従来の固定単価表（旧コース名の互換用）
  return ctx.lessonFees?.[course] ?? getLessonFee(course);
}

/** 選択月のトレーナー歩合集計（lessons は完了レッスンを渡す） */
export function buildTrainerEntries(lessons: Lesson[], month: string, ctx: CommissionContext): TrainerEntry[] {
  const filtered = lessons.filter((l) => isoToMonth(l.scheduledAt) === month && l.trainerMemberId);
  const map = new Map<string, TrainerEntry>();

  for (const l of filtered) {
    const tid  = l.trainerMemberId!;
    const fee  = resolveLessonFee(l, ctx);
    const comm = Math.round(fee * TRAINER_RATE);

    if (!map.has(tid)) {
      map.set(tid, { memberId: tid, memberName: l.trainerMemberName ?? tid, lessons: [], total: 0 });
    }
    const entry = map.get(tid)!;
    entry.lessons.push({
      lessonId: l.id, customerName: l.customerName,
      course: l.course ?? "", scheduledAt: l.scheduledAt,
      fee, commission: comm,
    });
    entry.total += comm;
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

/**
 * 選択月の営業歩合集計。
 * - lessons: 完了レッスン
 * - trialLessons: 成約済み体験レッスン（営業担当のフォールバック・成約ボーナスの算出元）
 * 営業担当は「顧客の担当営業(sales_member_id)」を優先し、無ければ最初の成約体験レッスンの営業担当を使う。
 */
export function buildSalesEntries(
  lessons: Lesson[],
  trialLessons: TrialLesson[],
  month: string,
  ctx: CommissionContext,
): SalesEntry[] {
  const customerTypeMap: Record<string, CustomerType> = {};
  for (const c of ctx.customers) customerTypeMap[c.id] = c.customerType;

  const memberName = new Map(ctx.members.map((m) => [m.id, m.name]));

  // 顧客ID → 営業担当
  const salesByCustomer: Record<string, { memberId: string; memberName: string }> = {};
  // ① 顧客マスタの担当営業を優先
  for (const c of ctx.customers) {
    if (c.salesMemberId) {
      salesByCustomer[c.id] = { memberId: c.salesMemberId, memberName: memberName.get(c.salesMemberId) ?? c.salesMemberId };
    }
  }
  // ② 未設定の顧客は最初の成約体験レッスンの営業担当でフォールバック
  for (const tl of trialLessons) {
    if (!salesByCustomer[tl.customerId]) {
      salesByCustomer[tl.customerId] = { memberId: tl.salesMemberId, memberName: tl.salesMemberName };
    }
  }

  const map = new Map<string, SalesEntry>();
  const ensureEntry = (memberId: string, name: string) => {
    if (!map.has(memberId)) {
      map.set(memberId, {
        memberId, memberName: name,
        lessons: [], bonuses: [],
        lessonTotal: 0, bonusTotal: 0, total: 0,
      });
    }
    return map.get(memberId)!;
  };

  // レッスン歩合
  for (const l of lessons.filter((l) => isoToMonth(l.scheduledAt) === month)) {
    const sales = salesByCustomer[l.customerId];
    if (!sales) continue;

    const cType = customerTypeMap[l.customerId] ?? "individual";
    const fee   = resolveLessonFee(l, ctx);
    const comm  = Math.round(fee * SALES_RATE[cType]);

    const entry = ensureEntry(sales.memberId, sales.memberName);
    entry.lessons.push({
      lessonId: l.id, customerName: l.customerName, customerType: cType,
      course: l.course ?? "", scheduledAt: l.scheduledAt, fee, commission: comm,
    });
    entry.lessonTotal += comm;
    entry.total       += comm;
  }

  // 成約ボーナス（成約日が選択月のもの）
  for (const tl of trialLessons.filter((tl) => isoToMonth(tl.scheduledAt) === month)) {
    const cType = customerTypeMap[tl.customerId] ?? "individual";
    const bonus = CONTRACT_BONUS[cType];

    const entry = ensureEntry(tl.salesMemberId, tl.salesMemberName);
    entry.bonuses.push({
      trialId: tl.id, customerName: tl.customerName, customerType: cType,
      scheduledAt: tl.scheduledAt, amount: bonus,
    });
    entry.bonusTotal += bonus;
    entry.total      += bonus;
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

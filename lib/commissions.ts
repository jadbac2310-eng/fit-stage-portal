import type { Customer, CustomerType } from "./customers-types";
import { isFctCustomer } from "./customers-types";
import { fctLessonPay, FCT_DEFAULT_RATE } from "./fct-types";
import type { Lesson } from "./lessons-types";
import { courseToPaymentType, resolveSingleLessonAmount, isFreeLesson, isFreeTrainerPaidLesson } from "./lessons-types";
import type { TrialLesson } from "./trial-lessons-types";
import { trialCourseLabel } from "./trial-lessons-types";
import type { SessionPass } from "./session-passes-types";
import type { HourlyTask, HourlyTaskStatus } from "./hourly-tasks-types";
import { hourlyTaskHours, hourlyTaskAmount } from "./hourly-tasks-types";
import { planSessions, type CustomerPlanRecord } from "./customer-plans-types";
import {
  getLessonFee, TRAINER_RATE, SALES_RATE, contractBonusFor, TRIAL_LESSON_COURSE_NAME,
  ONSITE_TRIAL_COURSE_NAME, ONSITE_TRIAL_PAIR_COURSE_NAME, isOnsiteTrialPrice,
  STORE_PAIR_TRIAL_COURSE_NAME, isStorePairTrialPeriod,
} from "./commissions-types";
import { isPairTrialNote } from "./trial-note";

// ─── 表示行・集計の型 ────────────────────────────────────
export interface TrainerLessonRow {
  lessonId:     string;
  customerName: string;
  course:       string;
  scheduledAt:  string;
  fee:          number;
  commission:   number;
  /** 歩合率ではなく「1レッスンにつき○円」の固定払いで計算した行 */
  fixedPay?:    boolean;
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

/** 業務（時給）の表示行 */
export interface HourlyTaskRow {
  taskId:      string;
  title:       string;
  scheduledAt: string;
  hours:       number;
  hourlyRate:  number;
  amount:      number;
  status:      HourlyTaskStatus;
}

export interface HourlyEntry {
  memberId:     string;
  memberName:   string;
  /** 完了した業務（支払い対象） */
  tasks:        HourlyTaskRow[];
  total:        number;
  /** まだ「予定」のままの業務。支払いには含めないが、完了にし忘れに気付けるよう分けて持つ */
  pending:      HourlyTaskRow[];
  pendingTotal: number;
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
  /** isOwner の担当者は歩合の対象外（売上がまるごと利益に残り、利益＝オーナーの取り分になる） */
  members:       CommissionMember[];
  /**
   * 担当者×顧客の組み合わせごとの支払い条件。未設定の組み合わせは既定50%。
   * fixedAmount があるときは歩合率ではなく「1レッスンにつき○円」を払う。
   */
  trainerRates?: { memberId: string; customerId: string; rate: number; fixedAmount?: number }[];
  /** プランマスタ由来のコース名→1回単価。未指定コースは固定単価表にフォールバック */
  lessonFees?:   Record<string, number>;
  /**
   * 段階単価を当てはめた「レッスンID → 単価」。lib/session-tiers.ts の tieredLessonPrices で作る。
   * 請求まとめ先ごとに合算した回数で単価が変わる契約（4回目まで9,200円／5回目から9,000円）に使う。
   * ここに無いレッスンは今までどおり顧客ごとの都度単価。
   */
  tieredPrices?: Record<string, number>;
  /** 回数券標準金額マスタ { 人数: { 回数: 総額 } }。回数券に price 未設定時のフォールバック */
  sessionPassPriceMap?: Record<number, Record<number, number>>;
  /**
   * FCT店舗の歩合率（%）。FCT経由のお客さまの売上を出すのに使う。
   * 渡されないときは既定の45%で計算する。
   */
  fctStores?: { id: string; rate: number }[];
}

/** 歩合の計算に使う担当者の情報 */
export interface CommissionMember {
  id: string;
  name: string;
  isOwner?: boolean;
  /** 研修中の1レッスンの支払額（円）。trainingUntil の日までは歩合率をかけずにこの額 */
  trainingPay?: number;
  /** 研修の最後の日（YYYY-MM-DD・日本時間） */
  trainingUntil?: string;
}

/** 担当者マスタの行から、歩合の計算に要る分だけを取り出す（画面へ渡すときもこれを使う） */
export function toCommissionMembers(
  members: { id: string; name: string; isOwner?: boolean; trainingPay?: number; trainingUntil?: string }[],
): CommissionMember[] {
  return members.map((m) => ({
    id: m.id, name: m.name, isOwner: m.isOwner,
    ...(m.trainingPay != null && m.trainingUntil ? { trainingPay: m.trainingPay, trainingUntil: m.trainingUntil } : {}),
  }));
}

/**
 * 研修中なら、そのレッスンの支払額（円）。研修でなければ null。
 * レッスンの日（日本時間）が研修の最後の日まで（その日を含む）なら研修の額。次の日からは通常の歩合。
 */
export function trainingPayFor(
  memberId: string, scheduledAt: string | undefined, ctx: Pick<CommissionContext, "members">,
): number | null {
  if (!scheduledAt) return null;
  const m = ctx.members.find((x) => x.id === memberId);
  if (m?.trainingPay == null || !m.trainingUntil) return null;
  const jstDate = new Date(new Date(scheduledAt).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  return jstDate <= m.trainingUntil ? Math.max(0, Math.round(m.trainingPay)) : null;
}

/**
 * 運営者本人かどうか。
 *
 * オーナーは自分のレッスンの売上をそのまま受け取り、他トレーナーに歩合を払った残りも
 * 受け取る。つまり「利益＝オーナーの取り分」なので、オーナー自身に歩合を払う形にすると
 * 取り分を二重に数えることになる。トレーナー歩合・営業歩合・成約ボーナスのいずれも
 * 対象外として扱い、その分を利益側に残す。
 */
export function isOwnerMember(memberId: string, ctx: Pick<CommissionContext, "members">): boolean {
  return ctx.members.find((m) => m.id === memberId)?.isOwner === true;
}

export function isoToMonth(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** 1レッスンの単価（売上計上額）を算出する */
export function resolveLessonFee(lesson: Lesson, ctx: CommissionContext): number {
  // 無料レッスン（サービス回）は売上0円。回数券に紐づいていても、金額欄に数字が入っていても0円。
  // いちばん最初に見る。あとの分岐に落ちると標準単価を拾ってしまう。
  if (isFreeLesson(lesson.course)) return 0;

  // FCT経由のお客さま: 売上は「お客さまが払う単価」ではなく「FCTから入る額」。
  // FCTの明細と同じく お客さまの単価の税抜 × 店舗の歩合率 で出す。
  const fctCust = ctx.customers.find((c) => c.id === lesson.customerId);
  if (isFctCustomer(fctCust)) {
    if (lesson.amount != null) return lesson.amount;   // この回だけ違う額を入れたとき
    const rate = ctx.fctStores?.find((f) => f.id === lesson.fctStoreId)?.rate ?? FCT_DEFAULT_RATE;
    return fctLessonPay(fctCust?.singleSessionPrice, rate);
  }

  // 回数券: 入金額 ÷ 回数
  if (lesson.sessionPassId) {
    const pass = ctx.sessionPasses.find((p) => p.id === lesson.sessionPassId);
    if (pass) {
      if (pass.price != null && pass.totalCount > 0) return Math.round(pass.price / pass.totalCount);
      // price 未設定の場合は人数×回数でマスタから標準単価を算出
      const masterTotal = ctx.sessionPassPriceMap?.[pass.personCount]?.[pass.totalCount];
      if (masterTotal != null && pass.totalCount > 0) return Math.round(masterTotal / pass.totalCount);
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
    if (plan?.price != null && sessions > 0) return Math.round(plan.price / sessions);
  }

  // 単発(都度・オンライン等): レッスン個別金額 → 段階単価 → 顧客の都度単価
  if (courseToPaymentType(course) === "single") {
    // この回だけ金額を入れてあるときは、それがいちばん強い
    if (lesson.amount != null) return lesson.amount;
    // 段階単価（「まとめて4回目まで9,200円、5回目から9,000円」など）が決まっていればそれ
    const tiered = ctx.tieredPrices?.[lesson.id];
    if (tiered != null) return tiered;
    const cust = ctx.customers.find((c) => c.id === lesson.customerId);
    const amount = resolveSingleLessonAmount(lesson.amount, cust?.singleSessionPrice);
    if (amount != null) return amount;
  }

  // フォールバック: プランマスタの標準単価 → 従来の固定単価表（旧コース名の互換用）
  return ctx.lessonFees?.[course] ?? getLessonFee(course);
}

/** 担当者×顧客の組み合わせ歩合率（0〜1の割合）。未設定の組み合わせは既定 TRAINER_RATE(50%)。 */
export function resolveTrainerRate(memberId: string, customerId: string, ctx: CommissionContext): number {
  const r = ctx.trainerRates?.find((x) => x.memberId === memberId && x.customerId === customerId);
  return r != null ? r.rate / 100 : TRAINER_RATE;
}

/**
 * 1レッスンぶんのトレーナーへの支払額。
 *
 * 「1レッスンにつき○円」の固定額が設定されていればそれを払う。
 * 請求額と切り離して払う契約（こちらの請求額をトレーナーに知らせない形）で使う。
 * 設定が無ければ従来どおり 単価 × 歩合率。
 * scheduledAt（レッスンの日時）を渡すと、研修中のトレーナーは研修の額（trainingPayFor）になる。
 */
export function resolveTrainerPay(
  memberId: string, customerId: string, fee: number, ctx: CommissionContext,
  scheduledAt?: string,
): { amount: number; fixed: boolean } {
  // 研修中のトレーナーは、お客さまごとの決まりより先に研修の額（1回○円）
  const training = trainingPayFor(memberId, scheduledAt, ctx);
  if (training != null) return { amount: training, fixed: true };
  const r = ctx.trainerRates?.find((x) => x.memberId === memberId && x.customerId === customerId);
  if (r?.fixedAmount != null) return { amount: Math.round(r.fixedAmount), fixed: true };
  return { amount: Math.round(fee * resolveTrainerRate(memberId, customerId, ctx)), fixed: false };
}

/**
 * 通常レッスン1回ぶんのトレーナーへの支払額。
 * 「無料（トレーナーに支払う）」の回は、売上は0円のまま、金額欄に入れた額をそのまま払う（歩合率はかけない）。
 * それ以外は今までどおり 単価 × 歩合率（または固定額）。
 */
export function resolveLessonTrainerPay(
  memberId: string, lesson: Lesson, ctx: CommissionContext,
): { amount: number; fixed: boolean } {
  if (isFreeTrainerPaidLesson(lesson.course)) {
    return { amount: Math.max(0, Math.round(lesson.amount ?? 0)), fixed: true };
  }
  return resolveTrainerPay(memberId, lesson.customerId, resolveLessonFee(lesson, ctx), ctx, lesson.scheduledAt);
}

/** 体験レッスン1件あたりの標準単価（プランマスタの「体験レッスン」行を優先、無ければ固定単価表） */
export function resolveTrialLessonFee(ctx: Pick<CommissionContext, "lessonFees">): number {
  return ctx.lessonFees?.[TRIAL_LESSON_COURSE_NAME] ?? getLessonFee(TRIAL_LESSON_COURSE_NAME);
}

/**
 * 出張の体験1件あたりの単価。1名は 9,900円、2名は 13,500円（2名合計）。
 * プランマスタに「出張体験レッスン」「出張体験レッスン2名」の行があれば、そちらの金額が優先される。
 */
export function resolveOnsiteTrialFee(ctx: Pick<CommissionContext, "lessonFees">, pair = false): number {
  const name = pair ? ONSITE_TRIAL_PAIR_COURSE_NAME : ONSITE_TRIAL_COURSE_NAME;
  return ctx.lessonFees?.[name] ?? getLessonFee(name);
}

/**
 * 店舗の体験・2名（ペア）1件あたりの単価。9,900円（2名合計）。
 * プランマスタに「体験レッスン2名」の行があれば、そちらの金額が優先される。
 */
export function resolveStorePairTrialFee(ctx: Pick<CommissionContext, "lessonFees">): number {
  return ctx.lessonFees?.[STORE_PAIR_TRIAL_COURSE_NAME] ?? getLessonFee(STORE_PAIR_TRIAL_COURSE_NAME);
}

/**
 * 体験レッスン1件の計上額。
 * この回だけの金額(amount) → 料金区分(course)の単価 → 体験レッスンの標準単価、の順に見る。
 * course 未設定は「体験レッスン」で、店舗・オンラインは 6,600円。
 * 実施形態が「出張」の体験は 9,900円（2026-11-18 以降に登録した分。isOnsiteTrialPrice）。
 * そのうち備考に「利用人数: 2名」とあるものは 13,500円（2名合計）。
 * 店舗の体験で備考に「利用人数: 2名」とあるものは 9,900円（2名合計。2026-11-01 以降に実施する分。isStorePairTrialPeriod）。
 */
export function resolveTrialFee(
  trial: Pick<TrialLesson, "course" | "amount"> & Partial<Pick<TrialLesson, "deliveryMode" | "createdAt" | "note" | "scheduledAt">>,
  ctx: Pick<CommissionContext, "lessonFees">,
): number {
  if (trial.amount != null) return trial.amount;
  const course = trial.course;
  if (course && course !== TRIAL_LESSON_COURSE_NAME) {
    return ctx.lessonFees?.[course] ?? getLessonFee(course);
  }
  if (isOnsiteTrialPrice(trial)) return resolveOnsiteTrialFee(ctx, isPairTrialNote(trial.note));
  if (isStorePairTrialPeriod(trial) && isPairTrialNote(trial.note)) return resolveStorePairTrialFee(ctx);
  return resolveTrialLessonFee(ctx);
}

/**
 * 選択月のトレーナー歩合集計。
 * - lessons: 完了した通常レッスン
 * - trialLessons: 完了した体験レッスン（担当トレーナーへの歩合対象。成約有無は問わない）
 */
export function buildTrainerEntries(
  lessons: Lesson[],
  trialLessons: TrialLesson[],
  month: string,
  ctx: CommissionContext,
): TrainerEntry[] {
  // オーナーのレッスンは歩合を払わない（売上はそのまま利益に残す）
  const filtered = lessons.filter((l) =>
    isoToMonth(l.scheduledAt) === month && l.trainerMemberId && !isOwnerMember(l.trainerMemberId, ctx));
  const filteredTrials = trialLessons.filter((t) =>
    isoToMonth(t.scheduledAt) === month && t.trainerMemberId && !isOwnerMember(t.trainerMemberId, ctx));
  const map = new Map<string, TrainerEntry>();

  for (const l of filtered) {
    const tid  = l.trainerMemberId!;
    // 歩合はレッスン料金そのものを対象とする(レンタルジム代は控除しない／利益計算側で差し引く)
    const fee  = resolveLessonFee(l, ctx);
    const pay  = resolveLessonTrainerPay(tid, l, ctx);

    if (!map.has(tid)) {
      map.set(tid, { memberId: tid, memberName: l.trainerMemberName ?? tid, lessons: [], total: 0 });
    }
    const entry = map.get(tid)!;
    entry.lessons.push({
      lessonId: l.id, customerName: l.customerName,
      course: l.course ?? "", scheduledAt: l.scheduledAt,
      fee, commission: pay.amount, fixedPay: pay.fixed,
    });
    entry.total += pay.amount;
  }

  for (const tl of filteredTrials) {
    const tid  = tl.trainerMemberId!;
    const fee  = resolveTrialFee(tl, ctx);
    const pay  = resolveTrainerPay(tid, tl.customerId, fee, ctx, tl.scheduledAt);

    if (!map.has(tid)) {
      map.set(tid, { memberId: tid, memberName: tl.trainerMemberName ?? tid, lessons: [], total: 0 });
    }
    const entry = map.get(tid)!;
    entry.lessons.push({
      lessonId: `trial-${tl.id}`, customerName: tl.customerName,
      course: trialCourseLabel(tl.course), scheduledAt: tl.scheduledAt,
      fee, commission: pay.amount, fixedPay: pay.fixed,
    });
    entry.total += pay.amount;
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

  // FCT経由のお客さまは自社の営業が付いていないので、営業歩合も成約ボーナスも発生しない
  const fctCustomerIds = new Set(ctx.customers.filter(isFctCustomer).map((c) => c.id));

  // 顧客ID → 営業担当
  const salesByCustomer: Record<string, { memberId: string; memberName: string }> = {};
  // ① 顧客マスタの担当営業を優先
  for (const c of ctx.customers) {
    if (c.salesMemberId && !fctCustomerIds.has(c.id)) {
      salesByCustomer[c.id] = { memberId: c.salesMemberId, memberName: memberName.get(c.salesMemberId) ?? c.salesMemberId };
    }
  }
  // ② 未設定の顧客は最初の成約体験レッスンの営業担当でフォールバック（営業未割当の体験は除く）
  for (const tl of trialLessons) {
    if (fctCustomerIds.has(tl.customerId)) continue;
    if (tl.salesMemberId && !salesByCustomer[tl.customerId]) {
      salesByCustomer[tl.customerId] = { memberId: tl.salesMemberId, memberName: tl.salesMemberName };
    }
    // 2名で受けた体験の2人目も、同じ営業担当（2026-11-23。顧客マスタの担当営業が入っていればそちらが先）
    if (tl.pairCustomerId && tl.salesMemberId && !salesByCustomer[tl.pairCustomerId] && !fctCustomerIds.has(tl.pairCustomerId)) {
      salesByCustomer[tl.pairCustomerId] = { memberId: tl.salesMemberId, memberName: tl.salesMemberName };
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
    if (isOwnerMember(sales.memberId, ctx)) continue; // オーナーには歩合を払わない

    const cType = customerTypeMap[l.customerId] ?? "individual";
    // 歩合はレッスン料金そのものを対象とする（レンタルジム代は控除しない／利益計算側で差し引く）
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
    if (!tl.salesMemberId) continue; // 営業未割当の体験はボーナス対象外
    if (fctCustomerIds.has(tl.customerId)) continue; // FCT経由のお客さまは成約ボーナスなし
    if (isOwnerMember(tl.salesMemberId, ctx)) continue; // オーナーにはボーナスを払わない
    const cType = customerTypeMap[tl.customerId] ?? "individual";
    const bonus = contractBonusFor(cType, tl.scheduledAt); // 2026-11-19 以降の体験は 0（成約ボーナスは11/18の体験まで）
    if (bonus <= 0) continue;

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

/**
 * 選択月の業務（時給）を担当者ごとにまとめる。
 *
 * 支払い対象は「完了」のみ。「予定」のままのものは pending に分けて返し、
 * 完了にし忘れたまま給与計算に進むのを画面側で気付けるようにする。
 * 「キャンセル」は集計に含めない。
 */
export function buildHourlyEntries(hourlyTasks: HourlyTask[], month: string): HourlyEntry[] {
  const map = new Map<string, HourlyEntry>();
  const ensureEntry = (memberId: string, memberName?: string): HourlyEntry => {
    if (!map.has(memberId)) {
      map.set(memberId, {
        memberId, memberName: memberName ?? memberId,
        tasks: [], total: 0, pending: [], pendingTotal: 0,
      });
    }
    return map.get(memberId)!;
  };

  for (const t of hourlyTasks) {
    if (isoToMonth(t.scheduledAt) !== month) continue;
    if (t.status === "cancelled") continue;

    const entry = ensureEntry(t.memberId, t.memberName);
    const row: HourlyTaskRow = {
      taskId: t.id, title: t.title, scheduledAt: t.scheduledAt,
      hours: Math.round(hourlyTaskHours(t) * 10) / 10,
      hourlyRate: t.hourlyRate, amount: hourlyTaskAmount(t), status: t.status,
    };

    if (t.status === "completed") {
      entry.tasks.push(row);
      entry.total += row.amount;
    } else {
      entry.pending.push(row);
      entry.pendingTotal += row.amount;
    }
  }

  for (const e of map.values()) {
    e.tasks.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    e.pending.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

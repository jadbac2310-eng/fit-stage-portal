import type Anthropic from "@anthropic-ai/sdk";
import { tieredLessonPricesAll } from "./session-tiers";
import { getCustomers, isFctCustomer } from "./customers";
import { getLessons } from "./lessons";
import { getTrialLessons } from "./trial-lessons";
import { getAllSessionPasses } from "./session-passes";
import { getAllCustomerPlans } from "./customer-plans";
import { getMembers } from "./members";
import { getAllPlans, getAllSessionPassPrices, buildLessonFeeMap, buildSessionPassPriceMap } from "./plans-master";
import { getMemberCustomerRates } from "./commission-rates";
import { getFctStores } from "./fct-stores";
import { getStores } from "./stores";
import { getRentalGyms } from "./rental-gyms";
import { getAvenirStores } from "./avenir-stores";
import { getActivityLogs } from "./activity-logs";
import { getSalesTargets } from "./sales-targets";
import { getTasks } from "./tasks";
import { getHourlyTasks } from "./hourly-tasks";
import { getExpenses } from "./expenses";
import { getPayments } from "./payments";
import { expenseTotal } from "./expenses-types";
import { feeTotal } from "./payment-fees";
import { enrollmentFeeOf } from "./enrollment-fee";
import { getSideJobs } from "./side-jobs";
import { sideJobTotals, sideJobPayments } from "./side-jobs-types";
import { isBillableLessonStatus, venueKindOf, DELIVERY_MODE_LABEL, type Lesson } from "./lessons-types";
import type { TrialLesson } from "./trial-lessons-types";
import type { Customer } from "./customers-types";
import { STATUS_LABEL as CUSTOMER_STATUS_LABEL } from "./customers-types";
import { jstDay, followUps } from "./highlights-types";
import { isOverdue as isSalesOverdue } from "./sales-targets-types";
import { isTaskDone, isTaskOverdue } from "./tasks-types";
import {
  resolveLessonFee, resolveTrialFee, buildTrainerEntries, buildSalesEntries, buildHourlyEntries, isoToMonth, type CommissionContext,
} from "./commissions";

/**
 * 管理者向けデータアシスタントの「道具」。
 *
 * ここは閲覧専用。書き込みは一切しない。
 * 答えの数字は各画面（経営サマリー・歩合・請求書）と同じ関数で出す。
 * 別々に計算すると画面と食い違って信用を失うので、集計ロジックは lib の既存関数を使う。
 */

// ─── 日付 ───────────────────────────────────────────────

const JST_OFFSET = 9 * 60 * 60 * 1000;

export function todayJst(): string {
  return jstDay(Date.now());
}

export function thisMonthJst(): string {
  return todayJst().slice(0, 7);
}

/** 今日の日付と曜日（案内文に入れる） */
export function todayLabel(): string {
  const d = new Date(Date.now() + JST_OFFSET);
  const w = ["日", "月", "火", "水", "木", "金", "土"][d.getUTCDay()];
  return `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月${d.getUTCDate()}日（${w}）`;
}

function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const t = (y * 12 + (m - 1)) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
}

/**
 * 期間の指定。月（YYYY-MM）か、from/to（YYYY-MM-DD）のどちらか。
 * 両方無ければ今月。from だけなら今日まで、to だけなら月初から。
 */
interface Period { label: string; month?: string; from?: string; to?: string }

function resolvePeriod(input: ToolInput): Period {
  const from = str(input.from);
  const to = str(input.to);
  if (from || to) {
    const f = from || `${(to ?? todayJst()).slice(0, 7)}-01`;
    const t = to || todayJst();
    return { label: `${f}〜${t}`, from: f, to: t };
  }
  const month = str(input.month) || thisMonthJst();
  return { label: month, month };
}

function inPeriod(iso: string, p: Period): boolean {
  if (p.month) return isoToMonth(iso) === p.month;
  const d = jstDay(iso);
  return d >= p.from! && d <= p.to!;
}

// ─── 入力の取り出し ─────────────────────────────────────

export type ToolInput = Record<string, string | number | boolean | undefined>;

function str(v: unknown): string | undefined {
  const s = typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";
  return s || undefined;
}
function num(v: unknown, def: number): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : def;
}
function bool(v: unknown): boolean {
  return v === true || v === "true";
}
const yen = (n: number) => `¥${Math.round(n).toLocaleString("ja-JP")}`;
const day = (iso?: string) => (iso ? jstDay(iso) : undefined);
const dayTime = (iso: string) => {
  const d = new Date(new Date(iso).getTime() + JST_OFFSET);
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)}`;
};
const includes = (hay: string | undefined, needle?: string) => !needle || (hay ?? "").includes(needle);
const pct = (num: number, den: number) => (den > 0 ? `${Math.round((num / den) * 1000) / 10}%` : null);

// ─── 名前の解決（表記ゆれに強く） ───────────────────────

/** 「坂根」「さかね」「坂根さん」などを担当者に当てる。敬称を落とし、部分一致で探す */
function findMember<T extends { name: string }>(members: T[], raw?: string): T | undefined {
  if (!raw) return undefined;
  const q = raw.replace(/(さん|くん|君|ちゃん|様|氏|先生|トレーナー)$/u, "").replace(/\s/g, "");
  if (!q) return undefined;
  return members.find((m) => m.name.replace(/\s/g, "") === q)
    ?? members.find((m) => m.name.replace(/\s/g, "").includes(q))
    ?? members.find((m) => q.includes(m.name.replace(/\s/g, "")));
}

function findCustomers(customers: Customer[], raw?: string): Customer[] {
  if (!raw) return [];
  const q = raw.replace(/(さん|様|君|くん|ちゃん)$/u, "").replace(/\s/g, "");
  if (!q) return [];
  const exact = customers.filter((c) => c.fullName.replace(/\s/g, "") === q);
  if (exact.length) return exact;
  return customers.filter((c) => c.fullName.replace(/\s/g, "").includes(q) || (c.billingName ?? "").replace(/\s/g, "").includes(q));
}

// ─── 会場（店舗） ────────────────────────────────────────

type VenueMasters = {
  stores: { id: string; name: string }[];
  rentalGyms: { id: string; name: string }[];
  fctStores: { id: string; name: string; rate: number }[];
  avenirStores: { id: string; name: string }[];
};

async function loadVenueMasters(): Promise<VenueMasters> {
  const [stores, rentalGyms, fctStores, avenirStores] = await Promise.all([
    getStores(), getRentalGyms(), getFctStores(), getAvenirStores(),
  ]);
  return { stores, rentalGyms, fctStores, avenirStores };
}

type VenueLike = Pick<Lesson, "storeId" | "rentalGymId" | "fctStoreId" | "avenirStoreId" | "storeFee" | "rentalGymFee" | "fctStoreFee" | "avenirStoreFee" | "deliveryMode" | "location">;

/**
 * レッスンの「どこでやったか」を1つの名前にする。
 * 会場マスタ（店舗・FCT・アヴニール・レンタル）が付いていればその名前、
 * 付いていなければ実施形態（出張・オンライン）か、手入力の場所。
 */
function venueOf(l: VenueLike, m: VenueMasters): { kind: string; name: string; fee: number } {
  const kind = venueKindOf(l);
  const fee = (l.rentalGymFee ?? 0) + (l.fctStoreFee ?? 0) + (l.avenirStoreFee ?? 0) + (l.storeFee ?? 0);
  const find = (list: { id: string; name: string }[], id?: string) => list.find((x) => x.id === id)?.name;
  if (kind === "store")  return { kind: "FIT STAGE店舗", name: find(m.stores, l.storeId) ?? "店舗（マスタ未登録）", fee };
  if (kind === "fct")    return { kind: "FCT店舗", name: `FCT ${find(m.fctStores, l.fctStoreId) ?? "（マスタ未登録）"}`, fee };
  if (kind === "avenir") return { kind: "アヴニール店舗", name: `アヴニール ${find(m.avenirStores, l.avenirStoreId) ?? "（マスタ未登録）"}`, fee };
  if (kind === "gym")    return { kind: "レンタルジム", name: `レンタル ${find(m.rentalGyms, l.rentalGymId) ?? "（マスタ未登録）"}`, fee };
  if (l.deliveryMode === "online") return { kind: "オンライン", name: "オンライン", fee };
  if (l.deliveryMode === "onsite") return { kind: "出張", name: `出張${l.location ? `（${l.location}）` : ""}`, fee };
  return { kind: DELIVERY_MODE_LABEL[l.deliveryMode] ?? "その他", name: l.location?.trim() || "会場未設定", fee };
}

function venueMatches(v: { kind: string; name: string }, q?: string): boolean {
  if (!q) return true;
  const t = q.trim().toLowerCase();
  return v.name.toLowerCase().includes(t) || v.kind.toLowerCase().includes(t);
}

/** 体験の備考から「経路: …」を取り出す。full=false なら「Google検索（最初のページ: …）」の括弧より前だけ（集計用） */
function channelOfTrial(t: Pick<TrialLesson, "note">, full = false): string | undefined {
  const m = /経路[:：]\s*([^\n]+)/.exec(t.note ?? "");
  const s = m?.[1]?.trim();
  if (!s) return undefined;
  return full ? s : s.split(/[（(]/)[0].trim();
}

// ─── 共通の読み込み ───────────────────────────────────────

interface Ctx {
  ctx: CommissionContext;
  customers: Customer[];
  lessons: Lesson[];
  trialLessons: TrialLesson[];
  members: Awaited<ReturnType<typeof getMembers>>;
  masters: VenueMasters;
}

async function buildCtx(): Promise<Ctx> {
  const [customers, lessons, trialLessons, passes, plans, members, plansMaster, sppPrices, rates, masters] = await Promise.all([
    getCustomers(), getLessons(), getTrialLessons(), getAllSessionPasses(),
    getAllCustomerPlans(), getMembers(), getAllPlans(), getAllSessionPassPrices(), getMemberCustomerRates(),
    loadVenueMasters(),
  ]);
  const ctx: CommissionContext = {
    customers, sessionPasses: passes, customerPlans: plans,
    members: members.map((m) => ({ id: m.id, name: m.name, isOwner: m.isOwner })),
    trainerRates: rates.map((r) => ({ memberId: r.memberId, customerId: r.customerId, rate: r.rate, fixedAmount: r.fixedAmount })),
    lessonFees: buildLessonFeeMap(plansMaster),
    // 段階単価（請求書と同じ単価で歩合を出す）
    tieredPrices: tieredLessonPricesAll({ customers, lessons }),
    sessionPassPriceMap: buildSessionPassPriceMap(sppPrices),
    fctStores: masters.fctStores.map((f) => ({ id: f.id, rate: f.rate })),
  };
  return { ctx, customers, lessons, trialLessons, members, masters };
}

/** 経営サマリー画面が使う、レッスン以外の支払い（業務の時給・経費・カード手数料） */
interface MoneyExtras {
  hourlyTasks: Awaited<ReturnType<typeof getHourlyTasks>>;
  expenses: Awaited<ReturnType<typeof getExpenses>>;
  payments: { amount: number; method?: string; paidAt?: string }[];
  sideJobs: Awaited<ReturnType<typeof getSideJobs>>;
}

async function loadMoneyExtras(): Promise<MoneyExtras> {
  const [hourlyTasks, expenses, payments, sideJobs] = await Promise.all([getHourlyTasks(), getExpenses(), getPayments(), getSideJobs()]);
  // 決済手数料は入金の記録と単発の仕事（カードでいただいたもの）を合わせて数える（経営サマリーと同じ）
  const pays = [...payments.map((p) => ({ amount: p.amount, method: p.method, paidAt: p.paidAt })), ...sideJobPayments(sideJobs)];
  return { hourlyTasks, expenses, payments: pays, sideJobs };
}

/**
 * 月の経営数字。経営サマリー画面（admin/dashboard の computeMonth）と同じ式：
 *   売上 = 実施レッスン + 実施した体験
 *   利益 = 売上 − トレーナー歩合 − 営業歩合 − 会場利用料（体験分も） − 業務の時給 − 経費 − カード手数料
 */
function monthFigures(month: string, c: Ctx, extras: MoneyExtras) {
  const { ctx, lessons, trialLessons, customers } = c;
  const completed = lessons.filter((l) => isBillableLessonStatus(l.status));
  const completedTrials = trialLessons.filter((t) => t.status === "completed");
  const inMonth = completed.filter((l) => isoToMonth(l.scheduledAt) === month);
  const trialsInMonth = completedTrials.filter((t) => isoToMonth(t.scheduledAt) === month);
  const lessonRevenue = inMonth.reduce((s, l) => s + resolveLessonFee(l, ctx), 0);
  const trialRevenue = trialsInMonth.reduce((s, t) => s + resolveTrialFee(t, ctx), 0);
  const enrollmentRevenue = trialsInMonth.reduce((s, t) => s + enrollmentFeeOf(t, ctx.customers), 0);
  const side = sideJobTotals(extras.sideJobs, month);
  const sideJobRevenue = side.revenue;
  const sideJobCost = side.cost;
  const revenue = lessonRevenue + trialRevenue + enrollmentRevenue + sideJobRevenue;
  const venueFeeOf = (x: { rentalGymFee?: number; fctStoreFee?: number; avenirStoreFee?: number; storeFee?: number }) =>
    (x.rentalGymFee ?? 0) + (x.fctStoreFee ?? 0) + (x.avenirStoreFee ?? 0) + (x.storeFee ?? 0);
  const venueCost = inMonth.reduce((s, l) => s + venueFeeOf(l), 0) + trialsInMonth.reduce((s, t) => s + venueFeeOf(t), 0);
  const trainerPayout = buildTrainerEntries(completed, completedTrials, month, ctx).reduce((s, e) => s + e.total, 0);
  const contractedTrials = trialLessons.filter((t) => t.contracted === true);
  const salesPayout = buildSalesEntries(completed, contractedTrials, month, ctx).reduce((s, e) => s + e.total, 0);
  const hourlyPayout = buildHourlyEntries(extras.hourlyTasks, month).reduce((s, e) => s + e.total, 0);
  const expenses = expenseTotal(extras.expenses, month);
  const paymentFee = feeTotal(extras.payments, month);
  const profit = revenue - trainerPayout - salesPayout - venueCost - hourlyPayout - expenses - paymentFee - sideJobCost;
  const contracted = trialsInMonth.filter((t) => t.contracted === true).length;
  return {
    month,
    revenue, lessonRevenue, trialRevenue, enrollmentRevenue, sideJobRevenue, sideJobCost, trainerPayout, salesPayout, venueCost, hourlyPayout, expenses, paymentFee, profit,
    completedLessons: inMonth.length,
    scheduledLessons: lessons.filter((l) => l.status === "scheduled" && isoToMonth(l.scheduledAt) === month).length,
    trialsHeld: trialsInMonth.length,
    trialsContracted: contracted,
    trialRate: pct(contracted, trialsInMonth.length),
    newCustomers: customers.filter((x) => isoToMonth(x.createdAt) === month).length,
    activeCustomerIds: new Set(inMonth.map((l) => l.customerId)).size,
  };
}

function fmtFigures(f: ReturnType<typeof monthFigures>) {
  return {
    month: f.month,
    revenue: yen(f.revenue),
    revenueBreakdown: { lessons: yen(f.lessonRevenue), trials: yen(f.trialRevenue), enrollmentFees: yen(f.enrollmentRevenue), sideJobs: yen(f.sideJobRevenue) },
    sideJobCost: yen(f.sideJobCost),
    trainerPayout: yen(f.trainerPayout),
    salesPayout: yen(f.salesPayout),
    venueCost: yen(f.venueCost),
    hourlyPayout: yen(f.hourlyPayout),
    expenses: yen(f.expenses),
    cardFees: yen(f.paymentFee),
    profit: yen(f.profit),
    profitMargin: f.revenue > 0 ? `${Math.round((f.profit / f.revenue) * 100)}%` : null,
    completedLessons: f.completedLessons,
    scheduledLessons: f.scheduledLessons,
    trialsHeld: f.trialsHeld,
    trialsContracted: f.trialsContracted,
    trialRate: f.trialRate,
    newCustomers: f.newCustomers,
    customersWithLessons: f.activeCustomerIds,
  };
}

function diffLine(cur: number, prev: number): string {
  const d = cur - prev;
  const sign = d > 0 ? "+" : "";
  const rate = prev > 0 ? ` (${sign}${Math.round((d / prev) * 100)}%)` : "";
  return `${sign}${Math.round(d).toLocaleString("ja-JP")}${rate}`;
}

// ─── ツール定義 ─────────────────────────────────────────

const periodProps = {
  month: { type: "string", description: "対象月 YYYY-MM。省略時は今月。from/to があればそちらを優先" },
  from: { type: "string", description: "期間の始まり YYYY-MM-DD（「今週」「先週」「10日から」などの時に使う）" },
  to: { type: "string", description: "期間の終わり YYYY-MM-DD" },
} as const;

export const ASSISTANT_TOOLS: Anthropic.Tool[] = [
  {
    name: "get_business_summary",
    description: "対象月の経営サマリー（売上＝レッスン＋体験＋入会金＋単発の仕事（マシン設置など）、外注費（単発の仕事）、トレーナー歩合・営業歩合・会場利用料・業務の時給・経費・カード手数料、利益、レッスン数、体験の実施と成約、新規顧客）と、前月との比較。「今月どう？」「先月の利益は」「売上は伸びてる？」に使う。経営サマリー画面と同じ計算。",
    input_schema: {
      type: "object",
      properties: { month: { type: "string", description: "対象月 YYYY-MM（省略時は今月）" } },
    },
  },
  {
    name: "get_monthly_trend",
    description: "直近Nか月の推移（月ごとの完了レッスン数・売上・会場利用料・体験の実施/成約・新規顧客）。担当者名を渡せばその人の分だけ。「最近の推移」「伸びてる？」「半年分の売上」に使う。",
    input_schema: {
      type: "object",
      properties: {
        months: { type: "number", description: "何か月分か（既定6、最大24）" },
        trainer: { type: "string", description: "担当トレーナー名で絞る（省略時は全体）" },
      },
    },
  },
  {
    name: "list_customers",
    description: "顧客（お客様）の一覧。名前・状況（active=在籍中/inactive=退会/pending=審査中/trial=体験申込）・担当営業・FCT経由か・主に使う店舗・登録月で絞れる。各行に 最後に来た日・次の予定・今月の回数・回数券の残り・月プランを付ける。「在籍は何人」「○○店のお客さん」「最近来てない人」などに。",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "氏名の部分一致" },
        status: { type: "string", description: "active / inactive / pending / trial" },
        sales: { type: "string", description: "担当営業の名前、または \"FCT\"（FCT経由のお客様）" },
        venue: { type: "string", description: "主に使っている店舗・会場名の部分一致（江坂、庄内、FCT など）" },
        createdMonth: { type: "string", description: "登録月 YYYY-MM" },
        notSeenDays: { type: "number", description: "この日数以上来ていない在籍中の人だけ（例: 28）" },
        limit: { type: "number", description: "最大件数（既定60）" },
      },
    },
  },
  {
    name: "get_customer",
    description: "1人の顧客の詳細。基本情報・担当営業・経路（体験申込がどこから来たか）・プラン履歴・回数券（残り/予約済み）・体験の結果・月ごとの来店回数（直近6か月）・最後に来た日と次の予定・よく使う店舗・直近のレッスン。「○○さんの状況」「○○さん最近来てる？」に。",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "顧客の氏名（部分一致可）" },
        id: { type: "string", description: "顧客ID" },
      },
    },
  },
  {
    name: "list_lessons",
    description: "レッスンの一覧。期間（月 or from/to）・顧客名・トレーナー名・店舗/会場・状況（scheduled=予定/completed=完了/cancelled=キャンセル/cancelled_same_day=当日キャンセル）で絞れる。件数（totalMatched）も返すので「何件？」にも使える。",
    input_schema: {
      type: "object",
      properties: {
        ...periodProps,
        customer: { type: "string", description: "顧客名の部分一致" },
        trainer: { type: "string", description: "トレーナー名の部分一致" },
        venue: { type: "string", description: "店舗・会場名の部分一致（江坂、庄内、曽根城山、FCT、レンタル、出張、オンライン）" },
        status: { type: "string", description: "scheduled / completed / cancelled / cancelled_same_day" },
        limit: { type: "number", description: "返す行数（既定40・最大200）。件数だけ知りたいときは小さくてよい" },
      },
    },
  },
  {
    name: "get_venue_summary",
    description: "店舗・会場ごとの集計。期間内のレッスン数（完了/予定/キャンセル）・売上・会場利用料・利用した顧客数・担当トレーナー別の件数を、FIT STAGEの店舗（江坂・庄内・曽根城山）、FCT店舗、アヴニール店舗、レンタルジム、出張、オンラインごとに返す。「店舗別に」「○○店は何件」「坂根の店舗ごとの内訳」「FCTはいくら」に。",
    input_schema: {
      type: "object",
      properties: {
        ...periodProps,
        trainer: { type: "string", description: "担当トレーナー名で絞る（その人の店舗別内訳になる）" },
        venue: { type: "string", description: "店舗・会場名の部分一致で絞る" },
      },
    },
  },
  {
    name: "get_trial_summary",
    description: "体験レッスンの集計。期間内の実施数・成約数・不成立・未確定・成約率と、担当営業別・担当トレーナー別・経路別（Google検索/Googleマップ/LINE/紹介など）・店舗別の内訳、個別の一覧。「成約率は」「体験は何件」「どこから来てる？」「○○さんの成約は」に。",
    input_schema: {
      type: "object",
      properties: {
        ...periodProps,
        member: { type: "string", description: "担当者名（営業またはトレーナーとして関わった体験だけ）" },
        limit: { type: "number", description: "一覧の最大件数（既定30）" },
      },
    },
  },
  {
    name: "get_commissions",
    description: "対象月の歩合（トレーナー歩合・営業歩合・成約ボーナス）の担当者別合計。担当者名を渡すとその人の明細（顧客ごと）も返す。歩合画面と同じ計算。オーナー（代表）には歩合が付かない。",
    input_schema: {
      type: "object",
      properties: {
        month: { type: "string", description: "対象月 YYYY-MM（省略時は今月）" },
        member: { type: "string", description: "担当者名（明細まで見たいとき）" },
      },
    },
  },
  {
    name: "list_members",
    description: "担当者（スタッフ）の一覧（氏名・役割・管理者か・オーナーか・歩合率）。名前の表記ゆれを確かめるときにも使う。",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_member_activity",
    description: "担当者（スタッフ）1人の稼働をまとめて取得。期間内の担当レッスン数（完了/予定/キャンセル）・店舗別の内訳・顧客別の件数・体験の実施と成約率・歩合・最終ログイン・直近の操作履歴。「○○はサボってる？」「○○の今月は」「○○の稼働は」に使い、客観的な数字を提示する。",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "担当者の氏名（部分一致可）" },
        ...periodProps,
      },
      required: ["name"],
    },
  },
  {
    name: "get_activity_logs",
    description: "ポータルの操作・ログイン履歴（誰がいつ何をしたか）。担当者名・操作の種類で絞れる。",
    input_schema: {
      type: "object",
      properties: {
        member: { type: "string", description: "担当者名の部分一致" },
        action: { type: "string", description: "操作の種類の部分一致（login など）" },
        limit: { type: "number", description: "最大件数（既定30）" },
      },
    },
  },
  {
    name: "list_session_passes",
    description: "回数券の一覧。顧客ごとの 全回数・今日時点の残り・そのうち予約済み・購入日・金額。残りが少ない人を探す（remainingMax）、特定の人の券を見る、に使う。残り0で予約も無い券は省く。",
    input_schema: {
      type: "object",
      properties: {
        customer: { type: "string", description: "顧客名の部分一致" },
        remainingMax: { type: "number", description: "今日時点の残りがこの数以下の券だけ（例: 2）" },
        limit: { type: "number", description: "最大件数（既定50）" },
      },
    },
  },
  {
    name: "list_customer_plans",
    description: "月プラン（月2回/月4回/月8回）の契約一覧。顧客・プラン・月額・開始日・終了日・今月の利用回数。「月プランの人は何人」「今月まだ来てない月プランの人」に。",
    input_schema: {
      type: "object",
      properties: {
        customer: { type: "string", description: "顧客名の部分一致" },
        activeOnly: { type: "boolean", description: "今日時点で有効な契約だけ（既定 true）" },
      },
    },
  },
  {
    name: "get_follow_ups",
    description: "声をかけたほうがいいお客様（ダッシュボードの「声かけ」と同じ判定）。しばらく来ていない／回数券の残りが少ない／月プランなのに今月来ていない／次の予定が無い。担当営業名で絞れる。",
    input_schema: {
      type: "object",
      properties: { sales: { type: "string", description: "担当営業名で絞る（省略時は全員分）" } },
    },
  },
  {
    name: "get_sales_targets",
    description: "ホテル営業（法人営業先）の進み具合。状況（未着手/テレアポ/企画書作成/訪問/提携/見送り/保留）ごとの件数と、各先の 担当・次にやること・期日・遅れているか。「ホテル営業どうなってる」「期日過ぎてるのは」に。",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", description: "状況で絞る" },
        assignee: { type: "string", description: "担当者名で絞る" },
        overdueOnly: { type: "boolean", description: "期日を過ぎているものだけ" },
      },
    },
  },
  {
    name: "list_tasks",
    description: "「やること」一覧（ジャンル・担当・期限・状況）。管理者には会社のやること、それ以外の人にはその人だけの自分のやることを返す。未完了のもの、期限切れ、担当者別、ジャンル別に見られる。",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", description: "未着手 / 進行中 / 完了（省略時は未完了のみ）" },
        category: { type: "string", description: "ジャンル（ホテル営業 / サイト・SEO / 経理 / 採用 / 法人 / 新店舗 / その他）" },
        assignee: { type: "string", description: "担当者名" },
        overdueOnly: { type: "boolean", description: "期限を過ぎているものだけ" },
      },
    },
  },
];

// ─── 誰が聞いているか（管理者／スタッフ） ────────────────

/**
 * 管理者は全部見られる。スタッフ（管理者でない人）には、
 *   ・会社の売上・利益・経費・会場利用料の金額
 *   ・他の人の歩合の金額・歩合率（フィーの配分）
 *   ・他の人の操作ログ・ログイン時刻
 * を出さない。件数・割合・自分の歩合は出す。歩合ページ・ダッシュボードと同じ線引き。
 */
export interface AssistantScope {
  isAdmin: boolean;
  memberId: string;
  memberName: string;
  role?: string;
}

/** 管理者だけが使える道具 */
const ADMIN_ONLY_TOOLS = new Set(["get_activity_logs"]);

export function assistantToolsFor(scope: AssistantScope): Anthropic.Tool[] {
  return scope.isAdmin ? ASSISTANT_TOOLS : ASSISTANT_TOOLS.filter((t) => !ADMIN_ONLY_TOOLS.has(t.name));
}

/** スタッフには見せない項目（どの道具の結果でも、この名前の項目は丸ごと落とす） */
const STAFF_HIDDEN_KEYS = new Set([
  "revenue", "revenueBreakdown", "lessonRevenue", "trialRevenue", "enrollmentRevenue", "sideJobRevenue", "sideJobCost", "profit", "profitMargin",
  "trainerPayout", "salesPayout", "venueCost", "venueFee", "hourlyPayout", "expenses", "cardFees",
  "commissionRate", "billing", "lastLoginAt", "recentActivity",
]);

function stripForStaff(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(stripForStaff);
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      if (STAFF_HIDDEN_KEYS.has(k)) continue;
      out[k] = stripForStaff(x);
    }
    return out;
  }
  return v;
}

// ─── 実行 ───────────────────────────────────────────────

export async function runAssistantTool(name: string, input: ToolInput, scope: AssistantScope): Promise<string> {
  try {
    if (!scope.isAdmin && ADMIN_ONLY_TOOLS.has(name)) {
      return JSON.stringify({ error: "この道具は管理者だけが使えます" });
    }
    const out = await run(name, input, scope);
    return JSON.stringify(scope.isAdmin ? out : stripForStaff(out));
  } catch (e) {
    return JSON.stringify({ error: String(e) });
  }
}

async function run(name: string, input: ToolInput, scope: AssistantScope): Promise<unknown> {
  switch (name) {
    case "get_business_summary": {
      const month = str(input.month) || thisMonthJst();
      const [c, extras] = await Promise.all([buildCtx(), loadMoneyExtras()]);
      const cur = monthFigures(month, c, extras);
      const prev = monthFigures(addMonths(month, -1), c, extras);
      const isCurrent = month === thisMonthJst();
      if (!scope.isAdmin) {
        // スタッフ向け：件数と割合だけ（ダッシュボードの「今月のFIT STAGE」と同じ線引き。金額は出さない）
        const counts = (f: typeof cur) => ({
          month: f.month, completedLessons: f.completedLessons, scheduledLessons: f.scheduledLessons,
          trialsHeld: f.trialsHeld, trialsContracted: f.trialsContracted, trialRate: f.trialRate,
          newCustomers: f.newCustomers, customersWithLessons: f.activeCustomerIds,
        });
        return {
          period: month,
          ...(isCurrent ? { note: `今月は ${todayJst()} 時点の途中経過。` } : {}),
          current: counts(cur), previousMonth: counts(prev),
          diff: { completedLessons: diffLine(cur.completedLessons, prev.completedLessons), trialsHeld: diffLine(cur.trialsHeld, prev.trialsHeld), newCustomers: diffLine(cur.newCustomers, prev.newCustomers) },
          revenueGrowth: prev.revenue > 0 ? `${Math.round(((cur.revenue - prev.revenue) / prev.revenue) * 100)}%` : null,
          activeCustomers: c.customers.filter((x) => x.status === "active").length,
          note2: "売上・利益の金額は管理者だけが見られる。伸び率（%）だけ出している。",
        };
      }
      return {
        period: month,
        ...(isCurrent ? { note: `今月は ${todayJst()} 時点の途中経過。予定中のレッスン ${cur.scheduledLessons} 件は売上に入っていない。` } : {}),
        current: fmtFigures(cur),
        previousMonth: fmtFigures(prev),
        diff: {
          revenue: diffLine(cur.revenue, prev.revenue),
          profit: diffLine(cur.profit, prev.profit),
          completedLessons: diffLine(cur.completedLessons, prev.completedLessons),
          trialsHeld: diffLine(cur.trialsHeld, prev.trialsHeld),
          newCustomers: diffLine(cur.newCustomers, prev.newCustomers),
        },
        activeCustomers: c.customers.filter((x) => x.status === "active").length,
      };
    }

    case "get_monthly_trend": {
      const n = Math.min(num(input.months, 6), 24);
      const c = await buildCtx();
      const trainer = findMember(c.members, str(input.trainer));
      if (str(input.trainer) && !trainer) return { error: "担当者が見つかりません", availableMembers: c.members.map((m) => m.name) };
      const cur = thisMonthJst();
      const rows = [];
      for (let i = n - 1; i >= 0; i--) {
        const month = addMonths(cur, -i);
        const lessons = c.lessons.filter((l) => isoToMonth(l.scheduledAt) === month && (!trainer || l.trainerMemberId === trainer.id));
        const trials = c.trialLessons.filter((t) => isoToMonth(t.scheduledAt) === month && (!trainer || t.trainerMemberId === trainer.id || t.salesMemberId === trainer.id));
        const done = lessons.filter((l) => isBillableLessonStatus(l.status));
        const held = trials.filter((t) => t.status === "completed");
        const contracted = held.filter((t) => t.contracted === true).length;
        rows.push({
          month,
          completedLessons: done.length,
          revenue: yen(done.reduce((s, l) => s + resolveLessonFee(l, c.ctx), 0) + held.reduce((s, t) => s + resolveTrialFee(t, c.ctx) + enrollmentFeeOf(t, c.customers), 0)),
          venueCost: yen(done.reduce((s, l) => s + (l.rentalGymFee ?? 0) + (l.fctStoreFee ?? 0) + (l.avenirStoreFee ?? 0) + (l.storeFee ?? 0), 0)),
          customers: new Set(done.map((l) => l.customerId)).size,
          trialsHeld: held.length,
          trialsContracted: contracted,
          trialRate: pct(contracted, held.length),
          ...(trainer ? {} : { newCustomers: c.customers.filter((x) => isoToMonth(x.createdAt) === month).length }),
        });
      }
      return { trainer: trainer?.name ?? "全体", months: rows, note: `最後の月（${cur}）は ${todayJst()} 時点の途中経過。` };
    }

    case "list_customers": {
      const c = await buildCtx();
      const { customers, lessons, trialLessons, members, masters, ctx } = c;
      const q = str(input.query);
      const status = str(input.status);
      const salesQ = str(input.sales);
      const venueQ = str(input.venue);
      const createdMonth = str(input.createdMonth);
      const notSeenDays = str(input.notSeenDays) ? num(input.notSeenDays, 0) : 0;
      const limit = Math.min(num(input.limit, 60), 300);
      const today = todayJst();
      const month = thisMonthJst();
      const salesMember = salesQ && salesQ.toUpperCase() !== "FCT" ? findMember(members, salesQ) : undefined;
      if (salesQ && salesQ.toUpperCase() !== "FCT" && !salesMember) return { error: "担当営業が見つかりません", availableMembers: members.map((m) => m.name) };

      // 顧客ごとの来店情報
      type Info = { last?: string; next?: string; thisMonth: number; venues: Map<string, number> };
      const info = new Map<string, Info>();
      const get = (id: string) => { let i = info.get(id); if (!i) { i = { thisMonth: 0, venues: new Map() }; info.set(id, i); } return i; };
      for (const l of lessons) {
        if (l.status === "cancelled") continue;
        const i = get(l.customerId);
        const d = jstDay(l.scheduledAt);
        if (d <= today) { if (!i.last || d > i.last) i.last = d; }
        else if (!i.next || d < i.next) i.next = d;
        if (isoToMonth(l.scheduledAt) === month && isBillableLessonStatus(l.status)) i.thisMonth++;
        const v = venueOf(l, masters).name;
        i.venues.set(v, (i.venues.get(v) ?? 0) + 1);
      }
      for (const t of trialLessons) {
        if (t.status === "cancelled") continue;
        const i = get(t.customerId);
        const d = jstDay(t.scheduledAt);
        if (d <= today) { if (!i.last || d > i.last) i.last = d; }
        else if (!i.next || d < i.next) i.next = d;
      }
      const passLeft = new Map<string, number>();
      for (const p of ctx.sessionPasses) passLeft.set(p.customerId, (passLeft.get(p.customerId) ?? 0) + Math.max(p.remainingCount, 0));
      const activePlan = new Map<string, string>();
      for (const p of ctx.customerPlans) if (p.startedAt <= today && (!p.endedAt || p.endedAt >= today)) activePlan.set(p.customerId, p.plan);

      const mainVenue = (id: string) => {
        const v = info.get(id)?.venues;
        if (!v || v.size === 0) return undefined;
        return Array.from(v.entries()).sort((a, b) => b[1] - a[1])[0][0];
      };
      const daysSince = (d?: string) => (d ? Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${d}T00:00:00Z`)) / 86400000) : undefined);

      const matched = customers.filter((x) =>
        (!q || findCustomers([x], q).length > 0) &&
        (!status || x.status === status) &&
        (!salesQ || (salesQ.toUpperCase() === "FCT" ? isFctCustomer(x) : x.salesMemberId === salesMember!.id)) &&
        (!venueQ || venueMatches({ kind: "", name: mainVenue(x.id) ?? "" }, venueQ)) &&
        (!createdMonth || isoToMonth(x.createdAt) === createdMonth) &&
        (!notSeenDays || (x.status === "active" && (daysSince(info.get(x.id)?.last) ?? 9999) >= notSeenDays)));
      const rows = matched.slice(0, limit).map((x) => {
        const i = info.get(x.id);
        return {
          id: x.id, name: x.fullName, status: CUSTOMER_STATUS_LABEL[x.status] ?? x.status, type: x.customerType === "corporate" ? "法人" : "個人",
          sales: isFctCustomer(x) ? "FCT経由" : members.find((m) => m.id === x.salesMemberId)?.name,
          registered: day(x.createdAt),
          lastVisit: i?.last, daysSinceLastVisit: daysSince(i?.last), nextVisit: i?.next,
          lessonsThisMonth: i?.thisMonth ?? 0,
          mainVenue: mainVenue(x.id),
          passRemaining: passLeft.get(x.id) || undefined,
          plan: activePlan.get(x.id),
        };
      });
      return {
        totalMatched: matched.length, count: rows.length,
        byStatus: Object.fromEntries(Object.entries(CUSTOMER_STATUS_LABEL).map(([k, label]) => [label, matched.filter((x) => x.status === k).length])),
        customers: rows,
      };
    }

    case "get_customer": {
      const c = await buildCtx();
      const { customers, lessons, trialLessons, members, masters, ctx } = c;
      const id = str(input.id);
      const nm = str(input.name);
      const found = id ? customers.filter((x) => x.id === id) : findCustomers(customers, nm);
      if (found.length === 0) return { error: "顧客が見つかりません。list_customers で氏名を確かめてください" };
      if (found.length > 1) return { ambiguous: true, note: "複数の顧客が該当。どの人か確かめること", candidates: found.map((x) => ({ id: x.id, name: x.fullName, status: CUSTOMER_STATUS_LABEL[x.status] })) };
      const x = found[0];
      const today = todayJst();
      const my = lessons.filter((l) => l.customerId === x.id).sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
      const myTrials = trialLessons.filter((t) => t.customerId === x.id).sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
      const past = my.filter((l) => jstDay(l.scheduledAt) <= today && l.status !== "cancelled");
      const future = my.filter((l) => jstDay(l.scheduledAt) > today && l.status === "scheduled");
      const byMonth: Record<string, number> = {};
      for (let i = 5; i >= 0; i--) byMonth[addMonths(thisMonthJst(), -i)] = 0;
      for (const l of my) if (isBillableLessonStatus(l.status) && byMonth[isoToMonth(l.scheduledAt)] != null) byMonth[isoToMonth(l.scheduledAt)]++;
      const venues = new Map<string, number>();
      for (const l of my) if (l.status !== "cancelled") { const v = venueOf(l, masters).name; venues.set(v, (venues.get(v) ?? 0) + 1); }
      const bookedOnPass = new Map<string, number>();
      for (const l of future) if (l.sessionPassId) bookedOnPass.set(l.sessionPassId, (bookedOnPass.get(l.sessionPassId) ?? 0) + 1);
      const passes = ctx.sessionPasses.filter((p) => p.customerId === x.id).map((p) => ({
        total: p.totalCount, remainingAfterBooked: p.remainingCount, bookedFuture: bookedOnPass.get(p.id) ?? 0,
        price: p.price != null ? yen(p.price) : undefined, purchasedAt: day(p.purchasedAt), expiredAt: day(p.expiredAt),
      }));
      const plans = ctx.customerPlans.filter((p) => p.customerId === x.id).map((p) => ({
        plan: p.plan, price: p.price != null ? yen(p.price) : undefined, startedAt: p.startedAt, endedAt: p.endedAt,
        active: p.startedAt <= today && (!p.endedAt || p.endedAt >= today),
      }));
      const billingTo = x.billingToCustomerId ? customers.find((y) => y.id === x.billingToCustomerId)?.fullName : undefined;
      return {
        id: x.id, name: x.fullName, status: CUSTOMER_STATUS_LABEL[x.status] ?? x.status, type: x.customerType === "corporate" ? "法人" : "個人",
        sales: isFctCustomer(x) ? "FCT経由（請求書なし・営業歩合なし）" : members.find((m) => m.id === x.salesMemberId)?.name ?? "担当営業なし",
        registered: day(x.createdAt),
        channel: myTrials.map((t) => channelOfTrial(t, true)).find(Boolean) ?? "記録なし（HPの体験申込以外、または記録前）",
        contact: { phone: x.phoneNumber, email: x.email, address: x.address },
        billing: { billingName: x.billingName, billedTo: billingTo, singleSessionPrice: x.singleSessionPrice != null ? yen(x.singleSessionPrice) : undefined },
        note: x.note,
        plans, sessionPasses: passes,
        trials: myTrials.map((t) => ({
          date: dayTime(t.scheduledAt), status: t.status, sales: t.salesMemberName || undefined, trainer: t.trainerMemberName,
          result: t.contracted === true ? "成約" : t.contracted === false ? "不成立" : "未確定", contractPlan: t.contractPlan, channel: channelOfTrial(t, true),
        })),
        lessonsByMonth: byMonth,
        totalLessons: past.length,
        lastVisit: past[0] ? jstDay(past[0].scheduledAt) : myTrials.find((t) => t.status === "completed") ? jstDay(myTrials.find((t) => t.status === "completed")!.scheduledAt) : undefined,
        nextVisit: future.length ? jstDay(future[future.length - 1].scheduledAt) : undefined,
        scheduledCount: future.length,
        venues: Array.from(venues.entries()).sort((a, b) => b[1] - a[1]).map(([name, n]) => `${name} ${n}回`),
        recentLessons: my.slice(0, 8).map((l) => ({ date: dayTime(l.scheduledAt), course: l.course, status: l.status, trainer: l.trainerMemberName, venue: venueOf(l, masters).name })),
      };
    }

    case "list_lessons": {
      const c = await buildCtx();
      const { lessons, masters, members } = c;
      const p = resolvePeriod(input);
      const cust = str(input.customer)?.replace(/(さん|様|君|くん|ちゃん)$/u, "");
      const trainerQ = str(input.trainer);
      const trainer = findMember(members, trainerQ);
      const venueQ = str(input.venue);
      const status = str(input.status);
      const limit = Math.min(num(input.limit, 40), 200);
      const matched = lessons.filter((l) =>
        inPeriod(l.scheduledAt, p) &&
        includes(l.customerName, cust) &&
        (trainer ? l.trainerMemberId === trainer.id : includes(l.trainerMemberName, trainerQ)) &&
        (!status || l.status === status) &&
        venueMatches(venueOf(l, masters), venueQ));
      const rows = matched
        .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))
        .slice(0, limit)
        .map((l) => {
          const v = venueOf(l, masters);
          return { date: dayTime(l.scheduledAt), customer: l.customerName, course: l.course, status: l.status, trainer: l.trainerMemberName, venue: v.name, venueFee: v.fee || undefined };
        });
      const by = (f: (l: Lesson) => string | undefined) => {
        const m = new Map<string, number>();
        for (const l of matched) { const k = f(l) ?? "（なし）"; m.set(k, (m.get(k) ?? 0) + 1); }
        return Object.fromEntries(Array.from(m.entries()).sort((a, b) => b[1] - a[1]));
      };
      return {
        period: p.label, totalMatched: matched.length, count: rows.length,
        byStatus: by((l) => l.status),
        byTrainer: by((l) => l.trainerMemberName),
        lessons: rows,
      };
    }

    case "get_venue_summary": {
      const c = await buildCtx();
      const { ctx, lessons, masters, members } = c;
      const p = resolvePeriod(input);
      const trainerQ = str(input.trainer);
      const trainer = findMember(members, trainerQ);
      if (trainerQ && !trainer) return { error: "担当者が見つかりません", availableMembers: members.map((m) => m.name) };
      const venueQ = str(input.venue);
      const inP = lessons.filter((l) => inPeriod(l.scheduledAt, p) && (!trainer || l.trainerMemberId === trainer.id));
      type Acc = {
        kind: string; name: string; total: number; completed: number; scheduled: number; cancelled: number; cancelledSameDay: number;
        revenue: number; venueFee: number; customers: Set<string>; trainers: Map<string, number>;
      };
      const acc = new Map<string, Acc>();
      for (const l of inP) {
        const v = venueOf(l, masters);
        if (!venueMatches(v, venueQ)) continue;
        let a = acc.get(v.name);
        if (!a) {
          a = { kind: v.kind, name: v.name, total: 0, completed: 0, scheduled: 0, cancelled: 0, cancelledSameDay: 0, revenue: 0, venueFee: 0, customers: new Set(), trainers: new Map() };
          acc.set(v.name, a);
        }
        a.total++;
        if (l.status === "completed") a.completed++;
        else if (l.status === "scheduled") a.scheduled++;
        else if (l.status === "cancelled") a.cancelled++;
        else if (l.status === "cancelled_same_day") a.cancelledSameDay++;
        if (isBillableLessonStatus(l.status)) { a.revenue += resolveLessonFee(l, ctx); a.venueFee += v.fee; }
        a.customers.add(l.customerId);
        const tn = l.trainerMemberName ?? "担当未設定";
        a.trainers.set(tn, (a.trainers.get(tn) ?? 0) + 1);
      }
      const venues = Array.from(acc.values()).sort((x, y) => y.total - x.total).map((a) => ({
        venue: a.name, kind: a.kind,
        lessons: { total: a.total, completed: a.completed + a.cancelledSameDay, scheduled: a.scheduled, cancelled: a.cancelled, cancelledSameDay: a.cancelledSameDay },
        revenue: yen(a.revenue), venueFee: yen(a.venueFee), customers: a.customers.size,
        trainers: Array.from(a.trainers.entries()).sort((x, y) => y[1] - x[1]).map(([name, n]) => `${name} ${n}件`),
      }));
      const sum = (f: (a: Acc) => number) => Array.from(acc.values()).reduce((s, a) => s + f(a), 0);
      return {
        period: p.label, trainer: trainer?.name ?? "全員", venueFilter: venueQ || "全会場",
        venues,
        totals: { lessons: sum((a) => a.total), completed: sum((a) => a.completed + a.cancelledSameDay), scheduled: sum((a) => a.scheduled), revenue: yen(sum((a) => a.revenue)), venueFee: yen(sum((a) => a.venueFee)) },
        note: "completed は完了＋当日キャンセル（実施扱い）。売上・会場利用料もそのぶん。予定中は含まない。FCT店舗の利用料は0円（FCTが場所を用意）。会場を選ばず「場所」に手打ちした回は、その文字がそのまま会場名として並ぶ。",
      };
    }

    case "get_trial_summary": {
      const c = await buildCtx();
      const { trialLessons, members, masters } = c;
      const p = resolvePeriod(input);
      const memberQ = str(input.member);
      const member = findMember(members, memberQ);
      if (memberQ && !member) return { error: "担当者が見つかりません", availableMembers: members.map((m) => m.name) };
      const limit = Math.min(num(input.limit, 30), 200);
      const all = trialLessons.filter((t) => inPeriod(t.scheduledAt, p) && (!member || t.salesMemberId === member.id || t.trainerMemberId === member.id));
      const held = all.filter((t) => t.status === "completed");
      const contracted = held.filter((t) => t.contracted === true);
      const group = (f: (t: TrialLesson) => string) => {
        const m = new Map<string, { held: number; contracted: number }>();
        for (const t of held) { const k = f(t); const a = m.get(k) ?? { held: 0, contracted: 0 }; a.held++; if (t.contracted === true) a.contracted++; m.set(k, a); }
        return Array.from(m.entries()).sort((a, b) => b[1].held - a[1].held).map(([key, a]) => ({ key, held: a.held, contracted: a.contracted, rate: pct(a.contracted, a.held) }));
      };
      return {
        period: p.label, member: member?.name ?? "全員",
        totals: {
          scheduled: all.filter((t) => t.status === "scheduled").length,
          held: held.length,
          contracted: contracted.length,
          notContracted: held.filter((t) => t.contracted === false).length,
          undecided: held.filter((t) => t.contracted == null).length,
          cancelled: all.filter((t) => t.status === "cancelled").length,
          rate: pct(contracted.length, held.length),
        },
        bySales: group((t) => t.salesMemberName || "担当営業なし"),
        byTrainer: group((t) => t.trainerMemberName ?? "担当トレーナーなし"),
        byChannel: group((t) => channelOfTrial(t) ?? "記録なし"),
        byVenue: group((t) => venueOf(t, masters).name),
        trials: all.sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt)).slice(0, limit).map((t) => ({
          date: dayTime(t.scheduledAt), customer: t.customerName, status: t.status,
          result: t.status !== "completed" ? undefined : t.contracted === true ? "成約" : t.contracted === false ? "不成立" : "未確定",
          contractPlan: t.contractPlan, sales: t.salesMemberName || undefined, trainer: t.trainerMemberName, channel: channelOfTrial(t, true), venue: venueOf(t, masters).name,
        })),
        note: "成約率 = 成約 ÷ 実施（未確定も分母に入る）。未確定が多いときは結果の入力をうながす。経路は2026-10-30以降のHP申込だけ記録がある。",
      };
    }

    case "get_commissions": {
      const month = str(input.month) || thisMonthJst();
      const c = await buildCtx();
      const { ctx, lessons, trialLessons, members } = c;
      const memberQ = str(input.member);
      let member = findMember(members, memberQ);
      if (memberQ && !member) return { error: "担当者が見つかりません", availableMembers: members.map((m) => m.name) };
      if (!scope.isAdmin) {
        // スタッフは自分の歩合だけ（歩合ページと同じ）
        if (member && member.id !== scope.memberId) return { error: "他の人の歩合は管理者だけが見られます。自分の分なら出せます" };
        member = members.find((m) => m.id === scope.memberId);
        if (!member) return { error: "担当者の情報が見つかりません" };
      }
      const completed = lessons.filter((l) => isBillableLessonStatus(l.status));
      const completedTrials = trialLessons.filter((t) => t.status === "completed");
      const contractedTrials = trialLessons.filter((t) => t.contracted === true);
      const trainerEntries = buildTrainerEntries(completed, completedTrials, month, ctx);
      const salesEntries = buildSalesEntries(completed, contractedTrials, month, ctx);
      const trainer = trainerEntries.filter((e) => !member || e.memberId === member.id).map((e) => ({
        name: e.memberName, total: yen(e.total), lessons: e.lessons.length,
        ...(member ? { detail: groupLines(e.lessons.map((r) => ({ customer: r.customerName, pay: r.commission }))) } : {}),
      }));
      const sales = salesEntries.filter((e) => !member || e.memberId === member.id).map((e) => ({
        name: e.memberName, total: yen(e.total), lessonPart: yen(e.lessonTotal), bonusPart: yen(e.bonusTotal),
        ...(member ? {
          detail: groupLines(e.lessons.map((r) => ({ customer: r.customerName, pay: r.commission }))),
          bonuses: e.bonuses.map((b) => ({ customer: b.customerName, amount: yen(b.amount) })),
        } : {}),
      }));
      const owner = members.find((m) => m.isOwner);
      return {
        month, trainer, sales,
        ...(scope.isAdmin ? { totals: { trainer: yen(trainerEntries.reduce((s, e) => s + e.total, 0)), sales: yen(salesEntries.reduce((s, e) => s + e.total, 0)) } } : {}),
        note: `${owner ? `${owner.name}（オーナー）` : "オーナー"}のレッスンには歩合が付かない（売上はそのまま利益）。`,
      };
    }

    case "list_members": {
      const members = await getMembers();
      return members.map((m) => ({ id: m.id, name: m.name, role: m.role, isAdmin: m.isAdmin, isOwner: m.isOwner, commissionRate: m.commissionRate != null ? `${m.commissionRate}%` : "既定" }));
    }

    case "get_member_activity": {
      const c = await buildCtx();
      const { ctx, lessons, trialLessons, members, masters } = c;
      const p = resolvePeriod(input);
      const member = findMember(members, str(input.name));
      if (!member) return { error: "担当者が見つかりません", availableMembers: members.map((m) => m.name) };
      const logs = await getActivityLogs({ limit: 500 });
      const myLessons = lessons.filter((l) => l.trainerMemberId === member.id);
      const inP = myLessons.filter((l) => inPeriod(l.scheduledAt, p));
      const month = p.month ?? thisMonthJst();
      const completed = lessons.filter((l) => isBillableLessonStatus(l.status));
      const completedTrials = trialLessons.filter((t) => t.status === "completed");
      const contractedTrials = trialLessons.filter((t) => t.contracted === true);
      const trainerComm = buildTrainerEntries(completed, completedTrials, month, ctx).find((e) => e.memberId === member.id);
      const salesComm = buildSalesEntries(completed, contractedTrials, month, ctx).find((e) => e.memberId === member.id);
      const myTrials = trialLessons.filter((t) => (t.trainerMemberId === member.id || t.salesMemberId === member.id) && inPeriod(t.scheduledAt, p));
      const heldTrials = myTrials.filter((t) => t.status === "completed");
      const myLogs = logs.filter((l) => l.memberId === member.id);
      const lastLogin = myLogs.find((l) => l.action === "login")?.createdAt;
      const count = <K,>(items: Lesson[], key: (l: Lesson) => K) => {
        const m = new Map<K, { total: number; completed: number; scheduled: number }>();
        for (const l of items) {
          const a = m.get(key(l)) ?? { total: 0, completed: 0, scheduled: 0 };
          a.total++;
          if (isBillableLessonStatus(l.status)) a.completed++;
          if (l.status === "scheduled") a.scheduled++;
          m.set(key(l), a);
        }
        return Array.from(m.entries()).sort((x, y) => y[1].total - x[1].total).map(([k, a]) => ({ key: k, ...a }));
      };
      const today = todayJst();
      return {
        name: member.name, role: member.role, isOwner: member.isOwner, period: p.label,
        lessons: {
          total: inP.length,
          completed: inP.filter((l) => isBillableLessonStatus(l.status)).length,
          scheduled: inP.filter((l) => l.status === "scheduled").length,
          cancelled: inP.filter((l) => l.status === "cancelled").length,
          cancelledSameDay: inP.filter((l) => l.status === "cancelled_same_day").length,
          revenue: yen(inP.filter((l) => isBillableLessonStatus(l.status)).reduce((s, l) => s + resolveLessonFee(l, ctx), 0)),
        },
        byVenue: count(inP, (l) => venueOf(l, masters).name),
        byCustomer: count(inP, (l) => l.customerName).slice(0, 15),
        trials: {
          held: heldTrials.length, contracted: heldTrials.filter((t) => t.contracted === true).length,
          undecided: heldTrials.filter((t) => t.contracted == null).length,
          rate: pct(heldTrials.filter((t) => t.contracted === true).length, heldTrials.length),
          scheduled: myTrials.filter((t) => t.status === "scheduled").length,
        },
        // 歩合は管理者か本人にだけ。他人の分は「管理者のみ」とだけ返す
        commission: member.isOwner ? "オーナーなので歩合なし"
          : (scope.isAdmin || member.id === scope.memberId)
            ? { month, trainer: yen(trainerComm?.total ?? 0), sales: yen(salesComm?.total ?? 0), total: yen((trainerComm?.total ?? 0) + (salesComm?.total ?? 0)) }
            : "他の人の歩合は管理者だけが見られる",
        ...(scope.isAdmin || member.id === scope.memberId ? {} : { note_privacy: "他の人の最終ログイン・操作履歴・歩合は出さない" }),
        totalLessonsAllTime: myLessons.filter((l) => isBillableLessonStatus(l.status)).length,
        upcoming: myLessons.filter((l) => l.status === "scheduled" && jstDay(l.scheduledAt) >= today).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)).slice(0, 5)
          .map((l) => ({ date: dayTime(l.scheduledAt), customer: l.customerName, venue: venueOf(l, masters).name })),
        recentLessons: myLessons.filter((l) => jstDay(l.scheduledAt) <= today).sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt)).slice(0, 5)
          .map((l) => ({ date: dayTime(l.scheduledAt), customer: l.customerName, status: l.status, venue: venueOf(l, masters).name })),
        lastLoginAt: lastLogin ? dayTime(lastLogin) : "記録なし",
        recentActivity: myLogs.slice(0, 8).map((l) => ({ at: dayTime(l.createdAt), action: l.action, summary: l.summary })),
        note: "稼働の評価は上の数字を材料として示す。予定中や直近の活動も見てから言う。",
      };
    }

    case "get_activity_logs": {
      const member = str(input.member);
      const action = str(input.action);
      const limit = Math.min(num(input.limit, 30), 200);
      const logs = await getActivityLogs({ limit: 500 });
      const rows = logs
        .filter((l) => includes(l.memberName, member) && includes(l.action, action))
        .slice(0, limit)
        .map((l) => ({ at: dayTime(l.createdAt), member: l.memberName, action: l.action, summary: l.summary }));
      return { count: rows.length, logs: rows };
    }

    case "list_session_passes": {
      const c = await buildCtx();
      const { ctx, customers, lessons } = c;
      const cust = str(input.customer);
      const remainingMax = str(input.remainingMax) != null ? Number(input.remainingMax) : undefined;
      const limit = Math.min(num(input.limit, 50), 300);
      const today = todayJst();
      const booked = new Map<string, number>();
      for (const l of lessons) if (l.sessionPassId && l.status === "scheduled" && jstDay(l.scheduledAt) > today) booked.set(l.sessionPassId, (booked.get(l.sessionPassId) ?? 0) + 1);
      const nameOf = (id: string) => customers.find((x) => x.id === id)?.fullName ?? id;
      const rows = ctx.sessionPasses
        .map((p) => ({ p, b: booked.get(p.id) ?? 0, name: nameOf(p.customerId) }))
        .filter(({ p, b, name }) => (p.remainingCount > 0 || b > 0) && includes(name, cust) && (remainingMax == null || Number.isNaN(remainingMax) || p.remainingCount + b <= remainingMax))
        .sort((a, b) => (a.p.remainingCount + a.b) - (b.p.remainingCount + b.b))
        .slice(0, limit)
        .map(({ p, b, name }) => ({
          customer: name, total: p.totalCount, remainingToday: p.remainingCount + b, bookedFuture: b, remainingAfterBooked: p.remainingCount,
          personCount: p.personCount, price: p.price != null ? yen(p.price) : undefined, purchasedAt: day(p.purchasedAt), expiredAt: day(p.expiredAt),
        }));
      return { count: rows.length, passes: rows, note: "remainingToday = 今日時点の残り（まだ使っていない回）。remainingAfterBooked = 先の予約を引いた残り。声かけの目安は remainingToday で見る。" };
    }

    case "list_customer_plans": {
      const c = await buildCtx();
      const { ctx, customers, lessons } = c;
      const cust = str(input.customer);
      const activeOnly = input.activeOnly === undefined ? true : bool(input.activeOnly);
      const today = todayJst();
      const month = thisMonthJst();
      const nameOf = (id: string) => customers.find((x) => x.id === id)?.fullName ?? id;
      const used = new Map<string, number>();
      for (const l of lessons) if (l.paymentType === "monthly" && isBillableLessonStatus(l.status) && isoToMonth(l.scheduledAt) === month) used.set(l.customerId, (used.get(l.customerId) ?? 0) + 1);
      const rows = ctx.customerPlans
        .filter((p) => (!activeOnly || (p.startedAt <= today && (!p.endedAt || p.endedAt >= today))) && includes(nameOf(p.customerId), cust))
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
        .map((p) => ({
          customer: nameOf(p.customerId), plan: p.plan, price: p.price != null ? yen(p.price) : undefined,
          startedAt: p.startedAt, endedAt: p.endedAt, usedThisMonth: used.get(p.customerId) ?? 0,
        }));
      return { count: rows.length, plans: rows };
    }

    case "get_follow_ups": {
      const c = await buildCtx();
      const { ctx, customers, lessons, trialLessons, members } = c;
      const salesQ = str(input.sales);
      const sales = findMember(members, salesQ);
      if (salesQ && !sales) return { error: "担当者が見つかりません", availableMembers: members.map((m) => m.name) };
      // スタッフは自分のお客様（担当営業が自分、または自分が担当したことがある人）だけ。ダッシュボードと同じ
      const trainedByMe = new Set(lessons.filter((l) => l.trainerMemberId === scope.memberId).map((l) => l.customerId));
      const rows = followUps(customers, lessons, trialLessons, ctx.sessionPasses, ctx.customerPlans)
        .filter((f) => !sales || f.salesMemberId === sales.id)
        .filter((f) => scope.isAdmin || f.salesMemberId === scope.memberId || trainedByMe.has(f.customerId))
        .map((f) => ({ customer: f.customerName, reason: f.reason, kind: f.kind, sales: members.find((m) => m.id === f.salesMemberId)?.name }));
      return { count: rows.length, followUps: rows, note: "kind: away=しばらく来ていない / passLow=回数券の残り少 / planUnused=月プランなのに今月まだ / noNext=次の予定なし" };
    }

    case "get_sales_targets": {
      const [targets, members] = await Promise.all([getSalesTargets(), getMembers()]);
      const status = str(input.status);
      const assignee = findMember(members, str(input.assignee));
      const overdueOnly = bool(input.overdueOnly);
      const today = todayJst();
      const matched = targets.filter((t) =>
        (!status || t.status === status) && (!assignee || t.assigneeId === assignee.id) && (!overdueOnly || isSalesOverdue(t, today)));
      const byStatus: Record<string, number> = {};
      for (const t of targets) byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
      return {
        total: targets.length, byStatus, count: matched.length,
        targets: matched.map((t) => ({
          name: t.name, area: t.area, priority: t.priority, status: t.status,
          assignee: members.find((m) => m.id === t.assigneeId)?.name, nextAction: t.nextAction, nextActionOn: t.nextActionOn,
          overdue: isSalesOverdue(t, today), memo: t.memo, updatedAt: day(t.updatedAt),
        })),
      };
    }

    case "list_tasks": {
      // 会社のやることは管理者だけ。ほかの人には、その人の自分のやることだけを見せる（2026-11-13）
      const [tasks, members] = await Promise.all([scope.isAdmin ? getTasks() : getTasks({ ownerId: scope.memberId }), getMembers()]);
      const status = str(input.status);
      const category = str(input.category);
      const assignee = findMember(members, str(input.assignee));
      const overdueOnly = bool(input.overdueOnly);
      const today = todayJst();
      const matched = tasks.filter((t) =>
        (status ? t.status === status : !isTaskDone(t)) && (!category || t.category === category) &&
        (!assignee || t.assigneeId === assignee.id) && (!overdueOnly || isTaskOverdue(t, today)));
      return {
        count: matched.length,
        openTotal: tasks.filter((t) => !isTaskDone(t)).length,
        tasks: matched.map((t) => ({
          title: t.title, category: t.category, status: t.status, assignee: members.find((m) => m.id === t.assigneeId)?.name,
          dueOn: t.dueOn, overdue: isTaskOverdue(t, today), memo: t.memo,
        })),
      };
    }

    default:
      return { error: `知らない道具です: ${name}` };
  }
}

/** 歩合の明細を顧客ごとにまとめる */
function groupLines(lines: { customer: string; pay: number }[]) {
  const m = new Map<string, { count: number; pay: number }>();
  for (const l of lines) { const a = m.get(l.customer) ?? { count: 0, pay: 0 }; a.count++; a.pay += l.pay; m.set(l.customer, a); }
  return Array.from(m.entries()).sort((a, b) => b[1].pay - a[1].pay).map(([customer, a]) => ({ customer, lessons: a.count, pay: yen(a.pay) }));
}

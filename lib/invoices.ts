import type { Customer, CustomerType, PaymentDueMonth } from "./customers-types";
import type { CustomerPlanRecord } from "./customer-plans-types";
import type { SessionPass } from "./session-passes-types";
import type { Lesson } from "./lessons-types";
import type { TrialLesson } from "./trial-lessons-types";
import { courseToPaymentType, isBillableLessonStatus, resolveSingleLessonAmount } from "./lessons-types";
import { TRIAL_LESSON_COURSE_NAME } from "./commissions-types";
import { resolveTrialFee } from "./commissions";
import type { PlanMaster } from "./plans-master-types";
import { buildLessonFeeMap, planUnitPrice } from "./plans-master-types";

// ─── 発行元・振込先 ───────────────────────────────────────
export const ISSUER = {
  name: "FIT STAGE",
  contact: "坂根尚樹",                       // 窓口担当者
  registrationNumber: "T2810714106494",      // 適格請求書発行事業者 登録番号（インボイス）
  address: "大阪府吹田市豊津町5-27\nドムス江坂II - A",
  tel: "TEL: 070-2397-1822",
  email: "fitstage.000@gmail.com",
};

// 消費税率（パーソナル指導は標準税率10%）
export const TAX_RATE = 10;

// 請求書の品名（サービス名）。種別ごとに内容を併記する。
export const PROGRAM_LABEL = "健康増進プログラム利用料";

/** 宛名の敬称（法人=御中／個人=様） */
export function addresseeSuffix(type: CustomerType): string {
  return type === "corporate" ? "御中" : "様";
}

/** 税込合計から税率ごとの内訳（税抜・消費税額）を求める（端数は請求書単位で1回丸め） */
export function taxBreakdown(totalIncluding: number): { rate: number; net: number; tax: number; gross: number } {
  const net = Math.round(totalIncluding / (1 + TAX_RATE / 100));
  return { rate: TAX_RATE, net, tax: totalIncluding - net, gross: totalIncluding };
}

export const BANK_INFO = {
  bankName: "池田泉州銀行 桃山台支店",
  accountType: "普通",
  accountNumber: "191119",
  accountHolder: "フィットステージ　坂根尚樹",
};

// ─── 請求データ ──────────────────────────────────────────
export interface InvoiceLine {
  date: string;   // 日付（YYYY-MM-DD）
  label: string;  // 品目
  amount: number; // 金額（円）
}

export interface CustomerInvoice {
  customerId: string;
  customerName: string;
  month: string;  // YYYY-MM
  lines: InvoiceLine[];
  total: number;
}

/** 請求の対象期間（両端を含む・YYYY-MM-DD） */
export interface BillingPeriod {
  from: string;
  to:   string;
}

function lastDayOf(year: number, month: number): number {
  return new Date(year, month, 0).getDate(); // new Date(年, month, 0) = month月（1始まり）の末日
}

function ymd(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * 対象月の請求期間を求める。
 *
 * 締日が未設定なら、これまでどおり暦の月（1日〜末日）。
 * 締日が20なら 2026年10月分 = 2026/09/21 〜 2026/10/20 のように、前月から当月の締日まで。
 * 締日がその月に無いとき（2月の31日など）は、その月の末日として扱う。
 */
export function billingPeriod(month: string, cutoffDay?: number | null): BillingPeriod {
  const [y, m] = month.split("-").map((x) => parseInt(x, 10));
  if (cutoffDay == null) return { from: ymd(y, m, 1), to: ymd(y, m, lastDayOf(y, m)) };

  const to = Math.min(cutoffDay, lastDayOf(y, m));
  const prevY = m === 1 ? y - 1 : y;
  const prevM = m === 1 ? 12 : m - 1;
  const prevCutoff = Math.min(cutoffDay, lastDayOf(prevY, prevM));

  // 前月の締日の翌日から。前月の末日が締日なら、当月1日から
  const from = prevCutoff >= lastDayOf(prevY, prevM)
    ? ymd(y, m, 1)
    : ymd(prevY, prevM, prevCutoff + 1);

  return { from, to: ymd(y, m, to) };
}

/** 「2026/9/21〜10/20」のような期間ラベル。暦の月のときは null（月表示で足りるため） */
export function billingPeriodLabel(month: string, cutoffDay?: number | null): string | null {
  if (cutoffDay == null) return null;
  const p = billingPeriod(month, cutoffDay);
  const [fy, fm, fd] = p.from.split("-").map((x) => parseInt(x, 10));
  const [ty, tm, td] = p.to.split("-").map((x) => parseInt(x, 10));
  const fromLabel = `${fy}年${fm}月${fd}日`;
  const toLabel = fy === ty ? `${tm}月${td}日` : `${ty}年${tm}月${td}日`;
  return `${fromLabel}〜${toLabel}`;
}

function inPeriod(iso: string | undefined, period: BillingPeriod): boolean {
  if (!iso) return false;
  const d = iso.slice(0, 10);
  return d >= period.from && d <= period.to;
}

// ─── 表示・採番ヘルパー（請求書プレビューとPDFで共通利用） ───
export function monthLabel(month: string): string {
  const [y, m] = month.split("-");
  return `${y}年${parseInt(m, 10)}月`;
}
/** 顧客ごとの支払期限ルール。未指定なら「翌月末」 */
export interface PaymentDueRule {
  paymentDueMonth?: PaymentDueMonth;
  paymentDueDay?: number;
}

/**
 * 支払期限を求める。戻り値は YYYY-MM-DD。
 *
 * 既定は対象月の翌月末日（例: 6月分 → 7月31日）。
 * 顧客に「当月末」「翌月25日」などのルールが設定されていればそれに従う。
 * 指定日がその月に無いとき（2月の31日など）は、その月の末日に寄せる。
 */
export function defaultDueDate(month: string, rule?: PaymentDueRule): string {
  const [y, m] = month.split("-").map((x) => parseInt(x, 10));
  const sameMonth = rule?.paymentDueMonth === "same";
  const year = sameMonth ? y : (m === 12 ? y + 1 : y);
  const mon  = sameMonth ? m : (m === 12 ? 1 : m + 1);
  const lastDay = new Date(year, mon, 0).getDate(); // new Date(年, mon, 0) = mon月（1始まり）の末日
  const day = rule?.paymentDueDay == null ? lastDay : Math.min(rule.paymentDueDay, lastDay);
  return `${year}-${String(mon).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
/** YYYY-MM-DD → 「2026年8月10日」 */
export function formatDueDate(iso: string): string {
  const [y, m, d] = iso.split("-").map((x) => parseInt(x, 10));
  return `${y}年${m}月${d}日`;
}
/**
 * 請求書に表示する支払期限。
 * その月だけの個別設定(override) → 顧客のルール → 既定（翌月末）の順に使う。
 */
export function dueDateLabel(month: string, override?: string | null, rule?: PaymentDueRule): string {
  return formatDueDate(override || defaultDueDate(month, rule));
}
export function invoiceNumber(month: string, customerId: string): string {
  return `INV-${month.replace("-", "")}-${customerId.slice(0, 6).toUpperCase()}`;
}

/** 請求書の組み立てに使う既定単価。 */
export interface InvoiceFees {
  /** 都度レッスンの既定単価（レッスン個別金額も顧客の都度単価も無いときのフォールバック） */
  single: number;
  /** コース名 → 1回単価。体験レッスンの料金区分を解決するのに使う */
  lessonFees: Record<string, number>;
}

/**
 * プランマスタから請求書の既定単価を取り出す。
 * 体験レッスンもマスタ上は payment_type='single' なので、「都度」の単価を拾うときは
 * コース名で除外する（先頭一致で体験レッスンを掴んでしまわないように）。
 */
export function invoiceFeesFromPlans(plansMaster: PlanMaster[]): InvoiceFees {
  const singleMaster = plansMaster.find(
    (p) => p.paymentType === "single" && p.name !== TRIAL_LESSON_COURSE_NAME,
  );
  return {
    single: singleMaster ? planUnitPrice(singleMaster) : 0,
    // マスタ未登録のコースは resolveTrialFee 側で固定単価表（体験=6,600円）にフォールバックする
    lessonFees: buildLessonFeeMap(plansMaster),
  };
}

/** 請求対象データ。体験レッスンは未指定なら請求に含めない。 */
export interface InvoiceData {
  plans: CustomerPlanRecord[];
  passes: SessionPass[];
  lessons: Lesson[];
  trialLessons?: TrialLesson[];
}

/**
 * 顧客1名・対象月の請求を組み立てる。
 * - 月額プラン: 購入日(purchasedAt)がその月のもの → 月額を計上
 * - 回数券: 購入日(purchasedAt)がその月のもの → 総額を計上
 * - 都度: その月に「完了」した都度レッスン → 1回ごとに計上
 * - 体験: その月に「完了」した体験レッスン → 1回ごとに計上
 */
export function buildInvoice(
  customer: Customer,
  month: string,
  data: InvoiceData,
  fees: InvoiceFees = { single: 0, lessonFees: {} },
  /** まとめ請求では請求先の締日に揃えるため、期間を外から渡せるようにしている */
  period: BillingPeriod = billingPeriod(month, customer.billingCutoffDay),
): CustomerInvoice {
  const lines: InvoiceLine[] = [];

  // 月額プラン（購入月で計上）。金額未設定(null)のみ除外し、0円は0円として明細に出す
  for (const p of data.plans) {
    if (p.customerId !== customer.id || p.price == null) continue;
    const date = p.purchasedAt ?? p.startedAt;
    if (!inPeriod(date, period)) continue;
    lines.push({ date, label: `${PROGRAM_LABEL}（${p.plan}）`, amount: p.price });
  }

  // 回数券（購入月で計上）
  for (const pass of data.passes) {
    if (pass.customerId !== customer.id || pass.price == null) continue;
    if (!inPeriod(pass.purchasedAt, period)) continue;
    const persons = pass.personCount && pass.personCount > 1 ? `（${pass.personCount}名）` : "";
    lines.push({ date: pass.purchasedAt, label: `${PROGRAM_LABEL}（回数券 ${pass.totalCount}回${persons}）`, amount: pass.price });
  }

  // 単発レッスン（都度・オンラインパーソナル等。その月に完了したもの）
  for (const l of data.lessons) {
    if (l.customerId !== customer.id) continue;
    if (courseToPaymentType(l.course) !== "single" || !isBillableLessonStatus(l.status)) continue;
    if (!inPeriod(l.scheduledAt, period)) continue;
    const amount = resolveSingleLessonAmount(l.amount, customer.singleSessionPrice) ?? fees.single;
    // カッコに入れるのは実施形態だけにする。「都度」などの支払い方法は金額で分かるので書かない
    const label = l.course === "オンラインパーソナル"
      ? `${PROGRAM_LABEL}（オンライン）`
      : PROGRAM_LABEL;
    lines.push({ date: l.scheduledAt.slice(0, 10), label, amount });
  }

  // 体験レッスン（その月に完了したもの）。料金区分が「都度」等なら、その単価で計上する。
  for (const t of data.trialLessons ?? []) {
    if (t.customerId !== customer.id || t.status !== "completed") continue;
    if (!inPeriod(t.scheduledAt, period)) continue;
    lines.push({
      date: t.scheduledAt.slice(0, 10),
      // 請求書には体験であることも、支払い方法（都度など）も書かない。通常のレッスンと同じ表記にする
      label: PROGRAM_LABEL,
      amount: resolveTrialFee(t, { lessonFees: fees.lessonFees }),
    });
  }

  lines.sort((a, b) => a.date.localeCompare(b.date));
  const total = lines.reduce((s, l) => s + l.amount, 0);
  return { customerId: customer.id, customerName: customer.fullName, month, lines, total };
}

/**
 * 請求のまとめ先を解決し、「請求書を発行する顧客(biller)」ごとに対象顧客をグループ化する。
 * billingToCustomerId を辿って最終的な請求先を求める（循環・欠落は安全に打ち切り）。
 */
export function billingGroups(customers: Customer[]): { biller: Customer; members: Customer[] }[] {
  const byId = new Map(customers.map((c) => [c.id, c]));
  const groups = new Map<string, Customer[]>();

  for (const c of customers) {
    let biller = c;
    const seen = new Set<string>([c.id]);
    while (biller.billingToCustomerId && byId.has(biller.billingToCustomerId) && !seen.has(biller.billingToCustomerId)) {
      seen.add(biller.billingToCustomerId);
      biller = byId.get(biller.billingToCustomerId)!;
    }
    if (!groups.has(biller.id)) groups.set(biller.id, []);
    groups.get(biller.id)!.push(c);
  }

  return Array.from(groups.entries()).map(([id, members]) => ({ biller: byId.get(id)!, members }));
}

/** 請求宛名（上書きがあればそれを使う） */
export function billingName(c: Customer): string {
  return c.billingName?.trim() || c.fullName;
}

/**
 * まとめ先(biller)の請求書を、グループ内の全顧客の明細を合算して組み立てる。
 * 品目に受講者の氏名は入れない（誰が受けたかは請求書に出さない方針）。
 */
export function buildGroupInvoice(
  biller: Customer,
  members: Customer[],
  month: string,
  data: InvoiceData,
  fees: InvoiceFees = { single: 0, lessonFees: {} },
): CustomerInvoice {
  // 期間は請求先の締日に合わせる（まとめられる側がばらばらの締日でも1枚にそろう）
  const period = billingPeriod(month, biller.billingCutoffDay);
  const lines: InvoiceLine[] = [];
  for (const c of members) {
    lines.push(...buildInvoice(c, month, data, fees, period).lines);
  }
  lines.sort((a, b) => a.date.localeCompare(b.date));
  const total = lines.reduce((s, l) => s + l.amount, 0);
  return { customerId: biller.id, customerName: billingName(biller), month, lines, total };
}

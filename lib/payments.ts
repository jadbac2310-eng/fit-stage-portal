import { createAdminClient, fetchAllRows } from "./supabase";
import { currentMemberId } from "./audit";
import type { Customer } from "./customers-types";
import { isFctCustomer } from "./customers-types";
import type { SessionPass } from "./session-passes-types";
import type { CustomerPlanRecord } from "./customer-plans-types";
import type { Lesson } from "./lessons-types";
import { courseToPaymentType, isBillableLessonStatus, resolveSingleLessonAmount } from "./lessons-types";
import type { TrialLesson } from "./trial-lessons-types";
import { trialCourseLabel } from "./trial-lessons-types";
import { resolveTrialFee } from "./commissions";
import { paymentKey, type Payment, type PaymentSourceType, type Receivable } from "./payments-types";
export type { Payment, PaymentSourceType, Receivable } from "./payments-types";

type DbRow = {
  id:          string;
  source_type: PaymentSourceType;
  source_id:   string;
  customer_id: string | null;
  amount:      number;
  paid_at:     string | null;
  method:      string | null;
  note:        string | null;
  created_by:  string | null;
  created_at:  string;
  updated_at:  string;
};

function fromDb(row: DbRow): Payment {
  return {
    id:          row.id,
    sourceType:  row.source_type,
    sourceId:    row.source_id,
    customerId:  row.customer_id ?? undefined,
    amount:      row.amount,
    paidAt:      row.paid_at ?? undefined,
    method:      row.method ?? undefined,
    note:        row.note ?? undefined,
    createdById: row.created_by ?? undefined,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  };
}

export async function getPayments(): Promise<Payment[]> {
  const client = createAdminClient();
  // 1000行ずつ全件読む。ページの境目でぶれないように id 順で読む
  const { data, error } = await fetchAllRows((from, to) =>
    client.from("payments").select("*").order("id", { ascending: true }).range(from, to));
  if (error) {
    if (error.code === "42P01" || /does not exist|could not find the table/i.test(error.message)) return [];
    throw error;
  }
  return (data as DbRow[]).map(fromDb);
}

/** 売上1項目の入金を記録/更新する（source_type + source_id で upsert）。 */
export async function recordPayment(input: {
  sourceType: PaymentSourceType;
  sourceId:   string;
  customerId?: string;
  amount:     number;
  paidAt?:    string | null;
  method?:    string | null;
  note?:      string | null;
}): Promise<void> {
  const { error } = await createAdminClient()
    .from("payments")
    .upsert({
      source_type: input.sourceType,
      source_id:   input.sourceId,
      customer_id: input.customerId ?? null,
      amount:      input.amount,
      paid_at:     input.paidAt ?? null,
      method:      input.method ?? null,
      note:        input.note ?? null,
      created_by:  (await currentMemberId()) ?? null,
      updated_at:  new Date().toISOString(),
    }, { onConflict: "source_type,source_id" });
  if (error) throw error;
}

/** 入金記録を取り消す（未入金に戻す）。 */
export async function deletePayment(sourceType: PaymentSourceType, sourceId: string): Promise<void> {
  const { error } = await createAdminClient()
    .from("payments")
    .delete()
    .eq("source_type", sourceType)
    .eq("source_id", sourceId);
  if (error) throw error;
}

function inMonth(iso: string | undefined, month: string): boolean {
  return !!iso && iso.slice(0, 7) === month;
}

/**
 * 対象月に計上される売上項目（回数券・月額プラン・都度払い・体験レッスン）を列挙し、入金記録を紐づける。
 * 計上月は invoices と同じ基準（回数券/プランは購入月、都度と体験は実施月）。
 *
 * 請求書に出る項目と、ここに出る項目は必ず同じにすること。
 * 片方にしか無いと「請求書には載っているのに入金済みにできない」項目ができてしまう。
 */
export function buildReceivables(
  month: string,
  data: {
    customers: Customer[];
    passes: SessionPass[];
    plans: CustomerPlanRecord[];
    lessons: Lesson[];
    trialLessons?: TrialLesson[];
    payments: Payment[];
    singleSessionFee?: number;
    sessionPassPriceMap?: Record<number, Record<number, number>>;
    /** コース名→1回単価。体験レッスンの料金区分を解決するのに使う */
    lessonFees?: Record<string, number>;
  },
): Receivable[] {
  const nameOf = new Map(data.customers.map((c) => [c.id, c.fullName]));
  const singleSessionFee = data.singleSessionFee ?? 0;
  const payMap = new Map(data.payments.map((p) => [paymentKey(p.sourceType, p.sourceId), p]));
  const items: Receivable[] = [];

  // 回数券（購入月で計上）
  for (const pass of data.passes) {
    if (!inMonth(pass.purchasedAt, month)) continue;
    const amount = pass.price ?? data.sessionPassPriceMap?.[pass.personCount]?.[pass.totalCount] ?? 0;
    if (amount <= 0) continue;
    const persons = pass.personCount && pass.personCount > 1 ? `（${pass.personCount}名）` : "";
    items.push({
      sourceType: "session_pass", sourceId: pass.id, customerId: pass.customerId,
      customerName: nameOf.get(pass.customerId) ?? "",
      label: `回数券 ${pass.totalCount}回${persons}`, date: pass.purchasedAt.slice(0, 10), amount,
      payment: payMap.get(paymentKey("session_pass", pass.id)),
    });
  }

  // 月額プラン（購入月で計上）。0円は「0円と決めた」扱いだが、入金管理には出さない
  for (const p of data.plans) {
    const date = p.purchasedAt ?? p.startedAt;
    if (!inMonth(date, month) || p.price == null || p.price <= 0) continue;
    items.push({
      sourceType: "customer_plan", sourceId: p.id, customerId: p.customerId,
      customerName: nameOf.get(p.customerId) ?? "",
      label: `${p.plan}プラン`, date: date.slice(0, 10), amount: p.price,
      payment: payMap.get(paymentKey("customer_plan", p.id)),
    });
  }

  // 単発払い（都度・オンラインパーソナル等。その月に完了したもの）
  for (const l of data.lessons) {
    if (courseToPaymentType(l.course) !== "single" || !isBillableLessonStatus(l.status)) continue;
    if (!inMonth(l.scheduledAt, month)) continue;
    const cust = data.customers.find((c) => c.id === l.customerId);
    // FCT経由のお客さまはお客さまから直接もらわない（FCTからまとめて入る）ので、
    // 1回ごとの入金管理には出さない。月の合計は請求書画面の「FCT分」で見る。
    if (isFctCustomer(cust)) continue;
    const amount = resolveSingleLessonAmount(l.amount, cust?.singleSessionPrice) ?? singleSessionFee;
    if (amount <= 0) continue; // 0円は請求も入金も発生しないので入金管理には出さない
    items.push({
      sourceType: "single_lesson", sourceId: l.id, customerId: l.customerId,
      customerName: l.customerName,
      label: l.course && l.course !== "都度" ? l.course : "都度レッスン", date: l.scheduledAt.slice(0, 10), amount,
      payment: payMap.get(paymentKey("single_lesson", l.id)),
    });
  }

  // 体験レッスン（その月に実施したもの）。請求書と同じ基準で計上する
  for (const t of data.trialLessons ?? []) {
    if (t.status !== "completed") continue;
    if (!inMonth(t.scheduledAt, month)) continue;
    const cust = data.customers.find((c) => c.id === t.customerId);
    // FCT経由のお客さまはお客さまから直接もらわないので、入金管理には出さない
    if (isFctCustomer(cust)) continue;
    const amount = resolveTrialFee(t, { lessonFees: data.lessonFees ?? {} });
    if (amount <= 0) continue;   // 無料体験は請求も入金も発生しない
    items.push({
      sourceType: "trial_lesson", sourceId: t.id, customerId: t.customerId,
      customerName: t.customerName || nameOf.get(t.customerId) || "",
      label: trialCourseLabel(t.course), date: t.scheduledAt.slice(0, 10), amount,
      payment: payMap.get(paymentKey("trial_lesson", t.id)),
    });
  }

  // 未入金を上に、次に日付順
  items.sort((a, b) => {
    const ap = a.payment ? 1 : 0, bp = b.payment ? 1 : 0;
    if (ap !== bp) return ap - bp;
    return a.date.localeCompare(b.date);
  });
  return items;
}

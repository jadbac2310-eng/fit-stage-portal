import type { Customer, CustomerType } from "./customers-types";
import type { CustomerPlanRecord } from "./customer-plans-types";
import type { SessionPass } from "./session-passes-types";
import type { Lesson } from "./lessons-types";
import { courseToPaymentType } from "./lessons-types";

// ─── 発行元・振込先 ───────────────────────────────────────
export const ISSUER = {
  name: "FIT STAGE",
  contact: "坂根尚樹",                       // 窓口担当者
  registrationNumber: "T2810714106494",      // 適格請求書発行事業者 登録番号（インボイス）
  address: "大阪府吹田市豊津町5-28\nドムス江坂II - A",
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
  accountHolder: "フィットステージ　サカネナオキ",
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

function inMonth(iso: string | undefined, month: string): boolean {
  return !!iso && iso.slice(0, 7) === month;
}

// ─── 表示・採番ヘルパー（請求書プレビューとPDFで共通利用） ───
export function monthLabel(month: string): string {
  const [y, m] = month.split("-");
  return `${y}年${parseInt(m, 10)}月`;
}
// 支払期限 = 対象月の翌月10日（例: 6月分 → 7月10日）
export function dueDateLabel(month: string): string {
  const [y, m] = month.split("-").map((x) => parseInt(x, 10));
  const due = new Date(y, m, 10); // m は1始まり → JS(0始まり)では m が翌月
  return `${due.getFullYear()}年${due.getMonth() + 1}月${due.getDate()}日`;
}
export function invoiceNumber(month: string, customerId: string): string {
  return `INV-${month.replace("-", "")}-${customerId.slice(0, 6).toUpperCase()}`;
}

/**
 * 顧客1名・対象月の請求を組み立てる。
 * - 月額プラン: 購入日(purchasedAt)がその月のもの → 月額を計上
 * - 回数券: 購入日(purchasedAt)がその月のもの → 総額を計上
 * - 都度: その月に「完了」した都度レッスン → 1回ごとに計上
 */
export function buildInvoice(
  customer: Customer,
  month: string,
  data: { plans: CustomerPlanRecord[]; passes: SessionPass[]; lessons: Lesson[] },
  singleSessionFee = 0,
): CustomerInvoice {
  const lines: InvoiceLine[] = [];

  // 月額プラン（購入月で計上）
  for (const p of data.plans) {
    if (p.customerId !== customer.id || !p.price) continue;
    const date = p.purchasedAt ?? p.startedAt;
    if (!inMonth(date, month)) continue;
    lines.push({ date, label: `${PROGRAM_LABEL}（${p.plan}）`, amount: p.price });
  }

  // 回数券（購入月で計上）
  for (const pass of data.passes) {
    if (pass.customerId !== customer.id || !pass.price) continue;
    if (!inMonth(pass.purchasedAt, month)) continue;
    const persons = pass.personCount && pass.personCount > 1 ? `（${pass.personCount}名）` : "";
    lines.push({ date: pass.purchasedAt, label: `${PROGRAM_LABEL}（回数券 ${pass.totalCount}回${persons}）`, amount: pass.price });
  }

  // 単発レッスン（都度・オンラインパーソナル等。その月に完了したもの）
  for (const l of data.lessons) {
    if (l.customerId !== customer.id) continue;
    if (courseToPaymentType(l.course) !== "single" || l.status !== "completed") continue;
    if (!inMonth(l.scheduledAt, month)) continue;
    const amount = (typeof l.amount === "number" && l.amount > 0)
      ? l.amount
      : (customer.singleSessionPrice && customer.singleSessionPrice > 0)
        ? customer.singleSessionPrice
        : singleSessionFee;
    lines.push({ date: l.scheduledAt.slice(0, 10), label: PROGRAM_LABEL, amount });
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
 * 別顧客の明細には「氏名: 品目」と前置して区別する。
 */
export function buildGroupInvoice(
  biller: Customer,
  members: Customer[],
  month: string,
  data: { plans: CustomerPlanRecord[]; passes: SessionPass[]; lessons: Lesson[] },
  singleSessionFee = 0,
): CustomerInvoice {
  const lines: InvoiceLine[] = [];
  for (const c of members) {
    const inv = buildInvoice(c, month, data, singleSessionFee);
    for (const l of inv.lines) {
      lines.push({ ...l, label: c.id === biller.id ? l.label : `${c.fullName}：${l.label}` });
    }
  }
  lines.sort((a, b) => a.date.localeCompare(b.date));
  const total = lines.reduce((s, l) => s + l.amount, 0);
  return { customerId: biller.id, customerName: billingName(biller), month, lines, total };
}

import type { Customer } from "./customers-types";
import type { CustomerPlanRecord } from "./customer-plans-types";
import type { SessionPass } from "./session-passes-types";
import type { Lesson } from "./lessons-types";

// ─── 発行元・振込先（仮。確定したら差し替え） ───────────────
export const ISSUER = {
  name: "FIT STAGE",
  address: "〒000-0000 ○○県○○市○○ 0-0-0",
  tel: "TEL: 000-0000-0000",
  email: "info@example.com",
};

export const BANK_INFO = {
  bankName: "○○銀行 ○○支店",
  accountType: "普通",
  accountNumber: "0000000",
  accountHolder: "カ）フィットステージ",
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
    lines.push({ date, label: `${p.plan}プラン`, amount: p.price });
  }

  // 回数券（購入月で計上）
  for (const pass of data.passes) {
    if (pass.customerId !== customer.id || !pass.price) continue;
    if (!inMonth(pass.purchasedAt, month)) continue;
    const persons = pass.personCount && pass.personCount > 1 ? `（${pass.personCount}名）` : "";
    lines.push({ date: pass.purchasedAt, label: `回数券 ${pass.totalCount}回${persons}`, amount: pass.price });
  }

  // 都度レッスン（その月に完了したもの）
  for (const l of data.lessons) {
    if (l.customerId !== customer.id) continue;
    if (l.course !== "都度" || l.status !== "completed") continue;
    if (!inMonth(l.scheduledAt, month)) continue;
    const amount = (typeof l.amount === "number" && l.amount > 0)
      ? l.amount
      : (customer.singleSessionPrice && customer.singleSessionPrice > 0)
        ? customer.singleSessionPrice
        : singleSessionFee;
    lines.push({ date: l.scheduledAt.slice(0, 10), label: "都度レッスン", amount });
  }

  lines.sort((a, b) => a.date.localeCompare(b.date));
  const total = lines.reduce((s, l) => s + l.amount, 0);
  return { customerId: customer.id, customerName: customer.fullName, month, lines, total };
}

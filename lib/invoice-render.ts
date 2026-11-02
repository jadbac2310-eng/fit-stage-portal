import { renderToBuffer } from "@react-pdf/renderer";
import { getCustomers } from "./customers";
import { getAllCustomerPlans } from "./customer-plans";
import { getAllSessionPasses } from "./session-passes";
import { getLessons } from "./lessons";
import { getTrialLessons } from "./trial-lessons";
import { getCustomerMonthlyItems } from "./customer-monthly-items";
import { monthReadStart } from "./recent-months";
import { getAllPlans } from "./plans-master";
import {
  billingGroups, buildGroupInvoice, invoiceFeesFromPlans, ISSUER, BANK_INFO,
  monthLabel, billingPeriodLabel, dueDateLabel, invoiceNumber, addresseeSuffix, taxBreakdown, invoiceRows,
  type CustomerInvoice,
} from "./invoices";
import type { Customer } from "./customers-types";
import { tieredLessonPricesAll } from "./session-tiers";
import { getInvoiceDueDate } from "./invoice-due-dates";
import { InvoiceDocument } from "./invoice-pdf";

/**
 * 請求書を「読む・組み立てる・PDFにする」をここにまとめる。
 * PDFのダウンロード（route）と、メール送信（action）で同じものを使う。
 */
export interface LoadedInvoice {
  biller: Customer;
  invoice: CustomerInvoice;
  /** その月だけの支払期限の上書き（YYYY-MM-DD）。無ければ null */
  dueOverride: string | null;
}

export async function loadGroupInvoice(customerId: string, month: string): Promise<LoadedInvoice | null> {
  // その月（と締日ずれのための前月）だけ読む
  const since = monthReadStart(month);
  const [customers, plans, passes, lessons, trialLessons, plansMaster, monthlyItems] = await Promise.all([
    getCustomers(), getAllCustomerPlans(), getAllSessionPasses(), getLessons(since), getTrialLessons(since), getAllPlans(), getCustomerMonthlyItems(),
  ]);
  // まとめ先(biller)のグループを解決（指定IDがまとめられる側でも、その請求先グループ）
  const groups = billingGroups(customers);
  const group = groups.find((g) => g.biller.id === customerId)
    ?? groups.find((g) => g.members.some((m) => m.id === customerId));
  if (!group) return null;
  const biller = group.biller;
  // 段階単価（まとめた人数の合計で単価が変わる契約）をレッスンごとに当てはめる
  const tieredPrices = tieredLessonPricesAll({ customers, lessons });
  const invoice = buildGroupInvoice(
    biller, group.members, month,
    { plans, passes, lessons, trialLessons, monthlyItems, tieredPrices }, invoiceFeesFromPlans(plansMaster),
  );
  const dueOverride = await getInvoiceDueDate(biller.id, month);
  return { biller, invoice, dueOverride };
}

export function invoiceFilename(invoice: CustomerInvoice, month: string): string {
  return `請求書_${invoice.customerName}_${month}.pdf`;
}

/** 請求書PDFを作る。中身は画面のプレビューと同じ（数量でまとめ、税抜表示の設定も反映） */
export async function renderInvoicePdf(loaded: LoadedInvoice, month: string): Promise<Buffer> {
  const { biller, invoice, dueOverride } = loaded;
  return renderToBuffer(
    InvoiceDocument({
      invoice,
      rows: invoiceRows(invoice, biller.invoiceTaxExcluded),
      taxExcluded: biller.invoiceTaxExcluded,
      address: biller.address,
      issuer: ISSUER,
      bank: BANK_INFO,
      invoiceNo: invoiceNumber(month, biller.id),
      monthLabel: monthLabel(month),
      periodLabel: billingPeriodLabel(month, biller.billingCutoffDay),
      dueDateLabel: dueDateLabel(month, dueOverride, biller),
      addresseeSuffix: addresseeSuffix(biller.customerType),
      tax: taxBreakdown(invoice.total),
    }),
  );
}

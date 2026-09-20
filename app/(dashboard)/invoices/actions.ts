"use server";

import { revalidatePath } from "next/cache";
import { getCustomers, updateCustomer } from "@/lib/customers";
import { requireAdmin } from "@/lib/members";
import { logActivity } from "@/lib/activity-logs";
import { getAllCustomerPlans } from "@/lib/customer-plans";
import { getAllSessionPasses } from "@/lib/session-passes";
import { getLessons } from "@/lib/lessons";
import { getTrialLessons } from "@/lib/trial-lessons";
import { getAllPlans } from "@/lib/plans-master";
import { billingGroups, buildGroupInvoice, invoiceFeesFromPlans, billingName, monthLabel, dueDateLabel, formatDueDate, BANK_INFO } from "@/lib/invoices";
import { getInvoiceDueDate, setInvoiceDueDate } from "@/lib/invoice-due-dates";

// 請求書の宛名（billing_name）を更新する。空なら氏名に戻す。
export async function updateBillingNameAction(customerId: string, name: string) {
  await requireAdmin();
  await updateCustomer(customerId, { billingName: name.trim() || null });
  await logActivity({ action: "update", entityType: "invoice", entityId: customerId, summary: `請求書の宛名を変更: ${name.trim() || "（氏名に戻す）"}` });
  revalidatePath("/invoices");
  revalidatePath("/master/customers");
}

/**
 * 請求書（まとめ先=biller、対象月）の支払期限を上書きする。
 * dueDate が空なら設定を消して既定（対象月の翌月末日）に戻す。
 */
export async function updateInvoiceDueDateAction(
  billerId: string,
  month: string,
  dueDate: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  if (!billerId || !/^\d{4}-\d{2}$/.test(month)) return { ok: false, error: "対象が不正です" };
  const value = dueDate?.trim() || null;
  if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return { ok: false, error: "日付の形式が不正です" };

  await setInvoiceDueDate(billerId, month, value);
  await logActivity({
    action: "update", entityType: "invoice", entityId: billerId,
    summary: `支払期限を変更: ${month} → ${value ? formatDueDate(value) : `既定（${dueDateLabel(month)}）`}`,
  });
  revalidatePath("/invoices");
  revalidatePath("/invoices/print");
  return { ok: true };
}

function yen(n: number): string {
  return `¥${Math.round(n).toLocaleString("ja-JP")}`;
}

/**
 * 請求書1件（まとめ先=biller、対象月）について、顧客へLINEで貼って送るための
 * 「内訳＋金額＋お振込先」メッセージ文面を組み立てて返す。
 * 実際の送信は行わない（社長が公式LINEに貼って送る）。
 */
export async function createInvoiceShareAction(
  billerId: string,
  month: string,
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  await requireAdmin();
  if (!billerId || !month) return { ok: false, error: "対象が不正です" };

  const [customers, plans, passes, lessons, trialLessons, plansMaster] = await Promise.all([
    getCustomers(), getAllCustomerPlans(), getAllSessionPasses(), getLessons(), getTrialLessons(), getAllPlans(),
  ]);

  // まとめ先(biller)のグループを解決
  const groups = billingGroups(customers);
  const group = groups.find((g) => g.biller.id === billerId)
    ?? groups.find((g) => g.members.some((m) => m.id === billerId));
  if (!group) return { ok: false, error: "顧客が見つかりません" };
  const biller = group.biller;

  // 請求書の内訳（全明細）
  const invoice = buildGroupInvoice(
    biller, group.members, month,
    { plans, passes, lessons, trialLessons }, invoiceFeesFromPlans(plansMaster),
  );
  if (invoice.lines.length === 0) return { ok: false, error: "対象月の請求がありません" };

  const dueOverride = await getInvoiceDueDate(biller.id, month);

  // メッセージ文面
  const lines: string[] = [];
  lines.push(`${billingName(biller)} 様`);
  lines.push("");
  lines.push("いつもありがとうございます。");
  lines.push(`${monthLabel(month)}分のご請求をお送りします。`);
  lines.push("");
  lines.push("【ご請求の内訳】");
  for (const l of invoice.lines) lines.push(`${l.date}　${l.label}　${yen(l.amount)}`);
  lines.push(`合計　${yen(invoice.total)}`);
  lines.push("");
  lines.push("【お振込先】");
  lines.push(`${BANK_INFO.bankName}　${BANK_INFO.accountType}　${BANK_INFO.accountNumber}`);
  lines.push(`口座名義：${BANK_INFO.accountHolder}`);
  lines.push(`お支払期限：${dueDateLabel(month, dueOverride)}（振込手数料はご負担ください）`);
  lines.push("");
  lines.push("ご不明点はこのトークにご返信ください。");
  lines.push("FIT STAGE");
  const message = lines.join("\n");

  await logActivity({
    action: "create", entityType: "invoice", entityId: biller.id,
    summary: `請求LINE文面を作成: ${billingName(biller)} ${month}`,
  });

  return { ok: true, message };
}

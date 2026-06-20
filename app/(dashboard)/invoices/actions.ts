"use server";

import { revalidatePath } from "next/cache";
import { getCustomers, updateCustomer } from "@/lib/customers";
import { requireAdmin } from "@/lib/members";
import { logActivity } from "@/lib/activity-logs";
import { getAllCustomerPlans } from "@/lib/customer-plans";
import { getAllSessionPasses } from "@/lib/session-passes";
import { getLessons } from "@/lib/lessons";
import { getAllPlans, getAllSessionPassPrices, planUnitPrice, buildSessionPassPriceMap } from "@/lib/plans-master";
import { getPayments, buildReceivables } from "@/lib/payments";
import { billingGroups, buildGroupInvoice, billingName, monthLabel } from "@/lib/invoices";
import { isStripeConfigured } from "@/lib/stripe";
import { createStripeCheckout, type CheckoutItem } from "@/lib/stripe-checkouts";

// 請求書の宛名（billing_name）を更新する。空なら氏名に戻す。
export async function updateBillingNameAction(customerId: string, name: string) {
  await requireAdmin();
  await updateCustomer(customerId, { billingName: name.trim() || null });
  await logActivity({ action: "update", entityType: "invoice", entityId: customerId, summary: `請求書の宛名を変更: ${name.trim() || "（氏名に戻す）"}` });
  revalidatePath("/invoices");
  revalidatePath("/master/customers");
}

function yen(n: number): string {
  return `¥${Math.round(n).toLocaleString("ja-JP")}`;
}

/**
 * 請求書1件（まとめ先=biller、対象月）について、
 * - 未入金分の Stripe 決済リンクを発行し、
 * - 顧客へLINEで貼って送るための「内訳＋金額＋決済リンク」メッセージ文面を組み立てて返す。
 * 実際の送信は行わない（社長が公式LINEに貼って送る）。
 */
export async function createInvoiceShareAction(
  billerId: string,
  month: string,
): Promise<{ ok: true; message: string; url?: string } | { ok: false; error: string }> {
  await requireAdmin();
  if (!billerId || !month) return { ok: false, error: "対象が不正です" };

  const [customers, plans, passes, lessons, plansMaster, sppPrices, payments] = await Promise.all([
    getCustomers(), getAllCustomerPlans(), getAllSessionPasses(), getLessons(),
    getAllPlans(), getAllSessionPassPrices(), getPayments(),
  ]);

  // まとめ先(biller)のグループを解決
  const groups = billingGroups(customers);
  const group = groups.find((g) => g.biller.id === billerId)
    ?? groups.find((g) => g.members.some((m) => m.id === billerId));
  if (!group) return { ok: false, error: "顧客が見つかりません" };
  const biller = group.biller;

  const singleMaster = plansMaster.find((p) => p.paymentType === "single");
  const singleFee = singleMaster ? planUnitPrice(singleMaster) : 0;

  // 請求書の内訳（全明細）
  const invoice = buildGroupInvoice(biller, group.members, month, { plans, passes, lessons }, singleFee);
  if (invoice.lines.length === 0) return { ok: false, error: "対象月の請求がありません" };

  // 未入金分（決済リンクの対象）
  const memberIds = new Set(group.members.map((m) => m.id));
  const receivables = buildReceivables(month, {
    customers, passes, plans, lessons, payments,
    singleSessionFee: singleFee,
    sessionPassPriceMap: buildSessionPassPriceMap(sppPrices),
  });
  const unpaid = receivables.filter((r) => memberIds.has(r.customerId) && !r.payment && r.amount > 0);
  const unpaidTotal = unpaid.reduce((s, r) => s + r.amount, 0);

  // 未入金があり Stripe 設定済みなら決済リンクを発行
  let url: string | undefined;
  if (unpaidTotal > 0 && isStripeConfigured()) {
    const items: CheckoutItem[] = unpaid.map((r) => ({
      sourceType: r.sourceType, sourceId: r.sourceId, amount: r.amount, label: r.label,
    }));
    const result = await createStripeCheckout({
      customerId: biller.id,
      customerName: billingName(biller),
      month,
      items,
    });
    url = result?.url;
  }

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
  if (url) {
    lines.push("");
    if (unpaidTotal !== invoice.total) lines.push(`お支払い金額：${yen(unpaidTotal)}`);
    lines.push("▼カードでのお支払いはこちらから");
    lines.push(url);
  }
  lines.push("");
  lines.push("ご不明点はこのトークにご返信ください。");
  lines.push("FIT STAGE");
  const message = lines.join("\n");

  await logActivity({
    action: "create", entityType: "invoice", entityId: biller.id,
    summary: `請求LINE文面を作成: ${billingName(biller)} ${month}${url ? `（決済リンク¥${unpaidTotal.toLocaleString("ja-JP")}）` : ""}`,
  });
  revalidatePath("/admin/payments");

  return { ok: true, message, url };
}

"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/members";
import { logActivity } from "@/lib/activity-logs";
import { recordPayment, deletePayment, buildReceivables } from "@/lib/payments";
import type { PaymentSourceType } from "@/lib/payments-types";
import { SOURCE_TYPE_LABEL } from "@/lib/payments-types";
import { getCustomers } from "@/lib/customers";
import { getAllSessionPasses } from "@/lib/session-passes";
import { getAllCustomerPlans } from "@/lib/customer-plans";
import { getLessons } from "@/lib/lessons";
import { getAllPlans, getAllSessionPassPrices, planUnitPrice, buildSessionPassPriceMap } from "@/lib/plans-master";
import { getPayments } from "@/lib/payments";
import { isStripeConfigured } from "@/lib/stripe";
import { createStripeCheckout, type CheckoutItem } from "@/lib/stripe-checkouts";

export async function recordPaymentAction(formData: FormData) {
  await requireAdmin();
  const sourceType = (formData.get("sourceType") as string)?.trim() as PaymentSourceType;
  const sourceId   = (formData.get("sourceId")   as string)?.trim();
  const customerId = (formData.get("customerId") as string)?.trim() || undefined;
  const amountRaw  = (formData.get("amount")     as string)?.trim();
  const amount     = amountRaw ? parseInt(amountRaw, 10) : 0;
  const paidAt     = (formData.get("paidAt")     as string)?.trim() || null;
  const method     = (formData.get("method")     as string)?.trim() || null;
  const note       = (formData.get("note")       as string)?.trim() || null;

  if (!sourceType || !sourceId) return;

  await recordPayment({ sourceType, sourceId, customerId, amount: Number.isFinite(amount) ? amount : 0, paidAt, method, note });
  await logActivity({
    action: "create", entityType: "payment", entityId: sourceId,
    summary: `入金記録: ${SOURCE_TYPE_LABEL[sourceType]} ¥${(Number.isFinite(amount) ? amount : 0).toLocaleString("ja-JP")}`,
  });
  revalidatePath("/admin/payments");
}

/**
 * 顧客×対象月の未入金分をまとめた Stripe 決済リンクを発行し、URL を返す。
 * 金額はサーバ側で売上を再計算して算出する（クライアントの値は信用しない）。
 */
export async function createCheckoutLinkAction(
  customerId: string,
  month: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  await requireAdmin();
  if (!isStripeConfigured()) return { ok: false, error: "Stripeが未設定です（STRIPE_SECRET_KEY）" };
  if (!customerId || !month) return { ok: false, error: "対象が不正です" };

  const [customers, passes, plans, lessons, plansMaster, sppPrices, payments] = await Promise.all([
    getCustomers(), getAllSessionPasses(), getAllCustomerPlans(), getLessons(),
    getAllPlans(), getAllSessionPassPrices(), getPayments(),
  ]);
  const singleMaster = plansMaster.find((p) => p.paymentType === "single");
  const singleFee = singleMaster ? planUnitPrice(singleMaster) : 0;

  const receivables = buildReceivables(month, {
    customers, passes, plans, lessons, payments,
    singleSessionFee: singleFee,
    sessionPassPriceMap: buildSessionPassPriceMap(sppPrices),
  });

  const target = receivables.filter((r) => r.customerId === customerId && !r.payment && r.amount > 0);
  if (target.length === 0) return { ok: false, error: "未入金の売上がありません" };

  const customer = customers.find((c) => c.id === customerId);
  const items: CheckoutItem[] = target.map((r) => ({
    sourceType: r.sourceType, sourceId: r.sourceId, amount: r.amount, label: r.label,
  }));

  const result = await createStripeCheckout({
    customerId,
    customerName: customer?.fullName ?? target[0].customerName,
    month,
    items,
  });
  if (!result) return { ok: false, error: "決済リンクの作成に失敗しました" };

  const total = items.reduce((s, i) => s + i.amount, 0);
  await logActivity({
    action: "create", entityType: "payment", entityId: customerId,
    summary: `決済リンク発行: ${customer?.fullName ?? ""} ${month} ¥${total.toLocaleString("ja-JP")}`,
  });
  revalidatePath("/admin/payments");
  return { ok: true, url: result.url };
}

export async function unrecordPaymentAction(sourceType: PaymentSourceType, sourceId: string) {
  await requireAdmin();
  await deletePayment(sourceType, sourceId);
  await logActivity({ action: "delete", entityType: "payment", entityId: sourceId, summary: `入金取消: ${SOURCE_TYPE_LABEL[sourceType]}` });
  revalidatePath("/admin/payments");
}

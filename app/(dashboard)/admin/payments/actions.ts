"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/members";
import { logActivity } from "@/lib/activity-logs";
import { recordPayment, recordPayments, deletePayment } from "@/lib/payments";
import type { PaymentSourceType } from "@/lib/payments-types";
import { SOURCE_TYPE_LABEL } from "@/lib/payments-types";

/**
 * 画面に返す結果。失敗したら理由を返す。
 *
 * 投げる（throw）と、本番の Next.js はメッセージを伏せてしまい、画面側も黙って閉じていた。
 * 「押したのに入金済みにならない」のに理由が何も出ない、という状態になるので、文字で返す。
 */
export type PaymentActionResult = { ok: true } | { ok: false; error: string };

function failure(e: unknown, what: string): PaymentActionResult {
  const err = e as { message?: string; code?: string; details?: string } | null;
  console.error(`[payments] ${what} failed`, e);
  const msg = [err?.message, err?.details, err?.code ? `(${err.code})` : ""].filter(Boolean).join(" ");
  return { ok: false, error: msg || "保存できませんでした" };
}

function toAmount(v: unknown): number {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

export async function recordPaymentAction(formData: FormData): Promise<PaymentActionResult> {
  await requireAdmin();
  const sourceType = (formData.get("sourceType") as string)?.trim() as PaymentSourceType;
  const sourceId   = (formData.get("sourceId")   as string)?.trim();
  const customerId = (formData.get("customerId") as string)?.trim() || undefined;
  const amount     = toAmount((formData.get("amount") as string)?.trim());
  const paidAt     = (formData.get("paidAt")     as string)?.trim() || null;
  const method     = (formData.get("method")     as string)?.trim() || null;
  const note       = (formData.get("note")       as string)?.trim() || null;

  if (!sourceType || !sourceId) return { ok: false, error: "対象の売上が分かりませんでした。画面を読み込み直してください" };

  try {
    await recordPayment({ sourceType, sourceId, customerId, amount, paidAt, method, note });
  } catch (e) {
    return failure(e, "record");
  }
  await logActivity({
    action: "create", entityType: "payment", entityId: sourceId,
    summary: `入金記録: ${SOURCE_TYPE_LABEL[sourceType]} ¥${amount.toLocaleString("ja-JP")}`,
  }).catch(() => {});
  revalidatePath("/admin/payments");
  return { ok: true };
}

/** 同じ会社・顧客の複数の未入金項目を、同じ入金日・方法・メモでまとめて入金済みにする。 */
export async function recordPaymentsBulkAction(formData: FormData): Promise<PaymentActionResult> {
  await requireAdmin();
  const paidAt = (formData.get("paidAt") as string)?.trim() || null;
  const method = (formData.get("method") as string)?.trim() || null;
  const note   = (formData.get("note")   as string)?.trim() || null;

  let items: { sourceType: PaymentSourceType; sourceId: string; customerId?: string; amount: number }[] = [];
  try {
    const parsed = JSON.parse((formData.get("items") as string) || "[]");
    if (Array.isArray(parsed)) {
      items = parsed.filter((i) => i && typeof i.sourceType === "string" && typeof i.sourceId === "string");
    }
  } catch { items = []; }
  if (items.length === 0) return { ok: false, error: "入金済みにする項目がありませんでした。画面を読み込み直してください" };

  try {
    await recordPayments(items.map((it) => ({
      sourceType: it.sourceType, sourceId: it.sourceId, customerId: it.customerId || undefined,
      amount: toAmount(it.amount), paidAt, method, note,
    })));
  } catch (e) {
    return failure(e, "bulk record");
  }
  const total = items.reduce((s, i) => s + toAmount(i.amount), 0);
  await logActivity({
    action: "create", entityType: "payment",
    summary: `入金記録(まとめて): ${items.length}件 ¥${total.toLocaleString("ja-JP")}`,
  }).catch(() => {});
  revalidatePath("/admin/payments");
  return { ok: true };
}

export async function unrecordPaymentAction(sourceType: PaymentSourceType, sourceId: string): Promise<PaymentActionResult> {
  await requireAdmin();
  try {
    await deletePayment(sourceType, sourceId);
  } catch (e) {
    return failure(e, "delete");
  }
  await logActivity({ action: "delete", entityType: "payment", entityId: sourceId, summary: `入金取消: ${SOURCE_TYPE_LABEL[sourceType]}` }).catch(() => {});
  revalidatePath("/admin/payments");
  return { ok: true };
}

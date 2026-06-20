import type Stripe from "stripe";
import { getStripe } from "./stripe";
import { createAdminClient } from "./supabase";
import { currentMemberId } from "./audit";
import { portalUrl, jstDateStr } from "./line-notify";
import type { PaymentSourceType } from "./payments-types";
import { SOURCE_TYPE_LABEL } from "./payments-types";

// 決済リンク1件が支払い対象とする売上項目
export interface CheckoutItem {
  sourceType: PaymentSourceType;
  sourceId:   string;
  amount:     number;
  label:      string;
}

export interface StripeCheckout {
  id:              string;
  sessionId:       string;
  paymentIntentId?: string;
  customerId?:     string;
  customerName?:   string;
  month?:          string;
  amount:          number;
  covered:         CheckoutItem[];
  status:          "pending" | "paid" | "expired" | "canceled";
  url?:            string;
  createdAt:       string;
  paidAt?:         string;
}

type DbRow = {
  id: string;
  session_id: string;
  payment_intent_id: string | null;
  customer_id: string | null;
  customer_name: string | null;
  month: string | null;
  amount: number;
  covered: CheckoutItem[] | null;
  status: StripeCheckout["status"];
  url: string | null;
  created_at: string;
  paid_at: string | null;
};

function fromDb(r: DbRow): StripeCheckout {
  return {
    id: r.id,
    sessionId: r.session_id,
    paymentIntentId: r.payment_intent_id ?? undefined,
    customerId: r.customer_id ?? undefined,
    customerName: r.customer_name ?? undefined,
    month: r.month ?? undefined,
    amount: r.amount,
    covered: r.covered ?? [],
    status: r.status,
    url: r.url ?? undefined,
    createdAt: r.created_at,
    paidAt: r.paid_at ?? undefined,
  };
}

/** 対象月の発行済み決済リンクを顧客IDごとに取得（最新優先）。pending を優先して返す。 */
export async function getCheckoutsByMonth(month: string): Promise<Record<string, StripeCheckout>> {
  const { data, error } = await createAdminClient()
    .from("stripe_checkouts")
    .select("*")
    .eq("month", month)
    .order("created_at", { ascending: false });
  if (error) {
    if (error.code === "42P01" || /does not exist|could not find the table/i.test(error.message)) return {};
    throw error;
  }
  const out: Record<string, StripeCheckout> = {};
  for (const row of (data as DbRow[]).map(fromDb)) {
    if (!row.customerId) continue;
    const cur = out[row.customerId];
    // 既に paid があれば優先、なければ最新（先頭）を採用
    if (!cur || (cur.status !== "paid" && row.status === "paid")) out[row.customerId] = row;
  }
  return out;
}

/**
 * 顧客×対象月の未入金分をまとめた Stripe Checkout を作成し、リンクURLを返す。
 * Stripe 未設定なら null。
 */
export async function createStripeCheckout(input: {
  customerId: string;
  customerName: string;
  month: string;
  items: CheckoutItem[];
}): Promise<{ url: string } | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const items = input.items.filter((i) => i.amount > 0);
  if (items.length === 0) return null;

  const total = items.reduce((s, i) => s + i.amount, 0);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: items.map((i) => ({
      quantity: 1,
      price_data: {
        currency: "jpy",
        unit_amount: Math.round(i.amount), // JPY はゼロ十進通貨（そのまま円）
        product_data: { name: `${SOURCE_TYPE_LABEL[i.sourceType]}：${i.label}` },
      },
    })),
    success_url: portalUrl("/admin/payments?paid=1"),
    cancel_url: portalUrl("/admin/payments"),
    metadata: { customerId: input.customerId, month: input.month },
  });

  if (!session.url) return null;

  const { error } = await createAdminClient().from("stripe_checkouts").insert({
    session_id: session.id,
    customer_id: input.customerId,
    customer_name: input.customerName,
    month: input.month,
    amount: total,
    covered: items,
    status: "pending",
    url: session.url,
    created_by: (await currentMemberId()) ?? null,
  });
  if (error) throw error;

  return { url: session.url };
}

/**
 * Checkout 完了を入金台帳へ反映する（webhook から呼ぶ）。
 * - 対象 covered の各売上に payments 行(method=カード)を upsert
 * - stripe_checkouts を paid に更新
 * 冪等: 既に paid のセッションは何もしない。
 */
export async function applyCheckoutCompletion(session: Stripe.Checkout.Session): Promise<void> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("stripe_checkouts")
    .select("*")
    .eq("session_id", session.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    console.warn("[stripe] 該当する stripe_checkouts が見つかりません", session.id);
    return;
  }
  const checkout = fromDb(data as DbRow);
  if (checkout.status === "paid") return; // 冪等

  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
  const paidAt = jstDateStr();

  for (const item of checkout.covered) {
    const { error: pErr } = await db.from("payments").upsert(
      {
        source_type: item.sourceType,
        source_id: item.sourceId,
        customer_id: checkout.customerId ?? null,
        amount: item.amount,
        paid_at: paidAt,
        method: "カード",
        note: "Stripe決済",
        stripe_session_id: session.id,
        stripe_payment_intent_id: paymentIntentId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "source_type,source_id" },
    );
    if (pErr) throw pErr;
  }

  const { error: cErr } = await db
    .from("stripe_checkouts")
    .update({ status: "paid", payment_intent_id: paymentIntentId, paid_at: new Date().toISOString() })
    .eq("session_id", session.id);
  if (cErr) throw cErr;
}

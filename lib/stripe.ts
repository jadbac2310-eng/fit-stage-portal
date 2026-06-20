import Stripe from "stripe";

// Stripe クライアント。STRIPE_SECRET_KEY 未設定でも壊れず null を返す（呼び出し側でスキップ）。
let cached: Stripe | null | undefined;

export function getStripe(): Stripe | null {
  if (cached !== undefined) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  cached = key ? new Stripe(key) : null;
  if (!key) console.warn("[stripe] STRIPE_SECRET_KEY 未設定のため決済機能は無効");
  return cached;
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

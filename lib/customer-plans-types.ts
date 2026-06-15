export type ContractPlan = "月2回" | "月4回" | "月8回";

export const CONTRACT_PLAN_LABEL: Record<ContractPlan, string> = {
  "月2回": "月2回",
  "月4回": "月4回",
  "月8回": "月8回",
};

export interface CustomerPlanRecord {
  id: string;
  customerId: string;
  plan: ContractPlan;
  price?: number;          // 入金額（月額）。単価 = price / planSessions(plan)
  purchasedAt?: string;    // 購入日（請求の計上月に使用）。未設定時は startedAt を使う
  startedAt: string;
  endedAt?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

/** プラン名から月あたりの回数を取り出す（例: 月4回 → 4）。不正値は 0 */
export function planSessions(plan: string): number {
  const n = parseInt(plan.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function plansOverlap(
  s1: string, e1: string | null | undefined,
  s2: string, e2: string | null | undefined,
): boolean {
  const d = (s: string) => new Date(s).getTime();
  if (e1 && d(e1) < d(s2)) return false;
  if (e2 && d(e2) < d(s1)) return false;
  return true;
}

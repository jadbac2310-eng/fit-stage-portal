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
  startedAt: string;
  endedAt?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
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

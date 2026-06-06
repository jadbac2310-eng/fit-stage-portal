import type { CustomerPlan } from "./customers-types";
export type { CustomerPlan };
export { PLAN_LABEL } from "./customers-types";

export interface CustomerPlanRecord {
  id: string;
  customerId: string;
  plan: CustomerPlan;
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

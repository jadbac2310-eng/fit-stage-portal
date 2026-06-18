import { getCustomers } from "@/lib/customers";
import { getAllCustomerPlans } from "@/lib/customer-plans";
import { getAllSessionPasses } from "@/lib/session-passes";
import { getAllPlans, getAllSessionPassPrices, buildSessionPassPriceMap } from "@/lib/plans-master";
import { getCurrentIsAdmin, getMembers } from "@/lib/members";
import { PlansClient } from "./plans-client";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const [customers, plans, sessionPasses, plansMaster, sessionPassPrices, isAdmin, members] = await Promise.all([
    getCustomers(),
    getAllCustomerPlans(),
    getAllSessionPasses(),
    getAllPlans(),
    getAllSessionPassPrices(),
    getCurrentIsAdmin(),
    getMembers(),
  ]);
  const memberNames = Object.fromEntries(members.map((m) => [m.id, m.name]));
  // 月額プランの標準金額（プラン選択時のデフォルト入力に使用）
  const planDefaults = plansMaster
    .filter((p) => p.paymentType === "monthly")
    .map((p) => ({ name: p.name, amount: p.amount }));
  return (
    <PlansClient
      customers={customers}
      plans={plans}
      sessionPasses={sessionPasses}
      planDefaults={planDefaults}
      sessionPassPriceMap={buildSessionPassPriceMap(sessionPassPrices)}
      isAdmin={isAdmin}
      memberNames={memberNames}
    />
  );
}

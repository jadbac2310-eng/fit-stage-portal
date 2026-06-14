import { getAllPlans, getAllSessionPassPrices } from "@/lib/plans-master";
import { getCurrentIsAdmin } from "@/lib/members";
import { PlansMasterClient } from "./plans-master-client";

export const dynamic = "force-dynamic";

export default async function PlansMasterPage() {
  const [plans, sessionPassPrices, isAdmin] = await Promise.all([
    getAllPlans(),
    getAllSessionPassPrices(),
    getCurrentIsAdmin(),
  ]);

  return (
    <PlansMasterClient
      plans={plans}
      sessionPassPrices={sessionPassPrices}
      isAdmin={isAdmin}
    />
  );
}

import { getCustomers } from "@/lib/customers";
import { getAllCustomerPlans } from "@/lib/customer-plans";
import { getAllSessionPasses } from "@/lib/session-passes";
import { getCurrentIsAdmin } from "@/lib/members";
import { PlansClient } from "./plans-client";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const [customers, plans, sessionPasses, isAdmin] = await Promise.all([
    getCustomers(),
    getAllCustomerPlans(),
    getAllSessionPasses(),
    getCurrentIsAdmin(),
  ]);
  return (
    <PlansClient
      customers={customers}
      plans={plans}
      sessionPasses={sessionPasses}
      isAdmin={isAdmin}
    />
  );
}

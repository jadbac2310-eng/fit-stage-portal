import { getCustomers } from "@/lib/customers";
import { getAllCustomerPlans } from "@/lib/customer-plans";
import { getCurrentIsAdmin } from "@/lib/members";
import { PlansClient } from "./plans-client";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const [customers, plans, isAdmin] = await Promise.all([
    getCustomers(),
    getAllCustomerPlans(),
    getCurrentIsAdmin(),
  ]);
  return <PlansClient customers={customers} plans={plans} isAdmin={isAdmin} />;
}

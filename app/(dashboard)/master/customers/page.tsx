import { getCustomers } from "@/lib/customers";
import { getCurrentIsAdmin } from "@/lib/members";
import { getAllSessionPasses } from "@/lib/session-passes";
import { CustomersClient } from "./customers-client";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const [customers, sessionPasses, isAdmin] = await Promise.all([
    getCustomers(),
    getAllSessionPasses(),
    getCurrentIsAdmin(),
  ]);
  return <CustomersClient customers={customers} sessionPasses={sessionPasses} isAdmin={isAdmin} />;
}

import { getCustomers } from "@/lib/customers";
import { getCurrentIsAdmin } from "@/lib/members";
import { CustomersClient } from "./customers-client";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const [customers, isAdmin] = await Promise.all([
    getCustomers(),
    getCurrentIsAdmin(),
  ]);
  return <CustomersClient customers={customers} isAdmin={isAdmin} />;
}

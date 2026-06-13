import { getCustomers } from "@/lib/customers";
import { getCurrentIsAdmin, getMembers } from "@/lib/members";
import { CustomersClient } from "./customers-client";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const [customers, isAdmin, members] = await Promise.all([
    getCustomers(),
    getCurrentIsAdmin(),
    getMembers(),
  ]);
  return (
    <CustomersClient
      customers={customers}
      isAdmin={isAdmin}
      members={members.map((m) => ({ id: m.id, name: m.name, role: m.role }))}
    />
  );
}

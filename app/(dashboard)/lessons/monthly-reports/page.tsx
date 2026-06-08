import { getCustomers } from "@/lib/customers";
import { getMembers, getCurrentIsAdmin } from "@/lib/members";
import { getAllMonthlyReports } from "@/lib/monthly-reports";
import { MonthlyReportsClient } from "./monthly-reports-client";

export const dynamic = "force-dynamic";

export default async function MonthlyReportsPage() {
  const [customers, reports, members, isAdmin] = await Promise.all([
    getCustomers(),
    getAllMonthlyReports(),
    getMembers(),
    getCurrentIsAdmin(),
  ]);

  return (
    <MonthlyReportsClient
      customers={customers}
      reports={reports}
      members={members}
      isAdmin={isAdmin}
    />
  );
}

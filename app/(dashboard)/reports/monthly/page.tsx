import { getCustomers } from "@/lib/customers";
import { getLessons } from "@/lib/lessons";
import { getCurrentMember } from "@/lib/members";
import { getReportDeliveries } from "@/lib/report-deliveries";
import { deliveryKey } from "@/lib/report-deliveries-types";
import { buildMonthlyReports, currentPeriod } from "@/lib/monthly-reports";
import { MonthlyReportsClient } from "./monthly-client";

export const dynamic = "force-dynamic";

export default async function MonthlyReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const member = await getCurrentMember();
  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-6 text-center">
        <p className="text-4xl">🔒</p>
        <p className="text-sm font-semibold text-gray-600">ログインが必要です</p>
      </div>
    );
  }

  const { month: monthParam } = await searchParams;
  const period = monthParam || currentPeriod();

  const [customers, lessons, deliveries] = await Promise.all([
    getCustomers(),
    getLessons(),
    getReportDeliveries(period),
  ]);

  const reports = buildMonthlyReports(period, customers, lessons);
  const sentKeys = deliveries.map((d) => deliveryKey(d.customerId, d.period));

  return <MonthlyReportsClient period={period} reports={reports} sentKeys={sentKeys} />;
}

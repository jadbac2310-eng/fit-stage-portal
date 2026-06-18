import { getCurrentIsAdmin } from "@/lib/members";
import { getCustomers } from "@/lib/customers";
import { getAllSessionPasses } from "@/lib/session-passes";
import { getAllCustomerPlans } from "@/lib/customer-plans";
import { getLessons } from "@/lib/lessons";
import { getAllPlans, getAllSessionPassPrices, planUnitPrice, buildSessionPassPriceMap } from "@/lib/plans-master";
import { getPayments, buildReceivables } from "@/lib/payments";
import { PaymentsClient } from "./payments-client";

export const dynamic = "force-dynamic";

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const isAdmin = await getCurrentIsAdmin();
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-4xl">🔒</p>
        <p className="text-sm font-semibold text-gray-600">管理者のみ閲覧できます</p>
      </div>
    );
  }

  const { month: monthParam } = await searchParams;
  const month = monthParam || currentMonth();

  const [customers, passes, plans, lessons, plansMaster, sppPrices, payments] = await Promise.all([
    getCustomers(), getAllSessionPasses(), getAllCustomerPlans(), getLessons(),
    getAllPlans(), getAllSessionPassPrices(), getPayments(),
  ]);

  const singleMaster = plansMaster.find((p) => p.paymentType === "single");
  const singleFee = singleMaster ? planUnitPrice(singleMaster) : 0;

  const receivables = buildReceivables(month, {
    customers, passes, plans, lessons, payments,
    singleSessionFee: singleFee,
    sessionPassPriceMap: buildSessionPassPriceMap(sppPrices),
  });

  return <PaymentsClient receivables={receivables} month={month} />;
}

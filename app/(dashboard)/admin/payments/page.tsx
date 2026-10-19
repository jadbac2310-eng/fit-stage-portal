import { getCurrentIsAdmin } from "@/lib/members";
import { getCustomers } from "@/lib/customers";
import { getAllSessionPasses } from "@/lib/session-passes";
import { getAllCustomerPlans } from "@/lib/customer-plans";
import { getLessons } from "@/lib/lessons";
import { getTrialLessons } from "@/lib/trial-lessons";
import { getAllPlans, getAllSessionPassPrices, planUnitPrice, buildSessionPassPriceMap, buildLessonFeeMap } from "@/lib/plans-master";
import { getPayments, buildReceivables } from "@/lib/payments";
import { billingGroups, billingName } from "@/lib/invoices";
import { tieredLessonPricesAll } from "@/lib/session-tiers";
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

  const [customers, passes, plans, lessons, trialLessons, plansMaster, sppPrices, payments] = await Promise.all([
    getCustomers(), getAllSessionPasses(), getAllCustomerPlans(), getLessons(), getTrialLessons(),
    getAllPlans(), getAllSessionPassPrices(), getPayments(),
  ]);

  const singleMaster = plansMaster.find((p) => p.paymentType === "single");
  const singleFee = singleMaster ? planUnitPrice(singleMaster) : 0;

  // 段階単価（まとめた人数の合計で単価が変わる契約）
  const tieredPrices = tieredLessonPricesAll({ customers, lessons });

  const receivables = buildReceivables(month, {
    customers, passes, plans, lessons, trialLessons, payments,
    singleSessionFee: singleFee,
    sessionPassPriceMap: buildSessionPassPriceMap(sppPrices),
    lessonFees: buildLessonFeeMap(plansMaster),
    tieredPrices,
  });

  // 同じ会社・人物への請求をまとめる先（billingToCustomerId）ごとに顧客IDをグルーピングする
  const billerMap: Record<string, { id: string; name: string }> = {};
  for (const { biller, members } of billingGroups(customers)) {
    for (const m of members) billerMap[m.id] = { id: biller.id, name: billingName(biller) };
  }

  return (
    <PaymentsClient
      receivables={receivables}
      month={month}
      billerMap={billerMap}
    />
  );
}

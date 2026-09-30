import { getCustomers } from "@/lib/customers";
import { getLessons } from "@/lib/lessons";
import { getTrialLessons } from "@/lib/trial-lessons";
import { getHourlyTasks } from "@/lib/hourly-tasks";
import { getCurrentMember, getMembers } from "@/lib/members";
import { getAllSessionPasses } from "@/lib/session-passes";
import { getAllCustomerPlans } from "@/lib/customer-plans";
import { getAllPlans, buildLessonFeeMap, getAllSessionPassPrices, buildSessionPassPriceMap } from "@/lib/plans-master";
import { getMemberCustomerRates } from "@/lib/commission-rates";
import { isBillableLessonStatus } from "@/lib/lessons-types";
import { buildHourlyEntries, type CommissionContext } from "@/lib/commissions";
import { buildTrainerStatements } from "@/lib/commission-statement";
import { StatementClient } from "./statement-client";

export const dynamic = "force-dynamic";

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function CommissionStatementPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const member = await getCurrentMember();
  if (!member?.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-6 text-center">
        <p className="text-4xl">🔒</p>
        <p className="text-sm font-semibold text-gray-600">管理者のみ閲覧できます</p>
      </div>
    );
  }

  const { month: monthParam } = await searchParams;
  const month = monthParam || currentMonth();

  const [customers, lessons, trialLessons, hourlyTasks, sessionPasses, customerPlans, members, plansMaster, sessionPassPrices, allRates] = await Promise.all([
    getCustomers(),
    getLessons(),
    getTrialLessons(),
    getHourlyTasks(),
    getAllSessionPasses(),
    getAllCustomerPlans(),
    getMembers(),
    getAllPlans(),
    getAllSessionPassPrices(),
    getMemberCustomerRates(),
  ]);

  const ctx: CommissionContext = {
    customers, sessionPasses, customerPlans,
    members: members.map((m) => ({ id: m.id, name: m.name })),
    trainerRates: allRates.map((r) => ({ memberId: r.memberId, customerId: r.customerId, rate: r.rate })),
    lessonFees: buildLessonFeeMap(plansMaster),
    sessionPassPriceMap: buildSessionPassPriceMap(sessionPassPrices),
  };

  const completedLessons = lessons.filter((l) => isBillableLessonStatus(l.status));
  const completedTrialLessons = trialLessons.filter((l) => l.status === "completed");
  const contractedTrialLessons = trialLessons.filter((l) => l.contracted === true);

  const statements = buildTrainerStatements(completedLessons, completedTrialLessons, contractedTrialLessons, hourlyTasks, month, ctx);

  // 「予定」のままの業務は明細に載らない。支払い前に気付けるよう件数と金額を渡す。
  const hourlyEntries = buildHourlyEntries(hourlyTasks, month);
  const pendingHourly = {
    count: hourlyEntries.reduce((s, e) => s + e.pending.length, 0),
    total: hourlyEntries.reduce((s, e) => s + e.pendingTotal, 0),
    names: hourlyEntries.filter((e) => e.pending.length > 0).map((e) => e.memberName),
  };

  return <StatementClient statements={statements} month={month} pendingHourly={pendingHourly} />;
}

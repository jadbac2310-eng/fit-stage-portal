import { getCustomers } from "@/lib/customers";
import { getLessons } from "@/lib/lessons";
import { getTrialLessons } from "@/lib/trial-lessons";
import { getCurrentMember, getMembers } from "@/lib/members";
import { getAllSessionPasses } from "@/lib/session-passes";
import { getAllCustomerPlans } from "@/lib/customer-plans";
import { getAllPlans, buildLessonFeeMap, getAllSessionPassPrices, buildSessionPassPriceMap } from "@/lib/plans-master";
import { CommissionsClient } from "./commissions-client";

export const dynamic = "force-dynamic";

export default async function CommissionsPage() {
  const member = await getCurrentMember();

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-6 text-center">
        <p className="text-4xl">💰</p>
        <p className="text-sm font-semibold text-gray-600">担当者アカウントに紐づいていません</p>
        <p className="text-xs text-gray-400">管理者に担当者の割り当てを依頼してください</p>
      </div>
    );
  }

  const [customers, lessons, trialLessons, sessionPasses, customerPlans, members, plansMaster, sessionPassPrices] = await Promise.all([
    getCustomers(),
    getLessons(),
    getTrialLessons(),
    getAllSessionPasses(),
    getAllCustomerPlans(),
    getMembers(),
    getAllPlans(),
    getAllSessionPassPrices(),
  ]);

  const completedLessons = lessons.filter((l) => l.status === "completed");
  const contractedTrials = trialLessons.filter((l) => l.contracted === true);

  return (
    <CommissionsClient
      customers={customers}
      lessons={completedLessons}
      trialLessons={contractedTrials}
      sessionPasses={sessionPasses}
      customerPlans={customerPlans}
      lessonFees={buildLessonFeeMap(plansMaster)}
      sessionPassPriceMap={buildSessionPassPriceMap(sessionPassPrices)}
      members={members.map((m) => ({ id: m.id, name: m.name }))}
      isAdmin={member.isAdmin}
      currentMemberId={member.id}
    />
  );
}

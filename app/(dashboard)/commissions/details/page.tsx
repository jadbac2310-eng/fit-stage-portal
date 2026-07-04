import { getCustomers } from "@/lib/customers";
import { getLessons } from "@/lib/lessons";
import { getTrialLessons } from "@/lib/trial-lessons";
import { getCurrentMember, getMembers } from "@/lib/members";
import { getAllSessionPasses } from "@/lib/session-passes";
import { getAllCustomerPlans } from "@/lib/customer-plans";
import { getAllPlans, buildLessonFeeMap, getAllSessionPassPrices, buildSessionPassPriceMap } from "@/lib/plans-master";
import { getMemberCustomerRates } from "@/lib/commission-rates";
import { getRentalGyms } from "@/lib/rental-gyms";
import { getStores } from "@/lib/stores";
import { isBillableLessonStatus } from "@/lib/lessons-types";
import { DetailsClient } from "./details-client";

export const dynamic = "force-dynamic";

export default async function CommissionDetailsPage() {
  const member = await getCurrentMember();

  if (!member?.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-4xl">🔒</p>
        <p className="text-sm font-semibold text-gray-600">管理者のみ閲覧できます</p>
      </div>
    );
  }

  const [customers, lessons, trialLessons, sessionPasses, customerPlans, members, plansMaster, sessionPassPrices, trainerRates, rentalGyms, stores] = await Promise.all([
    getCustomers(),
    getLessons(),
    getTrialLessons(),
    getAllSessionPasses(),
    getAllCustomerPlans(),
    getMembers(),
    getAllPlans(),
    getAllSessionPassPrices(),
    getMemberCustomerRates(),
    getRentalGyms(),
    getStores(),
  ]);

  const completedLessons = lessons.filter((l) => isBillableLessonStatus(l.status));
  const completedTrialLessons = trialLessons.filter((l) => l.status === "completed");

  return (
    <DetailsClient
      customers={customers}
      lessons={completedLessons}
      trialLessons={completedTrialLessons}
      sessionPasses={sessionPasses}
      customerPlans={customerPlans}
      lessonFees={buildLessonFeeMap(plansMaster)}
      sessionPassPriceMap={buildSessionPassPriceMap(sessionPassPrices)}
      members={members.map((m) => ({ id: m.id, name: m.name, avatarUrl: m.avatarUrl }))}
      trainerRates={trainerRates.map((r) => ({ memberId: r.memberId, customerId: r.customerId, rate: r.rate }))}
      rentalGyms={rentalGyms.map((g) => ({ id: g.id, name: g.name, fee: g.fee }))}
      stores={stores.map((s) => ({ id: s.id, name: s.name, fee: s.fee }))}
    />
  );
}

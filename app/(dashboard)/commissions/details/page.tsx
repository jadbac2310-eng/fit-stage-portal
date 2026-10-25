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
import { getFctStores } from "@/lib/fct-stores";
import { getAvenirStores } from "@/lib/avenir-stores";
import { isBillableLessonStatus } from "@/lib/lessons-types";
import { withinRecentMonths } from "@/lib/recent-months";
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

  const [customers, lessons, trialLessons, sessionPasses, customerPlans, members, plansMaster, sessionPassPrices, trainerRates, rentalGyms, stores, fctStores, avenirStores] = await Promise.all([
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
    getFctStores(),
    getAvenirStores(),
  ]);

  // 画面で選べるのは直近12か月だけ。それより古いぶんは端末に送らない
  const completedLessons = withinRecentMonths(lessons, (l) => l.scheduledAt)
    .filter((l) => isBillableLessonStatus(l.status));
  const completedTrialLessons = withinRecentMonths(trialLessons, (l) => l.scheduledAt)
    .filter((l) => l.status === "completed");

  return (
    <DetailsClient
      customers={customers}
      lessons={completedLessons}
      trialLessons={completedTrialLessons}
      sessionPasses={sessionPasses}
      customerPlans={customerPlans}
      lessonFees={buildLessonFeeMap(plansMaster)}
      sessionPassPriceMap={buildSessionPassPriceMap(sessionPassPrices)}
      members={members.map((m) => ({ id: m.id, name: m.name, avatarUrl: m.avatarUrl, isOwner: m.isOwner }))}
      trainerRates={trainerRates.map((r) => ({ memberId: r.memberId, customerId: r.customerId, rate: r.rate, fixedAmount: r.fixedAmount }))}
      rentalGyms={rentalGyms.map((g) => ({ id: g.id, name: g.name, fee: g.fee }))}
      stores={stores.map((s) => ({ id: s.id, name: s.name }))}
      fctStores={fctStores.map((f) => ({ id: f.id, name: f.name, fee: f.fee, rate: f.rate }))}
      avenirStores={avenirStores.map((a) => ({ id: a.id, name: a.name, fee: a.fee }))}
    />
  );
}

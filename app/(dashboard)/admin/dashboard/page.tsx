import { getCustomers } from "@/lib/customers";
import { getLessons } from "@/lib/lessons";
import { getTrialLessons } from "@/lib/trial-lessons";
import { getCurrentIsAdmin, getMembers } from "@/lib/members";
import { getAllSessionPasses } from "@/lib/session-passes";
import { getAllCustomerPlans } from "@/lib/customer-plans";
import { getAllPlans, buildLessonFeeMap, getAllSessionPassPrices, buildSessionPassPriceMap } from "@/lib/plans-master";
import { getMemberCustomerRates } from "@/lib/commission-rates";
import { isBillableLessonStatus } from "@/lib/lessons-types";
import {
  getPopularPages, getTrafficSources, getDeviceBreakdown, getDailyPageViews, getAnalyticsDiagnostic,
} from "@/lib/analytics";
import { RevenueDashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const isAdmin = await getCurrentIsAdmin();

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-4xl">🔒</p>
        <p className="text-sm font-semibold text-gray-600">管理者のみ閲覧できます</p>
      </div>
    );
  }

  const [
    customers, lessons, trialLessons, sessionPasses, customerPlans, members, plansMaster, sessionPassPrices, allRates,
    popularPages, trafficSources, deviceBreakdown, dailyPageViews, analyticsError,
  ] = await Promise.all([
    getCustomers(),
    getLessons(),
    getTrialLessons(),
    getAllSessionPasses(),
    getAllCustomerPlans(),
    getMembers(),
    getAllPlans(),
    getAllSessionPassPrices(),
    getMemberCustomerRates(),
    getPopularPages(28, 5),
    getTrafficSources(28, 6),
    getDeviceBreakdown(28),
    getDailyPageViews(28),
    getAnalyticsDiagnostic(),
  ]);

  const completedLessons = lessons.filter((l) => isBillableLessonStatus(l.status));
  const contractedTrials = trialLessons.filter((l) => l.contracted === true);
  const completedTrialLessons = trialLessons.filter((l) => l.status === "completed");

  return (
    <RevenueDashboardClient
      customers={customers}
      lessons={completedLessons}
      trialLessons={contractedTrials}
      completedTrialLessons={completedTrialLessons}
      sessionPasses={sessionPasses}
      customerPlans={customerPlans}
      lessonFees={buildLessonFeeMap(plansMaster)}
      sessionPassPriceMap={buildSessionPassPriceMap(sessionPassPrices)}
      members={members.map((m) => ({ id: m.id, name: m.name }))}
      trainerRates={allRates.map((r) => ({ memberId: r.memberId, customerId: r.customerId, rate: r.rate }))}
      analytics={{ popularPages, trafficSources, deviceBreakdown, dailyPageViews, analyticsError }}
    />
  );
}

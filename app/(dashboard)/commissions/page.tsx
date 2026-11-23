import { getCustomers } from "@/lib/customers";
import { getLessons } from "@/lib/lessons";
import { getTrialLessons } from "@/lib/trial-lessons";
import { getCurrentMember, getMembers } from "@/lib/members";
import { getAllSessionPasses } from "@/lib/session-passes";
import { getAllCustomerPlans } from "@/lib/customer-plans";
import { getAllPlans, buildLessonFeeMap, getAllSessionPassPrices, buildSessionPassPriceMap } from "@/lib/plans-master";
import { getMemberCustomerRates } from "@/lib/commission-rates";
import { getHourlyTasks } from "@/lib/hourly-tasks";
import { getFctStores } from "@/lib/fct-stores";
import { getCommissionAdjustments } from "@/lib/commission-adjustments";
import { isBillableLessonStatus } from "@/lib/lessons-types";
import { recentReadStart } from "@/lib/recent-months";
import { CommissionsClient } from "./commissions-client";
import { getLang } from "@/lib/i18n-server";
import { makeT } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function CommissionsPage() {
  const member = await getCurrentMember();

  if (!member) {
    const t = makeT(await getLang());
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-6 text-center">
        <p className="text-4xl">💰</p>
        <p className="text-sm font-semibold text-gray-600">{t("担当者アカウントに紐づいていません", "Your login is not linked to a staff account")}</p>
        <p className="text-xs text-gray-400">{t("管理者に担当者の割り当てを依頼してください", "Ask an admin to link it")}</p>
      </div>
    );
  }

  // 選べるのは直近12か月だけ。古いぶんはそもそも読まない
  const since = recentReadStart();
  const [customers, lessons, trialLessons, sessionPasses, customerPlans, members, plansMaster, sessionPassPrices, allRates, allHourlyTasks, fctStores, allAdjustments] = await Promise.all([
    getCustomers(),
    getLessons(since),
    getTrialLessons(since),
    getAllSessionPasses(),
    getAllCustomerPlans(),
    getMembers(),
    getAllPlans(),
    getAllSessionPassPrices(),
    getMemberCustomerRates(),
    getHourlyTasks(since),
    getFctStores(),
    getCommissionAdjustments(),
  ]);

  const completedLessons = lessons.filter((l) => isBillableLessonStatus(l.status));
  const contractedTrials = trialLessons.filter((l) => l.contracted === true);
  const completedTrialLessons = trialLessons.filter((l) => l.status === "completed");

  // 歩合率は他人ぶんを渡さない（管理者は全件、それ以外は自分ぶんのみ）
  const trainerRates = allRates
    .filter((r) => member.isAdmin || r.memberId === member.id)
    .map((r) => ({ memberId: r.memberId, customerId: r.customerId, rate: r.rate, fixedAmount: r.fixedAmount }));

  // 業務は時給が入っているので、歩合率と同じく他人ぶんは渡さない
  const hourlyTasks = allHourlyTasks.filter((t) => member.isAdmin || t.memberId === member.id);

  // 前払いの差し引きも金額なので、他人ぶんは渡さない（本人は自分の分を知る必要がある）
  const adjustments = allAdjustments.filter((a) => member.isAdmin || a.memberId === member.id);

  return (
    <CommissionsClient
      customers={customers}
      lessons={completedLessons}
      trialLessons={contractedTrials}
      completedTrialLessons={completedTrialLessons}
      sessionPasses={sessionPasses}
      customerPlans={customerPlans}
      hourlyTasks={hourlyTasks}
      lessonFees={buildLessonFeeMap(plansMaster)}
      sessionPassPriceMap={buildSessionPassPriceMap(sessionPassPrices)}
      members={members.map((m) => ({
        id: m.id, name: m.name, avatarUrl: m.avatarUrl, isOwner: m.isOwner, commissionPayDay: m.commissionPayDay,
        // 研修の額も支払いの条件なので、歩合率と同じく他人ぶんは渡さない
        ...((member.isAdmin || m.id === member.id) && { trainingPay: m.trainingPay, trainingFrom: m.trainingFrom, trainingUntil: m.trainingUntil }),
      }))}
      trainerRates={trainerRates}
      fctStores={fctStores.map((f) => ({ id: f.id, rate: f.rate }))}
      adjustments={adjustments}
      isAdmin={member.isAdmin}
      currentMemberId={member.id}
    />
  );
}

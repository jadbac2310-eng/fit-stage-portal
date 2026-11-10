import { getCustomers } from "./customers";
import { tieredLessonPricesAll } from "./session-tiers";
import { getLessons } from "./lessons";
import { getTrialLessons } from "./trial-lessons";
import { getHourlyTasks } from "./hourly-tasks";
import { getMembers } from "./members";
import { getAllSessionPasses } from "./session-passes";
import { getAllCustomerPlans } from "./customer-plans";
import { getAllPlans, buildLessonFeeMap, getAllSessionPassPrices, buildSessionPassPriceMap } from "./plans-master";
import { getMemberCustomerRates } from "./commission-rates";
import { getFctStores } from "./fct-stores";
import { getCommissionAdjustments } from "./commission-adjustments";
import { isBillableLessonStatus } from "./lessons-types";
import type { CommissionContext } from "./commissions";
import { buildTrainerStatements } from "./commission-statement";
import { monthReadStart } from "./recent-months";

/**
 * その月のコミッション明細（全員ぶん）を、読むところから作る。
 *
 * コミッション明細の画面・代表のダッシュボードの「支払いが済んだか」の箱・朝のLINEの知らせ の3か所が、
 * 同じこの関数を呼ぶ（金額が画面ごとに食い違わないように。2026-11-10 に明細の画面から切り出した）。
 */
export async function loadTrainerStatements(month: string) {
  // その月（と締日ずれのための前月）だけ読む
  const since = monthReadStart(month);
  const [customers, lessons, trialLessons, hourlyTasks, sessionPasses, customerPlans, members, plansMaster, sessionPassPrices, allRates, fctStores, adjustments] = await Promise.all([
    getCustomers(),
    getLessons(since),
    getTrialLessons(since),
    getHourlyTasks(since),
    getAllSessionPasses(),
    getAllCustomerPlans(),
    getMembers(),
    getAllPlans(),
    getAllSessionPassPrices(),
    getMemberCustomerRates(),
    getFctStores(),
    getCommissionAdjustments(),
  ]);

  const ctx: CommissionContext = {
    customers, sessionPasses, customerPlans,
    members: members.map((m) => ({ id: m.id, name: m.name, isOwner: m.isOwner })),
    trainerRates: allRates.map((r) => ({ memberId: r.memberId, customerId: r.customerId, rate: r.rate, fixedAmount: r.fixedAmount })),
    lessonFees: buildLessonFeeMap(plansMaster),
    // 段階単価（請求書と同じ単価で歩合を出す）
    tieredPrices: tieredLessonPricesAll({ customers, lessons }),
    sessionPassPriceMap: buildSessionPassPriceMap(sessionPassPrices),
    fctStores: fctStores.map((f) => ({ id: f.id, rate: f.rate })),
  };

  const completedLessons = lessons.filter((l) => isBillableLessonStatus(l.status));
  const completedTrialLessons = trialLessons.filter((l) => l.status === "completed");
  const contractedTrialLessons = trialLessons.filter((l) => l.contracted === true);

  const statements = buildTrainerStatements(completedLessons, completedTrialLessons, contractedTrialLessons, hourlyTasks, month, ctx, adjustments);
  return { statements, members, hourlyTasks };
}

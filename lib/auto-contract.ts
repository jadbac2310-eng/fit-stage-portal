import { getTrialLessons, updateTrialLesson } from "./trial-lessons";
import { getCustomers } from "./customers";
import { logActivity } from "./activity-logs";
import { notifyContracted } from "./lesson-notify";
import type { CustomerPlan } from "./customers-types";
import type { TrialLesson } from "./trial-lessons-types";

/**
 * 入会申込書（HPの /store/join/）が届いたら、その人の体験レッスンを自動で「契約成功」にする。
 *
 * 手で記録するとき（lessons/trial/actions.ts の saveContractResultAction）と同じことをする：
 *   契約結果＝契約成功・ステータス＝完了・成約のLINE（🎉）・操作ログ。
 * 顧客ステータスは呼び出し元（join-webhook）が「審査中」にする。
 *
 * どの体験を成功にするか：
 *   その顧客の体験のうち、キャンセルでなく、まだ契約成功になっていない、いちばん最近のもの。
 *   予約日がまだ先（明日以降）のものは触らない（体験前に申込書だけ先に出た場合）。
 * 顧客が特定できないときは、名前（空白を除いて同じ）で探す。それでも無ければ何もしない。
 */

function normName(s: string): string {
  return s.replace(/[\s　]/g, "");
}

/** 申込書のプラン名から契約プラン（月2回／月4回／月8回）を拾う。無ければ undefined */
export function contractPlanFromText(plan?: string): CustomerPlan | undefined {
  if (!plan) return undefined;
  const half = plan.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  const m = /月\s*([248])\s*回/.exec(half);
  if (!m) return undefined;
  return (m[1] === "2" ? "月2回" : m[1] === "4" ? "月4回" : "月8回") as CustomerPlan;
}

export async function autoContractTrial(input: {
  customerId?: string;
  fullName: string;
  plan?: string;
}): Promise<{ marked: TrialLesson | null; reason?: string }> {
  const since = new Date(Date.now() - 120 * 86400000).toISOString().slice(0, 10); // 直近4か月で十分
  const trials = await getTrialLessons(since);

  let candidates = input.customerId ? trials.filter((t) => t.customerId === input.customerId) : [];
  if (candidates.length === 0) {
    // 顧客IDで見つからないときは名前で。顧客マスタの表記ゆれ（空白）を吸収する
    const want = normName(input.fullName);
    const customers = await getCustomers();
    const ids = new Set(customers.filter((c) => normName(c.fullName) === want).map((c) => c.id));
    candidates = trials.filter((t) => ids.has(t.customerId) || normName(t.customerName) === want);
  }

  const tomorrow = new Date(Date.now() + 9 * 3600 * 1000);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowDay = tomorrow.toISOString().slice(0, 10);
  const jstDay = (iso: string) => new Date(new Date(iso).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);

  const target = candidates
    .filter((t) => t.status !== "cancelled" && t.contracted !== true && jstDay(t.scheduledAt) < tomorrowDay)
    .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))[0];
  if (!target) return { marked: null, reason: candidates.length === 0 ? "体験が見つからない" : "対象の体験が無い（済みか、まだ先）" };

  const contractPlan = contractPlanFromText(input.plan);
  await updateTrialLesson(target.id, {
    contracted: true,
    status: "completed",
    ...(contractPlan ? { contractPlan } : {}),
  });

  await logActivity({
    action: "report", entityType: "trial_lesson", entityId: target.id,
    summary: `入会申込書が届いたので体験を契約成功に: ${target.customerName}${contractPlan ? `（${contractPlan}）` : ""}`,
    memberName: "HP申込",
  });
  try {
    await notifyContracted({ customerName: target.customerName, salesName: target.salesMemberName, trainerName: target.trainerMemberName, byName: "入会申込書" });
  } catch (e) {
    console.error("[auto-contract] 成約の通知に失敗", e);
  }
  return { marked: target };
}

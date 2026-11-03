import type { TrialLesson } from "./trial-lessons-types";
import { isFctCustomer } from "./customers-types";
import { jstDay } from "./highlights-types";

/**
 * 入会金。
 *
 * 2026-11-03 から、体験レッスンで入会（契約成功）したお客様から 5,500円 をいただく。
 * 体験料 6,600円 はこれまでどおり別にいただき、担当トレーナーの歩合（50%）も体験料に対してだけ付く。
 * 入会金は会社の売上（誰にも歩合を付けない）。
 *
 * 入会金がかからない人：
 *   ・出張・オンラインのお客様（HPの案内と同じ。店舗のみ）
 *   ・FCT経由のお客様（FCTとの取り決めで、こちらからは請求しない）
 *   ・開始日より前の体験（入会金が 0円 だった時期）
 *
 * 金額や開始日が変わったら、ここだけ直す。
 */
export const ENROLLMENT_FEE = 5500;
export const ENROLLMENT_FEE_SINCE = "2026-11-03";

/** この体験で発生する入会金。かからなければ 0 */
export function enrollmentFeeOf(
  trial: Pick<TrialLesson, "contracted" | "scheduledAt" | "deliveryMode" | "customerId">,
  customers: { id: string; salesChannel?: "own" | "fct" }[],
): number {
  if (trial.contracted !== true) return 0;
  if (trial.deliveryMode !== "store") return 0;
  if (jstDay(trial.scheduledAt) < ENROLLMENT_FEE_SINCE) return 0;
  const c = customers.find((x) => x.id === trial.customerId);
  if (c && isFctCustomer(c)) return 0;
  return ENROLLMENT_FEE;
}

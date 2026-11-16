import { getLessons } from "./lessons";
import { getTrialLessons } from "./trial-lessons";
import { runOpsChecks, type OpsFinding } from "./ops-check";

/** 業務チェック部：DBから読んでチェックする（AI部署の画面と朝の LINE の両方が使う） */
export async function loadOpsFindings(now: Date = new Date()): Promise<OpsFinding[]> {
  const pastDays = Number(process.env.OPS_CHECK_DAYS ?? "60");
  const from = new Date(now.getTime() + 9 * 3600 * 1000 - pastDays * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const [lessons, trials] = await Promise.all([getLessons(from), getTrialLessons(from)]);
  return runOpsChecks({ now, lessons, trials, pastDays });
}

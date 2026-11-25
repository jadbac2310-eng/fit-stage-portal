import type { Lesson } from "./lessons-types";
import type { TrialLesson } from "./trial-lessons-types";

/**
 * 業務チェック部（AI部署の1つ目。2026-11-16 尚樹の依頼）。
 *
 * 毎朝、レッスンと体験の入力を見て「このままだとお金や引き継ぎに響くもの」を拾う。
 * 判断はしない。見つけて知らせるだけ（直すのは人）。純粋関数なので、偽データでそのまま試せる。
 *
 * 見るもの：
 *   - 完了忘れ    … 昨日以前なのに「予定」のまま（完了にしないと請求にも歩合にも乗らない）
 *   - 担当なし    … 担当トレーナーが空（本人の画面に出ず、完了も押せない）
 *   - 二重登録    … 同じお客さま・同じ時刻のレッスンが2件以上（回数券を余分に使っている恐れ）
 *   - コース未設定 … コースが空（請求書の明細に載らない）
 *   - 体験の結果未入力 … 体験が終わって3日たつのに、成約・未成約が空
 * 古すぎる記録まで並べると見なくなるので、過去は OPS_CHECK_DAYS（既定60日）まで。
 */

export type OpsCheckKind = "not-completed" | "no-trainer" | "duplicate" | "no-course" | "trial-no-result";

export const OPS_CHECK_LABEL: Record<OpsCheckKind, { title: string; why: string }> = {
  "not-completed":   { title: "完了忘れ",         why: "完了にしないと、請求にも歩合にも乗りません" },
  "no-trainer":      { title: "担当なし",         why: "トレーナー本人の画面に出ず、完了も押せません" },
  "duplicate":       { title: "二重登録の疑い",   why: "同じお客さま・同じ時刻に2件以上。回数券を余分に使っている恐れがあります" },
  "no-course":       { title: "コース未設定",     why: "請求書の明細に載りません" },
  "trial-no-result": { title: "体験の結果未入力", why: "成約・未成約を入れないと、営業の歩合と売上に反映されません" },
};

export const OPS_CHECK_ORDER: OpsCheckKind[] = ["not-completed", "no-trainer", "duplicate", "no-course", "trial-no-result"];

export interface OpsFinding {
  kind: OpsCheckKind;
  /** レッスンか体験の id（詳細ページ /schedule/[id] へ飛ぶ） */
  id: string;
  isTrial: boolean;
  customerName: string;
  scheduledAt: string;
  trainerName?: string;
  trainerId?: string;
}

const DAY = 24 * 3600 * 1000;
const JST = 9 * 3600 * 1000;

/** 日本時間の今日の0時（UTCの時刻で） */
function jstTodayStart(now: Date): number {
  const t = now.getTime() + JST;
  return t - (t % DAY) - JST;
}

export function runOpsChecks(input: {
  now: Date;
  lessons: Lesson[];
  trials: TrialLesson[];
  pastDays?: number;
  aheadDays?: number;
  trialResultDays?: number;
}): OpsFinding[] {
  const { now, lessons, trials } = input;
  const today = jstTodayStart(now);
  const from = today - (input.pastDays ?? 60) * DAY;
  const until = today + (input.aheadDays ?? 14) * DAY;
  const resultLimit = now.getTime() - (input.trialResultDays ?? 3) * DAY;
  const out: OpsFinding[] = [];
  const at = (iso: string) => new Date(iso).getTime();

  const lessonFinding = (kind: OpsCheckKind, l: Lesson): OpsFinding => ({
    kind, id: l.id, isTrial: false, customerName: l.customerName, scheduledAt: l.scheduledAt, trainerName: l.trainerMemberName,
    trainerId: l.trainerMemberId,
  });
  const trialFinding = (kind: OpsCheckKind, t: TrialLesson): OpsFinding => ({
    kind, id: t.id, isTrial: true, customerName: t.customerName, scheduledAt: t.scheduledAt, trainerName: t.trainerMemberName,
    trainerId: t.trainerMemberId,
  });

  const live = lessons.filter((l) => l.status !== "cancelled" && at(l.scheduledAt) >= from && at(l.scheduledAt) < until);

  for (const l of live) {
    if (l.status === "scheduled" && at(l.scheduledAt) < today) out.push(lessonFinding("not-completed", l));
    if (!l.trainerMemberId) out.push(lessonFinding("no-trainer", l));
    if (!l.course?.trim()) out.push(lessonFinding("no-course", l));
  }

  // 二重登録：同じお客さま × 同じ開始時刻（分まで）
  const groups = new Map<string, Lesson[]>();
  for (const l of live) {
    if (l.status === "cancelled_same_day") continue;
    const k = `${l.customerId}|${new Date(l.scheduledAt).toISOString().slice(0, 16)}`;
    groups.set(k, [...(groups.get(k) ?? []), l]);
  }
  for (const g of groups.values()) {
    if (g.length > 1) for (const l of g) out.push(lessonFinding("duplicate", l));
  }

  for (const t of trials) {
    const ts = at(t.scheduledAt);
    if (t.status === "cancelled" || ts < from) continue;
    if (t.status === "scheduled" && ts < today) out.push(trialFinding("not-completed", t));
    if (t.status === "scheduled" && ts < until && !t.trainerMemberId) out.push(trialFinding("no-trainer", t));
    if (t.status === "completed" && t.contracted == null && ts < resultLimit) out.push(trialFinding("trial-no-result", t));
  }

  return out.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
}

export function groupFindings(findings: OpsFinding[]): { kind: OpsCheckKind; items: OpsFinding[] }[] {
  return OPS_CHECK_ORDER
    .map((kind) => ({ kind, items: findings.filter((f) => f.kind === kind) }))
    .filter((g) => g.items.length > 0);
}

/** 「11/14(金) 12:00」（日本時間） */
export function opsSlotLabel(iso: string): string {
  const d = new Date(new Date(iso).getTime() + JST);
  const wd = ["日", "月", "火", "水", "木", "金", "土"][d.getUTCDay()];
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${wd}) ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

/** 朝の LINE の本文（1つの項目につき5件まで。残りは件数だけ） */
export function buildOpsCheckMessage(findings: OpsFinding[], pageUrl: string, perKind = 5): string | null {
  const groups = groupFindings(findings);
  if (groups.length === 0) return null;
  const lines = [`🔎 業務チェック部より：気になるところが ${findings.length}件 あります`];
  for (const g of groups) {
    lines.push("", `■ ${OPS_CHECK_LABEL[g.kind].title}（${g.items.length}件）`);
    for (const f of g.items.slice(0, perKind)) {
      lines.push(`・${opsSlotLabel(f.scheduledAt)} ${f.customerName} 様${f.isTrial ? "（体験）" : ""}／${f.trainerName || "担当なし"}`);
    }
    if (g.items.length > perKind) lines.push(`　ほか ${g.items.length - perKind}件`);
  }
  lines.push("", `▶ 全部の一覧（AI部署）\n${pageUrl}`);
  return lines.join("\n");
}

/**
 * トレーナー本人あての「完了にしていないレッスン」（2026-11-25 尚樹「トレーナーに完了通知を足そう」）。
 * 完了忘れ（昨日以前なのに予定のまま）を担当トレーナーごとに分けて、1人1通の本文にする。
 * 代表（skipIds）は朝の業務チェックで全員分を見ているので入れない。完了忘れが無い人には作らない。
 * スタッフには英語で使う人がいるので、見出しと最後の一文だけ英語を添える。
 */
export function buildTrainerPendingMessages(
  findings: OpsFinding[], skipIds: string[] = [], perTrainer = 5,
): { trainerId: string; text: string }[] {
  const byTrainer = new Map<string, OpsFinding[]>();
  for (const f of findings) {
    if (f.kind !== "not-completed" || !f.trainerId || skipIds.includes(f.trainerId)) continue;
    byTrainer.set(f.trainerId, [...(byTrainer.get(f.trainerId) ?? []), f]);
  }
  return [...byTrainer.entries()].map(([trainerId, items]) => {
    const lines = [
      `📝 完了にしていないレッスンが ${items.length}件 あります`,
      `(${items.length} session${items.length > 1 ? "s" : ""} not marked done)`,
      "",
    ];
    for (const f of items.slice(0, perTrainer)) {
      lines.push(`・${opsSlotLabel(f.scheduledAt)} ${f.customerName} 様${f.isTrial ? "（体験）" : ""}`);
    }
    if (items.length > perTrainer) lines.push(`　ほか ${items.length - perTrainer}件`);
    lines.push(
      "",
      "ポータルを開いて「完了」を押してください（ホームの黄色い箱からも押せます）。完了にしないと歩合に入りません。",
      "Please open the portal and tap \"Done\". Sessions not marked done aren't paid.",
    );
    return { trainerId, text: lines.join("\n") };
  });
}

import { getMembers, type Member } from "./members";
import { getTrialLessons } from "./trial-lessons";
import { getCustomer } from "./customers";
import { getStores } from "./stores";
import { parseTrialNote } from "./trial-note";
import { findStore } from "./trial-confirm-mail";
import { getTrialConfirmMailSent, getTrialConfirmations, isTrialConfirmed } from "./activity-logs";
import { pushLineMessage } from "./line";
import { fetchSentKeys, markSent, canNotifyByLine, jstDateStr, jstDateLabel, jstTimeStr } from "./line-notify";
import { loginLink } from "./line-login";
import type { TrialLesson } from "./trial-lessons-types";

/**
 * 明日の体験で、お客様の「予約を確認しました」がまだの人を、前日18時に LINE で知らせる（2026-11-14〜）。
 *
 * 確定メールに「ボタンが押されていない方には、お電話にて確認させていただく場合があります」と書いたので、
 * 電話するのは押されていない人だけにする。確定メールをまだ送っていない人も「メール未送信」として入れる。
 * 宛先：その体験の担当トレーナー（自分の分だけ）と代表（全員分）。電話番号も添える。
 * 店舗レッスンの前日通知と同じ cron（/api/cron/store-tomorrow、18時台）から呼ぶ。
 * LINE_NOTIFY_TRIAL_UNCONFIRMED=off で止める。重複は line_notifications（kind trial-unconfirmed）で防ぐ。
 */
export const TRIAL_UNCONFIRMED_KIND = "trial-unconfirmed";

export function trialUnconfirmedEnabled(): boolean {
  return (process.env.LINE_NOTIFY_TRIAL_UNCONFIRMED ?? "").trim().toLowerCase() !== "off";
}

export interface UnconfirmedRow {
  trial: TrialLesson;
  mailSent: boolean;
  phone?: string;
  storeName?: string;
}

/** 文面（純粋関数。テストしやすいように分けている） */
export function buildUnconfirmedMessage(dateLabel: string, rows: UnconfirmedRow[]): string {
  const lines = [`📞 明日 ${dateLabel} の体験で、まだご予約の確認が取れていない方（${rows.length}件）`];
  for (const r of [...rows].sort((a, b) => a.trial.scheduledAt.localeCompare(b.trial.scheduledAt))) {
    const where = r.storeName ? `・${r.storeName}` : "";
    lines.push(
      "",
      `■ ${jstTimeStr(r.trial.scheduledAt)} ${r.trial.customerName} 様${where}`,
      `担当：${r.trial.trainerMemberName || "未設定"}`,
      r.mailSent ? "確定メールは送信済み・確認ボタンがまだ" : "確定メールをまだ送っていません",
      r.phone ? `☎ ${r.phone}` : "☎ 電話番号の登録なし",
    );
  }
  lines.push("", "お電話でご予約の確認をお願いします。");
  return lines.join("\n");
}

export async function notifyUnconfirmedTrials(now: Date = new Date()): Promise<{ sent: number; trials: number }> {
  const today = jstDateStr(now);
  const tomorrow = jstDateStr(now.getTime() + 24 * 3600 * 1000);
  const [trials, mailSent, confirmations] = await Promise.all([
    getTrialLessons(today), getTrialConfirmMailSent(), getTrialConfirmations(),
  ]);
  const targets = trials.filter((t) =>
    t.status === "scheduled" && jstDateStr(t.scheduledAt) === tomorrow && !isTrialConfirmed(confirmations[t.id], t.scheduledAt));
  if (targets.length === 0) return { sent: 0, trials: 0 };

  const [members, stores, customers] = await Promise.all([
    getMembers(), getStores().catch(() => []),
    Promise.all(targets.map((t) => getCustomer(t.customerId).catch(() => null))),
  ]);
  const rows: UnconfirmedRow[] = targets.map((t, k) => {
    const wish = parseTrialNote(t.note).items.find((x) => x.label === "希望店舗")?.value;
    const store = findStore(stores.find((s) => s.id === t.storeId)?.name, wish, t.location);
    return {
      trial: t,
      mailSent: !!mailSent[t.id],
      phone: customers[k]?.phoneNumber?.trim() || undefined,
      storeName: store?.name ?? (t.location?.trim() || undefined),
    };
  });

  // 宛先ごとに、見せる体験を決める（代表は全員分、トレーナーは自分の分）
  const byMember = new Map<string, { member: Member; rows: UnconfirmedRow[] }>();
  const add = (m: Member | undefined, r: UnconfirmedRow) => {
    if (!m || !canNotifyByLine(m)) return;
    const e = byMember.get(m.id) ?? { member: m, rows: [] };
    if (!e.rows.includes(r)) e.rows.push(r);
    byMember.set(m.id, e);
  };
  for (const r of rows) {
    for (const o of members.filter((m) => m.isOwner)) add(o, r);
    add(members.find((m) => m.id === r.trial.trainerMemberId), r);
  }

  const ref = `${TRIAL_UNCONFIRMED_KIND}:${tomorrow}`;
  const already = await fetchSentKeys(TRIAL_UNCONFIRMED_KIND, [ref]);
  const dateLabel = jstDateLabel(`${tomorrow}T00:00:00+09:00`);
  let sent = 0;
  for (const { member, rows: mine } of byMember.values()) {
    if (already.has(`${ref}__${member.id}`)) continue;
    const text = buildUnconfirmedMessage(dateLabel, mine) + `\n\n▶ 体験レッスンを見る\n${loginLink(member, "/lessons/trial")}`;
    const res = await pushLineMessage(member.lineUserId!, text);
    if (res.ok) { await markSent(TRIAL_UNCONFIRMED_KIND, ref, member.id); sent++; }
  }
  return { sent, trials: rows.length };
}

import { getLessonsInRange } from "./lessons";
import { getTrialLessonsInRange } from "./trial-lessons";
import { getPersonalEventsInRange } from "./personal-events";

// 通知対象として正規化したスケジュール1件
export interface NotifyItem {
  ref:          string;        // 'personal:<id>' など（重複送信の判定キー）
  title:        string;
  startAt:      string;        // ISO
  allDay:       boolean;
  location?:    string;
  recipientIds: string[];      // 通知先の担当者id（重複可・呼び出し側で連携状態を判定）
  notify?:      boolean;       // 個人予定のLINE通知ON/OFF（未設定=常に通知。レッスン等は対象外）
}

/**
 * 個人予定・通常レッスン・体験レッスンを通知用に集約する（キャンセルは除外）。
 * - 個人予定: 作成者＋参加者
 * - 通常レッスン: 担当トレーナー
 * - 体験レッスン: 担当トレーナー＋担当営業
 *
 * 開始が [fromIso, toIso) のものだけ読む（2026-11-16）。前は数分おきに全件を読んでいて、DBを重くしていた。
 */
export async function collectNotifyItems(fromIso: string, toIso: string): Promise<NotifyItem[]> {
  // レッスン・体験の開始前の知らせは 2026-11-25 にやめた（尚樹「トレーナーへの30分前の通知は外していい」）。
  // 個人予定（通知オンのもの）だけ送る。戻すときは Vercel に LINE_REMINDER_LESSONS=on。
  const withLessons = (process.env.LINE_REMINDER_LESSONS ?? "").trim().toLowerCase() === "on";
  const [events, lessons, trials] = await Promise.all([
    getPersonalEventsInRange(fromIso, toIso),
    withLessons ? getLessonsInRange(fromIso, toIso) : Promise.resolve([]),
    withLessons ? getTrialLessonsInRange(fromIso, toIso) : Promise.resolve([]),
  ]);

  const items: NotifyItem[] = [];

  for (const e of events) {
    items.push({
      ref: `personal:${e.id}`,
      title: e.title,
      startAt: e.startAt,
      allDay: e.allDay,
      location: e.location,
      recipientIds: [e.memberId, ...e.participantIds],
      notify: e.notify,
    });
  }

  for (const l of lessons) {
    if (l.status === "cancelled" || l.status === "cancelled_same_day" || !l.trainerMemberId) continue;
    items.push({
      ref: `regular:${l.id}`,
      title: `${l.customerName} レッスン`,
      startAt: l.scheduledAt,
      allDay: false,
      location: l.location,
      recipientIds: [l.trainerMemberId],
    });
  }

  for (const t of trials) {
    if (t.status === "cancelled") continue;
    const recipients = [t.trainerMemberId, t.salesMemberId].filter((v): v is string => !!v);
    if (recipients.length === 0) continue;
    items.push({
      ref: `trial:${t.id}`,
      title: `${t.customerName} 体験`,
      startAt: t.scheduledAt,
      allDay: false,
      location: t.location,
      recipientIds: recipients,
    });
  }

  return items;
}

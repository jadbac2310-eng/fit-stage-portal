import type { Customer } from "./customers-types";
import type { HourlyTask } from "./hourly-tasks-types";
import { hourlyTaskAmount } from "./hourly-tasks-types";
import type { TrialLesson } from "./trial-lessons-types";

/**
 * 1日1回まとめて送るリマインドの組み立て。
 *
 * 送信そのものは行わず「誰に・何を送るか」だけを返す純粋な関数にしてある。
 * 日付の判定が絡むため、ここだけ切り出してテストできるようにしている。
 */

export interface DailyReminder {
  /** 二重送信を防ぐための鍵。同じ ref × 宛先には一度しか送らない */
  ref:          string;
  recipientIds: string[];
  text:         string;
}

/** 日本時間での年・月・日・時 */
export function jstParts(now: Date): { year: number; month: number; day: number; hour: number } {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return {
    year:  jst.getUTCFullYear(),
    month: jst.getUTCMonth() + 1,
    day:   jst.getUTCDate(),
    hour:  jst.getUTCHours(),
  };
}

function ymd(p: { year: number; month: number; day: number }): string {
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

function yen(n: number): string {
  return `¥${n.toLocaleString("ja-JP")}`;
}

/** 日本時間での日付ラベル（例: 10/3） */
function mdLabel(iso: string): string {
  const p = jstParts(new Date(iso));
  return `${p.month}/${p.day}`;
}

/** その月の末日 */
function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export interface DailyReminderInput {
  now:          Date;
  customers:    Customer[];
  hourlyTasks:  HourlyTask[];
  trialLessons: TrialLesson[];
  /** 管理者の担当者id。請求・業務のリマインド先 */
  adminIds:     string[];
  /** 体験レッスンの追客を促すまでの日数（既定3日） */
  followUpDays?: number;
}

/**
 * 請求書の送付日のリマインド。
 *
 * 顧客ごとに決めた「送付日」が今日のものを1通にまとめる。
 * 送付日がその月に無いとき（2月の31日など）は、その月の末日に送る。
 * 他の顧客に請求をまとめている顧客は、自分の請求書が出ないので対象外。
 */
function invoiceSendReminders(input: DailyReminderInput): DailyReminder[] {
  const p = jstParts(input.now);
  const last = lastDayOfMonth(p.year, p.month);

  const due = input.customers.filter((c) => {
    if (c.invoiceSendDay == null) return false;
    if (c.billingToCustomerId) return false;          // 請求をまとめられる側は請求書が出ない
    if (c.status === "inactive") return false;
    return Math.min(c.invoiceSendDay, last) === p.day; // 月に無い日は末日に寄せる
  });
  if (due.length === 0 || input.adminIds.length === 0) return [];

  const names = due.map((c) => `・${c.billingName || c.fullName}`).join("\n");
  return [{
    ref: `invoice-send:${ymd(p)}`,
    recipientIds: input.adminIds,
    text: `🧾 今日は請求書の送付日です（${p.month}/${p.day}）\n${names}\n\n送付がまだなら、ポータルの請求書画面から作成してください。`,
  }];
}

/**
 * 「予定」のまま終わってしまった業務のリマインド。
 *
 * 完了にしないと支払いに乗らないため、終了時刻を過ぎたものを知らせる。
 * 直後だと入力の手間と重なるので、終了から1日以上たったものだけにする。
 */
function pendingHourlyReminders(input: DailyReminderInput): DailyReminder[] {
  const dayMs = 24 * 60 * 60 * 1000;
  const stale = input.hourlyTasks.filter((t) =>
    t.status === "scheduled" && new Date(t.endAt).getTime() < input.now.getTime() - dayMs);
  if (stale.length === 0 || input.adminIds.length === 0) return [];

  const total = stale.reduce((s, t) => s + hourlyTaskAmount(t), 0);
  const lines = stale
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
    .map((t) => `・${mdLabel(t.scheduledAt)} ${t.title}（${t.memberName ?? "担当者未設定"}／${yen(hourlyTaskAmount(t))}）`)
    .join("\n");

  return [{
    // 日ごとの鍵にして、残っている限り毎日1通だけ届くようにする
    ref: `hourly-pending:${ymd(jstParts(input.now))}`,
    recipientIds: input.adminIds,
    text: `⏳ 「予定」のままの業務が${stale.length}件あります（合計 ${yen(total)}）\n${lines}\n\n完了にしないと、この分は支払いに入りません。`,
  }];
}

/**
 * 体験レッスンの追客リマインド。
 *
 * 実施済みなのに成約・未成約が入っていないものを、担当営業へ知らせる。
 * 営業が未割当なら管理者へ。1件につき1回だけ送る。
 */
function trialFollowUpReminders(input: DailyReminderInput): DailyReminder[] {
  const days = input.followUpDays ?? 3;
  const limit = input.now.getTime() - days * 24 * 60 * 60 * 1000;

  return input.trialLessons
    .filter((t) => t.status === "completed"
      && t.contracted == null                       // 成約・未成約が未入力
      && new Date(t.scheduledAt).getTime() < limit)
    .map((t) => {
      const to = t.salesMemberId ? [t.salesMemberId] : input.adminIds;
      if (to.length === 0) return null;
      return {
        ref: `trial-followup:${t.id}`,              // 1件につき1回だけ
        recipientIds: to,
        text: `📣 体験レッスンの結果が未入力です\n${t.customerName} 様（${mdLabel(t.scheduledAt)} 実施）\n\n`
            + `成約・未成約を入れておくと、成約ボーナスと売上に反映されます。`,
      };
    })
    .filter((r): r is DailyReminder => r !== null);
}

/** 今日ぶんのリマインドをまとめて返す */
export function buildDailyReminders(input: DailyReminderInput): DailyReminder[] {
  return [
    ...invoiceSendReminders(input),
    ...pendingHourlyReminders(input),
    ...trialFollowUpReminders(input),
  ];
}

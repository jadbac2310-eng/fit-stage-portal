import type { DailyReminder } from "./daily-reminders";
import { jstParts } from "./daily-reminders";
import { commissionPayDate } from "./commission-pay-date";
import { previousMonth, type PayoutTodo } from "./commission-payouts-types";

/**
 * コミッションの知らせ（代表へのLINE。2026-11-10）。
 *
 * 月末じめ・翌月払いなので、今月やるのは「先月ぶん」。知らせるのは3回（2026-11-11 尚樹の指示でこの形に統一）：
 *   1. 振込日の5日前（25日払いなら20日、15日払いなら10日） … 明細を送る時期です（その振込日の人で、まだ送っていない人だけ）
 *      2026-11-10 までは月はじめに全員まとめて出していたが、25日払いの人には早すぎた（尚樹の指示で振込日ごとに）
 *   2. 振込日の前日             … 明日は振込日です（まだ振り込んでいない人だけ）
 *   3. 振込日の当日             … 今日は振込日です
 *   前は「3日前」と「翌日（印が無いとき）」もあったが、前日と当日だけにした。
 * 済んだ印（commission_payouts）が付いている人は出さない。全員済んでいれば送らない。
 *
 * 送信はしない。「今日どの鍵が出番か」と「文面」だけを返す純粋な関数（日付の判定をテストできるように）。
 */

function ymdOf(now: Date): string {
  const p = jstParts(now);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** YYYY-MM-DD に n 日足す */
export function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
}

function md(ymd: string): string {
  const [, m, d] = ymd.split("-");
  return `${Number(m)}/${Number(d)}`;
}

function yen(n: number): string {
  return `¥${n.toLocaleString("ja-JP")}`;
}

/** いま払う対象の月（先月） */
export function commissionTargetMonth(now: Date): string {
  return previousMonth(jstParts(now));
}

export type CommissionReminderKind = "statement" | "eve" | "today";

export interface CommissionCandidate {
  ref: string;
  kind: CommissionReminderKind;
  /** 振込日（statement のときは無い） */
  payDate?: string;
}

/**
 * 今日が出番の知らせ（鍵だけ）。日付と支払日だけで決まるので、明細を計算する前に呼べる。
 * 明細の計算は重いので、出番が無い日・もう送った日は計算しないで済ませるため。
 */
export function commissionCandidates(now: Date, payDays: (number | undefined)[], statementDaysBefore = 5): CommissionCandidate[] {
  const today = ymdOf(now);
  const month = commissionTargetMonth(now);
  const out: CommissionCandidate[] = [];
  const dates = Array.from(new Set(payDays.map((d) => commissionPayDate(month, d)))).filter(Boolean).sort();
  for (const payDate of dates) {
    // 1. 明細。振込日の5日前から振込日までのあいだの最初の1回（鍵が振込日ごとなので、動かなかった日があっても次の日に届く）
    if (today >= addDays(payDate, -statementDaysBefore) && today <= payDate) {
      out.push({ ref: `commission-statement:${month}:${payDate}`, kind: "statement", payDate });
    }
    if (addDays(payDate, -1) === today) out.push({ ref: `commission-pay-eve:${payDate}`, kind: "eve", payDate });
    if (payDate === today)              out.push({ ref: `commission-pay-today:${payDate}`, kind: "today", payDate });
  }
  return out;
}

/** 出番の鍵と「やること」の一覧から、送る文面を作る。出すものが無い鍵は返さない */
export function buildCommissionReminders(
  candidates: CommissionCandidate[],
  todos: PayoutTodo[],
  month: string,
  recipientIds: string[],
): DailyReminder[] {
  if (recipientIds.length === 0) return [];
  const monthLabel = `${Number(month.split("-")[1])}月分`;
  const out: DailyReminder[] = [];
  for (const c of candidates) {
    if (c.kind === "statement") {
      const rest = todos.filter((t) => t.payDate === c.payDate && !t.statementSent);
      if (rest.length === 0) continue;
      const lines = rest.map((t) => `・${t.memberName}　${yen(t.payable)}`).join("\n");
      out.push({
        ref: c.ref, recipientIds,
        text: `📄 ${monthLabel}のコミッション明細を送る時期です（振込 ${md(c.payDate!)}・${rest.length}名）\n${lines}\n\n送ったら、ダッシュボードの「コミッションの支払い」で「明細」に印を付けてください。`,
      });
      continue;
    }
    const rest = todos.filter((t) => t.payDate === c.payDate && !t.paid);
    if (rest.length === 0) continue;
    const total = rest.reduce((s, t) => s + t.payable, 0);
    const lines = rest.map((t) => `・${t.memberName}　${yen(t.payable)}${t.statementSent ? "" : "（明細がまだ）"}`).join("\n");
    const head = c.kind === "eve" ? `⏰ 明日（${md(c.payDate!)}）はコミッションの振込日です`
      : `💴 今日（${md(c.payDate!)}）はコミッションの振込日です`;
    const foot = "振り込んだら、ダッシュボードの「コミッションの支払い」で「振込」に印を付けてください。";
    out.push({ ref: c.ref, recipientIds, text: `${head}\n${monthLabel}・${rest.length}名・合計 ${yen(total)}\n${lines}\n\n${foot}` });
  }
  return out;
}

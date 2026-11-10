import type { TrainerStatement } from "./commission-statement";
import { commissionPayDate } from "./commission-pay-date";

/**
 * コミッションの支払いが「済んだか」（2026-11-10）。
 *
 * 月末じめ・翌月払い。やることは担当者ごとに2つ：明細を送る → 支払日に振り込む。
 * 代表のダッシュボードの箱と、朝のLINEの知らせが、同じこの形を見る。
 * 画面からも使うので、DBを読むものはここに置かない。
 */

export interface CommissionPayout {
  memberId: string;
  /** 対象月 YYYY-MM */
  month: string;
  statementSentAt?: string;
  paidAt?: string;
}

export type PayoutStep = "statement" | "paid";

/** 箱と知らせに出す1行（担当者1人ぶん） */
export interface PayoutTodo {
  memberId: string;
  memberName: string;
  /** 支払日に振り込む額（前払いの差し引き後） */
  payable: number;
  /** 振り込む日 YYYY-MM-DD */
  payDate: string;
  statementSent: boolean;
  paid: boolean;
}

/** 前の月（YYYY-MM）。コミッションは前の月のぶんを今月払う */
export function previousMonth(ymd: { year: number; month: number }): string {
  const y = ymd.month === 1 ? ymd.year - 1 : ymd.year;
  const m = ymd.month === 1 ? 12 : ymd.month - 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

/**
 * 明細から「やること」の一覧を作る。払う額がある人だけ。支払日の早い順。
 * 明細そのもの（buildTrainerStatements）は代表を含まないので、ここでも出てこない。
 */
export function buildPayoutTodos(
  statements: TrainerStatement[],
  month: string,
  payDays: Record<string, number | undefined>,
  payouts: CommissionPayout[],
): PayoutTodo[] {
  const done = new Map(payouts.filter((p) => p.month === month).map((p) => [p.memberId, p]));
  return statements
    .filter((s) => s.payable > 0 || s.total > 0)
    .map((s) => ({
      memberId: s.memberId,
      memberName: s.memberName,
      payable: s.payable,
      payDate: commissionPayDate(month, payDays[s.memberId]),
      statementSent: !!done.get(s.memberId)?.statementSentAt,
      paid: !!done.get(s.memberId)?.paidAt,
    }))
    .sort((a, b) => a.payDate.localeCompare(b.payDate) || a.memberName.localeCompare(b.memberName, "ja"));
}

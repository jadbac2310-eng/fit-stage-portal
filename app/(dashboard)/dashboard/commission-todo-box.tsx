import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SectionBox } from "@/components/ui/section-box";
import { loadTrainerStatements } from "@/lib/commission-statement-load";
import { getCommissionPayouts } from "@/lib/commission-payouts";
import { buildPayoutTodos, previousMonth } from "@/lib/commission-payouts-types";
import { jstParts } from "@/lib/daily-reminders";
import { CommissionTodoList } from "./commission-todo-list";

/**
 * 代表だけに出す「コミッションの支払い」の箱（2026-11-10）。
 *
 * 先月ぶんの明細を送ったか・振り込んだかを、担当者ごとに印で残す。朝のLINEの知らせもこの印を見る。
 * 金額は、コミッション明細の画面と同じ関数（loadTrainerStatements）で出す。
 * 読み込みが重いので、ダッシュボード本体とは別に読む（代表のときだけ・Suspense の中）。
 * 2026-11-25 尚樹「前月の送れてるかも確認したい」：箱の上の「‹ 9月分」で前の月へ戻れる（?payout=YYYY-MM）。
 * 戻れるのは12か月前まで。先月より先へは進めない（まだ締まっていないため）。
 */
export async function CommissionTodoBox({ month: requested }: { month?: string } = {}) {
  const now = new Date();
  const latest = previousMonth(jstParts(now));
  const oldest = shiftMonth(latest, -11);
  const month = requested && /^\d{4}-\d{2}$/.test(requested) && requested <= latest && requested >= oldest ? requested : latest;
  const prev = month > oldest ? shiftMonth(month, -1) : null;
  const next = month < latest ? shiftMonth(month, 1) : null;
  const [{ statements, members }, payouts] = await Promise.all([loadTrainerStatements(month), getCommissionPayouts(month)]);
  const payDays = Object.fromEntries(members.map((m) => [m.id, m.commissionPayDay]));
  const todos = buildPayoutTodos(statements, month, payDays, payouts.rows);
  const p = jstParts(now);
  const today = `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
  const monthLabel = labelOf(month);

  return (
    <SectionBox
      title={`コミッションの支払い（${monthLabel}）`}
      action={{ label: "明細へ", href: `/commissions/statement?month=${month}` }}
    >
      <nav className="flex items-center gap-2 px-3 py-2 border-b border-[var(--portal-line)] text-xs">
        {prev ? (
          <Link href={hrefOf(prev, latest)} scroll={false} className="flex items-center gap-0.5 text-blue-600 font-semibold">
            <ChevronLeft size={14} /> {labelOf(prev)}
          </Link>
        ) : <span />}
        <span className="mx-auto font-bold text-gray-700">{monthLabel}{month === latest ? "（先月）" : ""}</span>
        {next ? (
          <Link href={hrefOf(next, latest)} scroll={false} className="flex items-center gap-0.5 text-blue-600 font-semibold">
            {labelOf(next)} <ChevronRight size={14} />
          </Link>
        ) : <span />}
      </nav>
      {todos.length === 0 ? (
        <p className="px-3 py-4 text-sm text-gray-500">{monthLabel}に払うコミッションはありません。</p>
      ) : (
        <CommissionTodoList todos={todos} month={month} today={today} ready={payouts.ready} />
      )}
    </SectionBox>
  );
}

/** YYYY-MM を n か月ずらす */
function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** 「10月分」。年が今年でなければ「2025年12月分」 */
function labelOf(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const thisYear = jstParts(new Date()).year;
  return y === thisYear ? `${m}月分` : `${y}年${m}月分`;
}

/** その月を見るダッシュボードのURL（先月なら付けない） */
function hrefOf(month: string, latest: string): string {
  return month === latest ? "/dashboard" : `/dashboard?payout=${month}`;
}

/** 読み込み中の形 */
export function CommissionTodoSkeleton() {
  return (
    <SectionBox title="コミッションの支払い">
      <div className="p-3 space-y-2">
        <div className="h-4 w-40 bg-gray-100 animate-pulse" />
        <div className="h-9 bg-gray-100 animate-pulse" />
        <div className="h-9 bg-gray-100 animate-pulse" />
      </div>
    </SectionBox>
  );
}

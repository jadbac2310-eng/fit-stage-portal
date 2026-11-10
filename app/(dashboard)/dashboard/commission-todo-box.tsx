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
 */
export async function CommissionTodoBox() {
  const now = new Date();
  const month = previousMonth(jstParts(now));
  const [{ statements, members }, payouts] = await Promise.all([loadTrainerStatements(month), getCommissionPayouts(month)]);
  const payDays = Object.fromEntries(members.map((m) => [m.id, m.commissionPayDay]));
  const todos = buildPayoutTodos(statements, month, payDays, payouts.rows);
  const p = jstParts(now);
  const today = `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
  const monthLabel = `${Number(month.split("-")[1])}月分`;

  return (
    <SectionBox
      title={`コミッションの支払い（${monthLabel}）`}
      action={{ label: "明細へ", href: `/commissions/statement?month=${month}` }}
    >
      {todos.length === 0 ? (
        <p className="px-3 py-4 text-sm text-gray-500">{monthLabel}に払うコミッションはありません。</p>
      ) : (
        <CommissionTodoList todos={todos} month={month} today={today} ready={payouts.ready} />
      )}
    </SectionBox>
  );
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

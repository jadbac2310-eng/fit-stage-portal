"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import type { PayoutStep, PayoutTodo } from "@/lib/commission-payouts-types";
import { setCommissionPayoutStepAction } from "./commission-todo-actions";

function yen(n: number) {
  return `¥${n.toLocaleString("ja-JP")}`;
}
function md(ymd: string) {
  const [, m, d] = ymd.split("-");
  return `${Number(m)}/${Number(d)}`;
}

/** 担当者ごとに「明細」「振込」の印を付ける一覧。押したらすぐ見た目を変え、失敗したら戻して理由を出す */
export function CommissionTodoList({ todos, month, today, ready }: {
  todos: PayoutTodo[];
  month: string;
  /** 今日（YYYY-MM-DD・日本時間）。振込日を過ぎたかどうかの色分けに使う */
  today: string;
  /** 記録する表があるか（SQLを流す前は false） */
  ready: boolean;
}) {
  const [rows, setRows] = useState(todos);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const rest = {
    statement: rows.filter((t) => !t.statementSent).length,
    paid: rows.filter((t) => !t.paid).length,
  };
  const allDone = rest.statement === 0 && rest.paid === 0;

  function toggle(t: PayoutTodo, step: PayoutStep) {
    if (!ready) return;
    const done = step === "statement" ? !t.statementSent : !t.paid;
    const apply = (v: boolean) => setRows((prev) => prev.map((r) => r.memberId !== t.memberId ? r
      : step === "statement" ? { ...r, statementSent: v } : { ...r, paid: v }));
    apply(done);
    setError(null);
    start(async () => {
      const res = await setCommissionPayoutStepAction(t.memberId, t.memberName, month, step, done);
      if (!res.ok) { apply(!done); setError(res.error); }
    });
  }

  const total = rows.reduce((s, t) => s + t.payable, 0);

  return (
    <div>
      <p className={cn("px-3 py-2 text-xs font-bold border-b border-[var(--portal-line)]", allDone ? "bg-green-50 text-green-800" : "bg-gold-50 text-gray-800")}>
        {allDone ? "すべて済んでいます" : `残り：明細 ${rest.statement}名 ・ 振込 ${rest.paid}名`}
        <span className="font-normal text-gray-500">　合計 {yen(total)}</span>
      </p>
      {!ready && (
        <p className="px-3 py-2 text-xs text-amber-800 bg-amber-50 border-b border-[var(--portal-line)]">
          印を残す表がまだありません。SQL（20261110000001_commission_payouts.sql）を Supabase で流すと、印を付けられるようになります。
        </p>
      )}
      {error && <p className="px-3 py-2 text-xs text-red-700 bg-red-50 border-b border-[var(--portal-line)]">保存できませんでした：{error}</p>}
      <ul>
        {rows.map((t) => {
          const late = !t.paid && t.payDate < today;
          const isToday = !t.paid && t.payDate === today;
          return (
            <li key={t.memberId} className="flex items-center gap-2 px-3 py-2 border-b border-[var(--portal-line)] last:border-b-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{t.memberName}</p>
                <p className="text-xs text-gray-500 flex flex-wrap gap-x-2">
                  <span className="font-semibold text-gray-800 tabular-nums">{yen(t.payable)}</span>
                  <span className={cn("whitespace-nowrap", late ? "text-red-600 font-bold" : isToday ? "text-gold-600 font-bold" : "")}>
                    振込 {md(t.payDate)}{late ? "（過ぎた）" : isToday ? "（今日）" : ""}
                  </span>
                </p>
              </div>
              <StepButton label="明細" done={t.statementSent} disabled={!ready} onClick={() => toggle(t, "statement")} />
              <StepButton label="振込" done={t.paid} disabled={!ready} onClick={() => toggle(t, "paid")} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StepButton({ label, done, disabled, onClick }: { label: string; done: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button" onClick={onClick} disabled={disabled} aria-pressed={done}
      className={cn(
        "flex-shrink-0 inline-flex items-center gap-1 border px-2.5 py-1.5 text-xs font-bold transition disabled:opacity-50",
        done ? "bg-navy-900 border-[var(--portal-navy)] text-white" : "bg-white border-gray-300 text-gray-500 active:bg-gray-100",
      )}
    >
      <span className={cn("w-3.5 h-3.5 inline-flex items-center justify-center border", done ? "bg-gold-500 border-[var(--portal-gold)]" : "border-gray-300 bg-white")}>
        {done && <Check size={11} className="text-white" strokeWidth={3} />}
      </span>
      {label}{done ? "済" : ""}
    </button>
  );
}

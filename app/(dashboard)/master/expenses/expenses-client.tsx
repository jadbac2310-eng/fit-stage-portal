"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X, Receipt, StickyNote } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useSubmitLock } from "@/lib/use-submit-lock";
import { EXPENSE_CATEGORIES, expensesInMonth, type Expense } from "@/lib/expenses-types";
import { assertActionOk } from "@/lib/action-result";
import { createExpenseAction, updateExpenseAction, deleteExpenseAction } from "./actions";

function yen(n: number) {
  return `¥${n.toLocaleString("ja-JP")}`;
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function currentMonth(): string {
  return today().slice(0, 7);
}

/** 直近12か月の選択肢 */
function monthOptions(): { value: string; label: string }[] {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: `${d.getFullYear()}年${d.getMonth() + 1}月`,
    };
  });
}

function mdLabel(ymd: string): string {
  const [, m, d] = ymd.split("-");
  return `${Number(m)}/${Number(d)}`;
}

function ExpenseForm({
  defaultValues, month, onClose, action, submitLabel,
}: {
  defaultValues?: Partial<Expense>;
  month?: string;
  onClose: () => void;
  action: (fd: FormData) => Promise<{ ok: true } | { ok: false; error: string }>;
  submitLabel: string;
}) {
  const router = useRouter();
  const { locked: loading, run } = useSubmitLock();
  const [error, setError] = useState("");

  async function handleSubmit(fd: FormData) {
    setError("");
    await run(async () => {
      try { assertActionOk(await action(fd)); router.refresh(); onClose(); }
      catch (e) { setError(e instanceof Error ? e.message : "エラー"); }
    });
  }

  const inputClass = "w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelClass = "text-xs font-semibold text-gray-600 mb-1.5 block";

  // 新規追加のときは、一覧で選んでいる月の1日を初期値にしておく
  const defaultDate = defaultValues?.incurredOn
    ?? (month && month !== currentMonth() ? `${month}-01` : today());

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass}>日付 <span className="text-red-500">*</span></label>
        <input name="incurredOn" type="date" required defaultValue={defaultDate} className={inputClass} />
        <p className="text-xs text-gray-400 mt-1">この日付の月の経費として集計されます</p>
      </div>
      <div>
        <label className={labelClass}>区分</label>
        <select name="category" defaultValue={defaultValues?.category ?? "その他"} className={inputClass}>
          {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className={labelClass}>内容 <span className="text-red-500">*</span></label>
        <input name="title" required autoFocus defaultValue={defaultValues?.title} placeholder="例: 江坂店 家賃" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>金額（円） <span className="text-red-500">*</span></label>
        <input name="amount" type="number" min="0" step="1" required defaultValue={defaultValues?.amount ?? ""} placeholder="例: 80000" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>メモ</label>
        <input name="note" defaultValue={defaultValues?.note} placeholder="任意" className={inputClass} />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">キャンセル</button>
        <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold transition flex items-center justify-center gap-2">
          {loading && <Spinner size={14} />}{loading ? "保存中..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

function ExpenseRow({ expense, isAdmin }: { expense: Expense; isAdmin: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "edit">("view");
  const { locked: deleting, run: runDelete } = useSubmitLock();
  const boundUpdate = updateExpenseAction.bind(null, expense.id);

  function handleDelete() {
    if (deleting) return;
    if (!confirm(`「${expense.title}」を削除しますか？`)) return;
    runDelete(async () => {
      try {
        assertActionOk(await deleteExpenseAction(expense.id));
        router.refresh();
      } catch (e) {
        alert(e instanceof Error ? e.message : "削除に失敗しました");
      }
    });
  }

  if (mode === "edit") {
    return (
      <div className="bg-white rounded-2xl border-2 border-blue-400 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-gray-900">経費を編集</p>
          <button onClick={() => setMode("view")} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <ExpenseForm defaultValues={expense} onClose={() => setMode("view")} action={boundUpdate} submitLabel="保存する" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-start gap-3">
      <div className="w-12 flex-shrink-0 text-center">
        <p className="text-xs font-bold text-gray-500 tabular-nums">{mdLabel(expense.incurredOn)}</p>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
            {expense.category}
          </span>
          <p className="text-sm font-bold text-gray-900 truncate">{expense.title}</p>
        </div>
        {expense.note && (
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
            <StickyNote size={11} className="flex-shrink-0" />{expense.note}
          </p>
        )}
      </div>
      <p className="text-sm font-bold text-rose-600 tabular-nums flex-shrink-0">{yen(expense.amount)}</p>
      {isAdmin && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => setMode("edit")} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><Pencil size={13} /></button>
          <button onClick={handleDelete} disabled={deleting} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50">
            {deleting ? <Spinner size={13} /> : <Trash2 size={13} />}
          </button>
        </div>
      )}
    </div>
  );
}

export function ExpensesClient({ expenses, isAdmin }: { expenses: Expense[]; isAdmin: boolean }) {
  const [showAdd, setShowAdd] = useState(false);
  const [month, setMonth] = useState(currentMonth);
  const options = useMemo(() => monthOptions(), []);

  const rows  = useMemo(() => expensesInMonth(expenses, month), [expenses, month]);
  const total = useMemo(() => rows.reduce((s, e) => s + e.amount, 0), [rows]);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto pb-10">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Receipt size={20} className="text-slate-600" />
            <h1 className="text-xl font-bold text-gray-900">経費マスタ</h1>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">家賃・広告費など、レッスンに紐づかない支出</p>
        </div>
        {isAdmin && !showAdd && (
          <button onClick={() => setShowAdd(true)} className="flex-shrink-0 inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3.5 py-2 rounded-xl transition">
            <Plus size={16} /> 追加
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm font-semibold text-gray-600">対象月</label>
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="px-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="text-sm text-gray-500 ml-auto">
          {rows.length}件 ・ 合計 <span className="font-bold text-rose-600">{yen(total)}</span>
        </span>
      </div>

      {showAdd && (
        <div className="bg-white rounded-2xl border-2 border-blue-400 p-5 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-900">新しい経費</p>
            <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <ExpenseForm month={month} onClose={() => setShowAdd(false)} action={createExpenseAction} submitLabel="追加する" />
        </div>
      )}

      {rows.length === 0 && !showAdd ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🧾</p>
          <p className="text-sm font-semibold text-gray-600">この月の経費はありません</p>
          <p className="text-xs text-gray-400 mt-1">ここに登録した金額が、経営ダッシュボードの利益から差し引かれます</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((e) => <ExpenseRow key={e.id} expense={e} isAdmin={isAdmin} />)}
        </div>
      )}
    </div>
  );
}

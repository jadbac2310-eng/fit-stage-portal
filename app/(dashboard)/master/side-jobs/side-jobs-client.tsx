"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X, Hammer, StickyNote } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useSubmitLock } from "@/lib/use-submit-lock";
import { SIDE_JOB_TITLES, SIDE_JOB_VENDORS, sideJobsInMonth, type SideJob } from "@/lib/side-jobs-types";
import { assertActionOk } from "@/lib/action-result";
import { createSideJobAction, updateSideJobAction, deleteSideJobAction } from "./actions";

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

function SideJobForm({
  defaultValues, month, onClose, action, submitLabel,
}: {
  defaultValues?: Partial<SideJob>;
  month?: string;
  onClose: () => void;
  action: (fd: FormData) => Promise<{ ok: true } | { ok: false; error: string }>;
  submitLabel: string;
}) {
  const router = useRouter();
  const { locked: loading, run } = useSubmitLock();
  const [error, setError] = useState("");
  const [amount, setAmount] = useState<string>(defaultValues?.amount != null ? String(defaultValues.amount) : "");
  const [cost, setCost] = useState<string>(defaultValues?.cost != null ? String(defaultValues.cost) : "");
  const profit = (parseInt(amount || "0", 10) || 0) - (parseInt(cost || "0", 10) || 0);

  async function handleSubmit(fd: FormData) {
    setError("");
    await run(async () => {
      try { assertActionOk(await action(fd)); router.refresh(); onClose(); }
      catch (e) { setError(e instanceof Error ? e.message : "エラー"); }
    });
  }

  const inputClass = "w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelClass = "text-xs font-semibold text-gray-600 mb-1.5 block";
  const defaultDate = defaultValues?.doneOn ?? (month && month !== currentMonth() ? `${month}-01` : today());

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass}>日付 <span className="text-red-500">*</span></label>
        <input name="doneOn" type="date" required defaultValue={defaultDate} className={inputClass} />
        <p className="text-xs text-gray-400 mt-1">この日付の月の売上として集計されます（設置日・納品日など）</p>
      </div>
      <div>
        <label className={labelClass}>内容 <span className="text-red-500">*</span></label>
        <input name="title" required autoFocus list="side-job-titles" defaultValue={defaultValues?.title} placeholder="例: マシン設置" className={inputClass} />
        <datalist id="side-job-titles">{SIDE_JOB_TITLES.map((t) => <option key={t} value={t} />)}</datalist>
      </div>
      <div>
        <label className={labelClass}>依頼主</label>
        <input name="client" defaultValue={defaultValues?.client} placeholder="例: ○○株式会社／山田様" className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>いただいた金額（税込） <span className="text-red-500">*</span></label>
          <input name="amount" type="number" min="0" step="1" required inputMode="numeric" value={amount}
            onChange={(e) => setAmount(e.target.value)} placeholder="70000" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>外注費（税込）</label>
          <input name="cost" type="number" min="0" step="1" inputMode="numeric" value={cost}
            onChange={(e) => setCost(e.target.value)} placeholder="50000" className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>外注先</label>
        <input name="vendor" list="side-job-vendors" defaultValue={defaultValues?.vendor} placeholder="例: アヴニール" className={inputClass} />
        <datalist id="side-job-vendors">{SIDE_JOB_VENDORS.map((v) => <option key={v} value={v} />)}</datalist>
      </div>
      <p className="text-sm text-gray-600">
        差額（会社の取り分）：<span className={profit >= 0 ? "font-bold text-emerald-600" : "font-bold text-rose-600"}>{yen(profit)}</span>
      </p>
      <div>
        <label className={labelClass}>メモ</label>
        <input name="note" defaultValue={defaultValues?.note} placeholder="任意（入金日・機種など）" className={inputClass} />
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

function SideJobRow({ job }: { job: SideJob }) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "edit">("view");
  const { locked: deleting, run: runDelete } = useSubmitLock();
  const boundUpdate = updateSideJobAction.bind(null, job.id);

  function handleDelete() {
    if (deleting) return;
    if (!confirm(`「${job.title}」を削除しますか？`)) return;
    runDelete(async () => {
      try { assertActionOk(await deleteSideJobAction(job.id)); router.refresh(); }
      catch (e) { alert(e instanceof Error ? e.message : "削除に失敗しました"); }
    });
  }

  if (mode === "edit") {
    return (
      <div className="bg-white rounded-2xl border-2 border-blue-400 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-gray-900">単発の仕事を編集</p>
          <button onClick={() => setMode("view")} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <SideJobForm defaultValues={job} onClose={() => setMode("view")} action={boundUpdate} submitLabel="保存する" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-start gap-3">
      <div className="w-12 flex-shrink-0 text-center">
        <p className="text-xs font-bold text-gray-500 tabular-nums">{mdLabel(job.doneOn)}</p>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900">{job.title}{job.client && <span className="font-normal text-gray-500">　{job.client}</span>}</p>
        <p className="text-xs text-gray-500 mt-1 tabular-nums">
          売上 {yen(job.amount)}　−　外注 {yen(job.cost)}{job.vendor ? `（${job.vendor}）` : ""}
        </p>
        {job.note && (
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><StickyNote size={11} className="flex-shrink-0" />{job.note}</p>
        )}
      </div>
      <p className="text-sm font-bold text-emerald-600 tabular-nums flex-shrink-0">{yen(job.amount - job.cost)}</p>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={() => setMode("edit")} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><Pencil size={13} /></button>
        <button onClick={handleDelete} disabled={deleting} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50">
          {deleting ? <Spinner size={13} /> : <Trash2 size={13} />}
        </button>
      </div>
    </div>
  );
}

export function SideJobsClient({ jobs }: { jobs: SideJob[] }) {
  const [showAdd, setShowAdd] = useState(false);
  const [month, setMonth] = useState(currentMonth);
  const options = useMemo(() => monthOptions(), []);
  const rows = useMemo(() => sideJobsInMonth(jobs, month), [jobs, month]);
  const totals = useMemo(() => rows.reduce((s, j) => ({ amount: s.amount + j.amount, cost: s.cost + j.cost }), { amount: 0, cost: 0 }), [rows]);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto pb-10">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Hammer size={20} className="text-amber-600" />
            <h1 className="text-xl font-bold text-gray-900">単発の仕事</h1>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">マシン設置など、レッスン以外の請負。売上と外注費が経営サマリーに入ります</p>
        </div>
        {!showAdd && (
          <button onClick={() => setShowAdd(true)} className="flex-shrink-0 inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3.5 py-2 rounded-xl transition">
            <Plus size={16} /> 追加
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <label className="text-sm font-semibold text-gray-600">対象月</label>
        <select value={month} onChange={(e) => setMonth(e.target.value)}
          className="px-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="text-xs text-gray-500 ml-auto tabular-nums">
          {rows.length}件・売上 {yen(totals.amount)}・外注 {yen(totals.cost)}・差額 <span className="font-bold text-emerald-600">{yen(totals.amount - totals.cost)}</span>
        </span>
      </div>

      {showAdd && (
        <div className="bg-white rounded-2xl border-2 border-blue-400 p-5 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-900">新しい単発の仕事</p>
            <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <SideJobForm month={month} onClose={() => setShowAdd(false)} action={createSideJobAction} submitLabel="追加する" />
        </div>
      )}

      {rows.length === 0 && !showAdd ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🛠️</p>
          <p className="text-sm font-semibold text-gray-600">この月の単発の仕事はありません</p>
          <p className="text-xs text-gray-400 mt-1">いただいた金額が売上に、外注費が利益から差し引かれます</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((j) => <SideJobRow key={j.id} job={j} />)}
        </div>
      )}
    </div>
  );
}

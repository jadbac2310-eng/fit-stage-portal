"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X, Repeat } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useSubmitLock } from "@/lib/use-submit-lock";
import { assertActionOk, type ActionResult } from "@/lib/action-result";
import type { CustomerMonthlyItem } from "@/lib/customer-monthly-items-types";
import { createMonthlyItemAction, updateMonthlyItemAction, deleteMonthlyItemAction } from "./actions";

type CustomerOpt = { id: string; name: string };

function yen(n: number) {
  return `¥${n.toLocaleString("ja-JP")}`;
}

/** 「2026年4月から」「〜2027年3月まで」のような期間の説明 */
function periodLabel(item: CustomerMonthlyItem): string | null {
  const fmt = (d: string) => `${d.slice(0, 4)}/${d.slice(5, 7)}/${d.slice(8, 10)}`;
  if (item.startedOn && item.endedOn) return `${fmt(item.startedOn)} 〜 ${fmt(item.endedOn)}`;
  if (item.startedOn) return `${fmt(item.startedOn)} 〜`;
  if (item.endedOn)   return `〜 ${fmt(item.endedOn)}`;
  return null;
}

const inputClass = "w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const labelClass = "text-xs font-semibold text-gray-600 mb-1.5 block";

function ItemForm({
  defaultValues, onClose, action, submitLabel,
}: {
  defaultValues?: Partial<CustomerMonthlyItem>;
  onClose: () => void;
  action: (fd: FormData) => Promise<ActionResult>;
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

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass}>項目名 <span className="text-red-500">*</span></label>
        <input name="name" required autoFocus defaultValue={defaultValues?.name}
          placeholder="ホームページ運用代行" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>金額（税込・毎月） <span className="text-red-500">*</span></label>
        <input name="amount" type="number" min="0" step="1" required
          defaultValue={defaultValues?.amount ?? ""} placeholder="例: 5500" className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass}>開始日</label>
          <input name="startedOn" type="date" defaultValue={defaultValues?.startedOn ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>終了日</label>
          <input name="endedOn" type="date" defaultValue={defaultValues?.endedOn ?? ""} className={inputClass} />
        </div>
      </div>
      <p className="text-xs text-gray-400">
        日付は未入力でもかまいません。開始日が空なら過去の月にも載り、終了日が空なら解約するまで毎月載ります。
      </p>

      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
          キャンセル
        </button>
        <button type="submit" disabled={loading}
          className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold transition flex items-center justify-center gap-2">
          {loading && <Spinner size={14} />}{loading ? "保存中..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

function ItemRow({ item, customerName }: { item: CustomerMonthlyItem; customerName: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const { locked: deleting, run: runDelete } = useSubmitLock();
  const boundUpdate = updateMonthlyItemAction.bind(null, item.id);

  if (editing) {
    return (
      <div className="bg-white rounded-2xl border border-blue-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-gray-900">項目を編集</p>
          <button onClick={() => setEditing(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <ItemForm defaultValues={item} onClose={() => setEditing(false)} action={boundUpdate} submitLabel="保存する" />
      </div>
    );
  }

  const period = periodLabel(item);
  return (
    <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
        <p className="text-xs text-gray-500 mt-0.5 truncate">
          {customerName}{period ? ` ／ ${period}` : ""}
        </p>
      </div>
      <span className="text-base font-bold text-blue-600 whitespace-nowrap">{yen(item.amount)}</span>
      <button onClick={() => setEditing(true)}
        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
        <Pencil size={15} />
      </button>
      <button
        onClick={() => {
          if (deleting) return;
          if (!confirm(`「${item.name}」を削除しますか？`)) return;
          runDelete(async () => {
            try { assertActionOk(await deleteMonthlyItemAction(item.id)); router.refresh(); }
            catch (e) { alert(e instanceof Error ? e.message : "削除に失敗しました"); }
          });
        }}
        disabled={deleting}
        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
      >
        {deleting ? <Spinner size={15} /> : <Trash2 size={15} />}
      </button>
    </div>
  );
}

export function MonthlyItemsClient({
  items, customers, isAdmin,
}: {
  items: CustomerMonthlyItem[];
  customers: CustomerOpt[];
  isAdmin: boolean;
}) {
  const [customerId, setCustomerId] = useState("");
  const [adding, setAdding] = useState(false);

  const customerMap = useMemo(() => new Map(customers.map((c) => [c.id, c.name])), [customers]);
  const shown = useMemo(
    () => (customerId ? items.filter((i) => i.customerId === customerId) : items),
    [items, customerId],
  );

  const boundCreate = createMonthlyItemAction.bind(null, customerId);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Repeat size={20} className="text-violet-600" /> 毎月の請求項目
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          レッスン料とは別に毎月つける項目（ホームページ運用代行など）。同じ請求書にまとめて載ります。
        </p>
      </div>

      <div className="mb-4">
        <label className={labelClass}>顧客で絞り込む</label>
        <select value={customerId} onChange={(e) => { setCustomerId(e.target.value); setAdding(false); }} className={inputClass}>
          <option value="">すべての顧客</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {isAdmin && (
        adding ? (
          <div className="bg-white rounded-2xl border border-blue-200 p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-gray-900">{customerMap.get(customerId)} の新しい項目</p>
              <button onClick={() => setAdding(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            <ItemForm onClose={() => setAdding(false)} action={boundCreate} submitLabel="追加する" />
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            disabled={!customerId}
            title={customerId ? undefined : "先に顧客を選んでください"}
            className="w-full mb-4 inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 rounded-xl py-2.5 transition"
          >
            <Plus size={16} /> {customerId ? "この顧客に項目を追加" : "顧客を選ぶと追加できます"}
          </button>
        )
      )}

      {shown.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10 bg-white rounded-2xl border border-gray-200">
          項目がまだありません
        </p>
      ) : (
        <div className="space-y-2">
          {shown.map((i) => (
            <ItemRow key={i.id} item={i} customerName={customerMap.get(i.customerId) ?? "（削除済み）"} />
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import {
  Plus, Pencil, Trash2, X, Search,
  ChevronDown, ChevronUp, CalendarRange,
} from "lucide-react";
import { CustomerPlanRecord, ContractPlan, CONTRACT_PLAN_LABEL } from "@/lib/customer-plans-types";
import { Customer } from "@/lib/customers-types";
import { createPlanAction, updatePlanAction, deletePlanAction } from "./actions";
import { cn } from "@/lib/cn";
import { Spinner } from "@/components/ui/spinner";

// ─── バッジ ───────────────────────────────────────────
function PlanBadge({ plan }: { plan: ContractPlan }) {
  const colors: Record<ContractPlan, string> = {
    "月2回":  "bg-sky-100 text-sky-700",
    "月4回":  "bg-blue-100 text-blue-700",
    "月8回":  "bg-indigo-100 text-indigo-700",
    "都度払い": "bg-amber-100 text-amber-700",
    "回数券":  "bg-orange-100 text-orange-700",
  };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", colors[plan])}>
      {CONTRACT_PLAN_LABEL[plan]}
    </span>
  );
}

function StatusLabel({ startedAt, endedAt }: { startedAt: string; endedAt?: string }) {
  const today = new Date().toISOString().slice(0, 10);
  if (endedAt && endedAt < today) return <span className="text-xs text-gray-400">終了</span>;
  if (startedAt > today)          return <span className="text-xs text-blue-500 font-medium">開始前</span>;
  return <span className="text-xs text-green-600 font-medium">適用中</span>;
}

// ─── プランフォーム ───────────────────────────────────
function PlanForm({
  defaultValues, fixedCustomerId, customers, onClose, action, submitLabel,
}: {
  defaultValues?: Partial<CustomerPlanRecord>;
  fixedCustomerId?: string;
  customers: Customer[];
  onClose: () => void;
  action: (fd: FormData) => Promise<void>;
  submitLabel: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(fd: FormData) {
    setError(""); setLoading(true);
    try { await action(fd); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : "エラーが発生しました"); setLoading(false); }
  }

  const inputClass = "w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelClass = "text-xs font-semibold text-gray-600 mb-1.5 block";

  return (
    <form action={handleSubmit} className="space-y-4">
      {fixedCustomerId ? (
        <input type="hidden" name="customerId" value={fixedCustomerId} />
      ) : (
        <div>
          <label className={labelClass}>顧客 <span className="text-red-500">*</span></label>
          <select name="customerId" required defaultValue={defaultValues?.customerId ?? ""} className={inputClass}>
            <option value="">顧客を選択...</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
          </select>
        </div>
      )}

      <div>
        <label className={labelClass}>プラン <span className="text-red-500">*</span></label>
        <select name="plan" required defaultValue={defaultValues?.plan ?? ""} className={inputClass}>
          <option value="">選択...</option>
          <optgroup label="月額">
            <option value="月2回">月2回</option>
            <option value="月4回">月4回</option>
            <option value="月8回">月8回</option>
          </optgroup>
          <optgroup label="その他">
            <option value="都度払い">都度払い</option>
            <option value="回数券">回数券</option>
          </optgroup>
        </select>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className={labelClass}>適用開始日 <span className="text-red-500">*</span></label>
          <input name="startedAt" type="date" required defaultValue={defaultValues?.startedAt} className={inputClass} />
        </div>
        <div className="flex-1">
          <label className={labelClass}>適用終了日</label>
          <input name="endedAt" type="date" defaultValue={defaultValues?.endedAt} className={inputClass} />
          <p className="text-xs text-gray-400 mt-1">空白 = 現在も継続中</p>
        </div>
      </div>

      <div>
        <label className={labelClass}>メモ</label>
        <input name="note" defaultValue={defaultValues?.note} placeholder="備考など" className={inputClass} />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

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

// ─── プラン1件 ────────────────────────────────────────
function PlanItem({ record, customer, customers, isAdmin }: {
  record: CustomerPlanRecord; customer: Customer; customers: Customer[]; isAdmin: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const boundUpdate = updatePlanAction.bind(null, record.id, customer.id);

  if (editing) return (
    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 my-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-gray-700">プランを編集</p>
        <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
      </div>
      <PlanForm defaultValues={record} fixedCustomerId={customer.id} customers={customers}
        onClose={() => setEditing(false)} action={boundUpdate} submitLabel="保存する" />
    </div>
  );

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <PlanBadge plan={record.plan} />
          <StatusLabel startedAt={record.startedAt} endedAt={record.endedAt} />
        </div>
        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
          <CalendarRange size={10} className="flex-shrink-0" />
          {record.startedAt} ～ {record.endedAt ?? "現在"}
        </p>
        {record.note && <p className="text-xs text-gray-400 mt-0.5">{record.note}</p>}
      </div>
      {isAdmin && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => setEditing(true)}
            className="p-1.5 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
            <Pencil size={12} />
          </button>
          <button onClick={async () => {
            if (!confirm("このプランを削除しますか？")) return;
            setDeleting(true);
            await deletePlanAction(record.id);
          }} disabled={deleting}
            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50">
            {deleting ? <Spinner size={12} /> : <Trash2 size={12} />}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── 顧客グループ ─────────────────────────────────────
function CustomerGroup({ customer, plans, customers, isAdmin }: {
  customer: Customer; plans: CustomerPlanRecord[]; customers: Customer[]; isAdmin: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const activePlan = plans.find((p) => p.startedAt <= today && (!p.endedAt || p.endedAt >= today));

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition text-left">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-gray-900">{customer.fullName}</p>
            {activePlan
              ? <PlanBadge plan={activePlan.plan} />
              : <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">プランなし</span>
            }
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{plans.length}件のプラン履歴</p>
        </div>
        <div className="flex-shrink-0 text-gray-400">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4">
          {plans.length === 0 && !showAdd ? (
            <p className="py-3 text-xs text-gray-400">プラン履歴なし</p>
          ) : (
            plans.map((p) => (
              <PlanItem key={p.id} record={p} customer={customer} customers={customers} isAdmin={isAdmin} />
            ))
          )}

          {showAdd ? (
            <div className="py-3">
              <PlanForm fixedCustomerId={customer.id} customers={customers}
                onClose={() => setShowAdd(false)} action={createPlanAction} submitLabel="追加する" />
            </div>
          ) : (
            isAdmin && (
              <div className="py-3">
                <button onClick={() => setShowAdd(true)}
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium">
                  <Plus size={13} /> プランを追加
                </button>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

// ─── メインコンポーネント ─────────────────────────────
export function PlansClient({ customers, plans, isAdmin }: {
  customers: Customer[]; plans: CustomerPlanRecord[]; isAdmin: boolean;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");

  const grouped = useMemo(() => {
    const plansByCustomer = new Map<string, CustomerPlanRecord[]>();
    plans.forEach((p) => {
      if (!plansByCustomer.has(p.customerId)) plansByCustomer.set(p.customerId, []);
      plansByCustomer.get(p.customerId)!.push(p);
    });
    return customers.map((c) => ({
      customer: c,
      plans: (plansByCustomer.get(c.id) ?? []).sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    }));
  }, [customers, plans]);

  const filtered = grouped.filter(({ customer }) => {
    const q = search.toLowerCase();
    return !q || customer.fullName.toLowerCase().includes(q) || (customer.email ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-4 hidden md:flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">プラン管理</h1>
          <p className="text-sm text-gray-500 mt-0.5">{customers.length}名</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition">
            <Plus size={16} /> プランを追加
          </button>
        )}
      </div>

      <div className="md:hidden mb-4">
        <h1 className="text-lg font-bold text-gray-900">プラン管理</h1>
      </div>

      <div className="mb-4 relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="顧客名で検索..."
          className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {showAdd && (
        <div className="hidden md:block bg-white rounded-2xl border-2 border-blue-400 p-5 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-900">プランを追加</p>
            <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <PlanForm customers={customers} onClose={() => setShowAdd(false)}
            action={createPlanAction} submitLabel="追加する" />
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(({ customer, plans: ps }) => (
          <CustomerGroup key={customer.id} customer={customer} plans={ps}
            customers={customers} isAdmin={isAdmin} />
        ))}
      </div>

      {isAdmin && (
        <button onClick={() => setShowAdd(true)}
          className="md:hidden fixed bottom-6 right-4 w-14 h-14 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-full shadow-lg shadow-blue-200 flex items-center justify-center transition z-30"
          aria-label="プランを追加">
          <Plus size={26} />
        </button>
      )}
    </div>
  );
}

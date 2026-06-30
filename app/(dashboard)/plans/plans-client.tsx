"use client";

import { useState, useMemo } from "react";
import {
  Plus, Pencil, Trash2, X, Search,
  ChevronDown, ChevronUp, CalendarRange, Ticket,
} from "lucide-react";
import { CustomerPlanRecord, ContractPlan, CONTRACT_PLAN_LABEL } from "@/lib/customer-plans-types";
import { Customer } from "@/lib/customers-types";
import { SessionPass } from "@/lib/session-passes-types";
import {
  createPlanAction, updatePlanAction, deletePlanAction,
  createSessionPassAction, updateSessionPassAction, deleteSessionPassAction,
} from "./actions";
import { cn } from "@/lib/cn";
import { Spinner } from "@/components/ui/spinner";
import { AuthorStamp } from "@/components/ui/author-stamp";
import { useSubmitLock } from "@/lib/use-submit-lock";

type MemberNames = Record<string, string>;
// プラン選択時の標準金額（プランマスタ由来）
type PlanDefault = { name: string; amount: number };
// 回数券の標準金額 { 人数: { 回数: 金額 } }（プランマスタ由来）
type SessionPassPriceMap = Record<number, Record<number, number>>;

// ─── バッジ ───────────────────────────────────────────
function PlanBadge({ plan }: { plan: ContractPlan }) {
  const colors: Record<ContractPlan, string> = {
    "月2回": "bg-sky-100 text-sky-700",
    "月4回": "bg-blue-100 text-blue-700",
    "月8回": "bg-indigo-100 text-indigo-700",
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
  defaultValues, fixedCustomerId, customers, planDefaults, onClose, action, submitLabel,
}: {
  defaultValues?: Partial<CustomerPlanRecord>;
  fixedCustomerId?: string;
  customers: Customer[];
  planDefaults: PlanDefault[];
  onClose: () => void;
  action: (fd: FormData) => Promise<void>;
  submitLabel: string;
}) {
  const { locked: loading, run } = useSubmitLock();
  const [error, setError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(defaultValues?.plan ?? "");
  const [price, setPrice] = useState(defaultValues?.price?.toString() ?? "");

  async function handleSubmit(fd: FormData) {
    await run(async () => {
      setError("");
      try { await action(fd); onClose(); }
      catch (e) { setError(e instanceof Error ? e.message : "エラーが発生しました"); }
    });
  }

  const inputClass = "w-full min-w-0 max-w-full box-border px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
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
        <select
          name="plan"
          required
          value={selectedPlan}
          onChange={(e) => {
            const plan = e.target.value;
            setSelectedPlan(plan);
            const def = planDefaults.find((d) => d.name === plan);
            if (def) setPrice(String(def.amount));
          }}
          className={inputClass}
        >
          <option value="">選択...</option>
          {planDefaults.map((d) => (
            <option key={d.name} value={d.name}>{d.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>金額（月額・税込）</label>
        <input
          name="price"
          type="number"
          min="0"
          step="1"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="例: 36400"
          className={inputClass}
        />
        <p className="text-xs text-gray-400 mt-1">単価は「金額 ÷ 月回数」で売上計算に使われます</p>
      </div>

      <div>
        <label className={labelClass}>購入日</label>
        <input name="purchasedAt" type="date" defaultValue={defaultValues?.purchasedAt ?? defaultValues?.startedAt} className={inputClass} />
        <p className="text-xs text-gray-400 mt-1">この月の請求書に計上されます（空欄なら適用開始日）</p>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 min-w-0">
          <label className={labelClass}>適用開始日 <span className="text-red-500">*</span></label>
          <input name="startedAt" type="date" required defaultValue={defaultValues?.startedAt} className={inputClass} />
        </div>
        <div className="flex-1 min-w-0">
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
function PlanItem({ record, customer, customers, planDefaults, isAdmin, memberNames }: {
  record: CustomerPlanRecord; customer: Customer; customers: Customer[];
  planDefaults: PlanDefault[]; isAdmin: boolean; memberNames: MemberNames;
}) {
  const [editing, setEditing] = useState(false);
  const { locked: deleting, run: runDelete } = useSubmitLock();
  const boundUpdate = updatePlanAction.bind(null, record.id, customer.id);

  if (editing) return (
    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 my-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-gray-700">プランを編集</p>
        <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
      </div>
      <PlanForm defaultValues={record} fixedCustomerId={customer.id} customers={customers} planDefaults={planDefaults}
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
        <AuthorStamp
          createdByName={record.createdById ? memberNames[record.createdById] : undefined}
          createdAt={record.createdAt}
          updatedByName={record.updatedById ? memberNames[record.updatedById] : undefined}
          updatedAt={record.updatedAt}
          className="mt-1"
        />
      </div>
      {isAdmin && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => setEditing(true)}
            className="p-1.5 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
            <Pencil size={12} />
          </button>
          <button onClick={() => {
            if (deleting) return;
            if (!confirm("このプランを削除しますか？")) return;
            runDelete(() => deletePlanAction(record.id));
          }} disabled={deleting}
            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50">
            {deleting ? <Spinner size={12} /> : <Trash2 size={12} />}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── 回数券フォーム ───────────────────────────────────
function SessionPassForm({
  customerId, sessionPassPriceMap, onClose,
}: {
  customerId: string;
  sessionPassPriceMap: SessionPassPriceMap;
  onClose: () => void;
}) {
  const { locked: loading, run } = useSubmitLock();
  const [personCount, setPersonCount] = useState(1);
  const [totalCount, setTotalCount] = useState("");
  const [price, setPrice] = useState("");

  function autoFillPrice(persons: number, count: string) {
    const n = parseInt(count, 10);
    const defaultPrice = sessionPassPriceMap[persons]?.[n];
    if (defaultPrice && !price) setPrice(String(defaultPrice));
  }

  async function handleSubmit(fd: FormData) {
    await run(async () => {
      await createSessionPassAction(fd);
      onClose();
    });
  }

  const inputClass = "w-full min-w-0 max-w-full box-border px-3 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500";

  return (
    <form action={handleSubmit} className="bg-amber-50 rounded-xl p-3 border border-amber-200 space-y-2">
      <input type="hidden" name="customerId" value={customerId} />
      <input type="hidden" name="personCount" value={personCount} />

      <div>
        <p className="text-xs font-medium text-gray-600 mb-1">人数</p>
        <div className="flex gap-2">
          {[1, 2].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => {
                setPersonCount(n);
                const cnt = parseInt(totalCount, 10);
                const defaultPrice = sessionPassPriceMap[n]?.[cnt];
                if (defaultPrice) setPrice(String(defaultPrice));
              }}
              className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition ${
                personCount === n
                  ? "bg-amber-500 border-amber-500 text-white"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {n}名様
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-600 mb-1">回数</p>
          <input
            name="totalCount"
            type="number"
            min="1"
            required
            placeholder="回数"
            value={totalCount}
            onChange={(e) => {
              setTotalCount(e.target.value);
              autoFillPrice(personCount, e.target.value);
            }}
            className={inputClass}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-600 mb-1">金額（税込）</p>
          <input
            name="price"
            type="number"
            min="0"
            step="1"
            placeholder="例: 76800"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
      <p className="text-[11px] text-gray-400 -mt-1">単価は「金額 ÷ 回数」で売上計算に使われます</p>
      <div>
        <p className="text-xs font-medium text-gray-600 mb-1">購入日</p>
        <input name="purchasedAt" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className={inputClass} />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-600 mb-1">有効期限（任意）</p>
        <input name="expiredAt" type="date" className={inputClass} />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-600 mb-1">メモ</p>
        <input name="note" placeholder="備考など" className={inputClass} />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onClose}
          className="flex-1 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50">
          キャンセル
        </button>
        <button type="submit" disabled={loading}
          className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-xs font-semibold flex items-center justify-center gap-1">
          {loading && <Spinner size={12} />}{loading ? "追加中..." : "回数券を追加"}
        </button>
      </div>
    </form>
  );
}

// ─── 回数券1件 ───────────────────────────────────────
function SessionPassItem({ pass, sessionPassPriceMap, isAdmin, memberNames }: {
  pass: SessionPass; sessionPassPriceMap: SessionPassPriceMap; isAdmin: boolean; memberNames: MemberNames;
}) {
  const [editing, setEditing] = useState(false);
  const { locked: deleting, run: runDelete } = useSubmitLock();
  const { locked: loading, run } = useSubmitLock();
  const [personCount, setPersonCount] = useState(pass.personCount ?? 1);
  const [totalCount, setTotalCount] = useState(String(pass.totalCount));
  const [price, setPrice] = useState(pass.price != null ? String(pass.price) : "");

  const inputClass = "w-full min-w-0 max-w-full box-border px-3 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500";

  async function handleEdit(fd: FormData) {
    await run(async () => {
      await updateSessionPassAction(pass.id, fd);
      setEditing(false);
    });
  }

  if (editing) return (
    <form action={handleEdit} className="bg-amber-50 rounded-xl p-3 border border-amber-200 space-y-2 my-1">
      <input type="hidden" name="personCount" value={personCount} />
      <div>
        <p className="text-xs font-medium text-gray-600 mb-1">人数</p>
        <div className="flex gap-2">
          {[1, 2].map((n) => (
            <button key={n} type="button"
              onClick={() => {
                setPersonCount(n);
                const cnt = parseInt(totalCount, 10);
                const def = sessionPassPriceMap[n]?.[cnt];
                if (def) setPrice(String(def));
              }}
              className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition ${
                personCount === n ? "bg-amber-500 border-amber-500 text-white" : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >{n}名様</button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-600 mb-1">回数</p>
          <input name="totalCount" type="number" min="1" required value={totalCount}
            onChange={(e) => {
              setTotalCount(e.target.value);
              const n = parseInt(e.target.value, 10);
              const def = sessionPassPriceMap[personCount]?.[n];
              if (def && !price) setPrice(String(def));
            }}
            className={inputClass} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-600 mb-1">金額（税込）</p>
          <input name="price" type="number" min="0" step="1" value={price}
            onChange={(e) => setPrice(e.target.value)} className={inputClass} />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-600 mb-1">購入日</p>
          <input name="purchasedAt" type="date" required defaultValue={pass.purchasedAt} className={inputClass} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-600 mb-1">有効期限</p>
          <input name="expiredAt" type="date" defaultValue={pass.expiredAt} className={inputClass} />
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-gray-600 mb-1">メモ</p>
        <input name="note" defaultValue={pass.note} placeholder="備考など" className={inputClass} />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={() => setEditing(false)}
          className="flex-1 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50">
          キャンセル
        </button>
        <button type="submit" disabled={loading}
          className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-xs font-semibold flex items-center justify-center gap-1">
          {loading && <Spinner size={12} />}{loading ? "保存中..." : "保存する"}
        </button>
      </div>
    </form>
  );

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-xl text-xs border",
      pass.remainingCount === 0 ? "bg-gray-50 border-gray-200 text-gray-400" :
      pass.remainingCount <= 2  ? "bg-red-50 border-red-200" :
                                  "bg-amber-50 border-amber-200"
    )}>
      <Ticket size={12} className={pass.remainingCount === 0 ? "text-gray-300" : "text-amber-500"} />
      <div className="flex-1">
        <span className="font-semibold">{pass.totalCount}回券</span>
        {pass.personCount === 2 && <span className="ml-1 text-gray-500">2名様</span>}
        <span className={cn("ml-2 font-bold",
          pass.remainingCount === 0 ? "text-gray-400" :
          pass.remainingCount <= 2  ? "text-red-600"  : "text-amber-700")}>
          残り{pass.remainingCount}回
        </span>
        {pass.remainingCount === 0 && <span className="ml-1 text-gray-400">（使い切り）</span>}
        <AuthorStamp
          createdByName={pass.createdById ? memberNames[pass.createdById] : undefined}
          createdAt={pass.createdAt}
          updatedByName={pass.updatedById ? memberNames[pass.updatedById] : undefined}
          updatedAt={pass.updatedAt}
          className="mt-0.5"
        />
      </div>
      <span className="text-gray-400 self-start">{pass.purchasedAt}{pass.expiredAt && `～${pass.expiredAt}`}</span>
      {isAdmin && (
        <div className="flex items-center gap-0.5">
          <button onClick={() => setEditing(true)}
            className="p-1 text-gray-300 hover:text-amber-500 transition">
            <Pencil size={11} />
          </button>
          <button onClick={() => {
            if (deleting) return;
            if (!confirm("この回数券を削除しますか？")) return;
            runDelete(() => deleteSessionPassAction(pass.id));
          }} disabled={deleting}
            className="p-1 text-gray-300 hover:text-red-400 transition disabled:opacity-50">
            {deleting ? <Spinner size={11} /> : <Trash2 size={11} />}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── 回数券一覧 ───────────────────────────────────────
function SessionPassList({ passes, sessionPassPriceMap, isAdmin, memberNames }: {
  passes: SessionPass[]; sessionPassPriceMap: SessionPassPriceMap; isAdmin: boolean; memberNames: MemberNames;
}) {
  if (passes.length === 0) return <p className="text-xs text-gray-400 py-1">回数券なし</p>;

  return (
    <div className="space-y-1.5">
      {passes.map((pass) => (
        <SessionPassItem key={pass.id} pass={pass} sessionPassPriceMap={sessionPassPriceMap} isAdmin={isAdmin} memberNames={memberNames} />
      ))}
    </div>
  );
}

// ─── 顧客グループ ─────────────────────────────────────
function CustomerGroup({ customer, plans, passes, customers, planDefaults, sessionPassPriceMap, isAdmin, memberNames }: {
  customer: Customer; plans: CustomerPlanRecord[]; passes: SessionPass[]; customers: Customer[];
  planDefaults: PlanDefault[]; sessionPassPriceMap: SessionPassPriceMap; isAdmin: boolean; memberNames: MemberNames;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showAddPass, setShowAddPass] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const activePlan = plans.find((p) => p.startedAt <= today && (!p.endedAt || p.endedAt >= today));
  const totalRemaining = passes.reduce((s, p) => s + p.remainingCount, 0);

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
            {totalRemaining > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                <Ticket size={10} /> 回数券 残{totalRemaining}回
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap mt-0.5">
            {activePlan ? (
              <>
                {activePlan.price != null
                  ? <span className="text-xs text-gray-600 font-medium">¥{activePlan.price.toLocaleString("ja-JP")}<span className="text-gray-400 font-normal">/月</span></span>
                  : <span className="text-xs text-gray-400">金額未設定</span>
                }
                <span className="text-xs text-gray-400">{activePlan.startedAt}〜</span>
              </>
            ) : (
              <span className="text-xs text-gray-400">プラン履歴 {plans.length}件</span>
            )}
            {passes.filter((p) => p.remainingCount > 0).map((p) => (
              <span key={p.id} className="text-xs text-gray-500">
                {p.totalCount}回券
                {p.price != null && <span className="ml-0.5 text-gray-400">¥{p.price.toLocaleString("ja-JP")}</span>}
              </span>
            ))}
          </div>
        </div>
        <div className="flex-shrink-0 text-gray-400">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4">
          {plans.length === 0 && !showAdd ? (
            <p className="py-3 text-xs text-gray-400">プラン履歴なし</p>
          ) : (
            plans.map((p) => (
              <PlanItem key={p.id} record={p} customer={customer} customers={customers}
                planDefaults={planDefaults} isAdmin={isAdmin} memberNames={memberNames} />
            ))
          )}

          {showAdd ? (
            <div className="py-3">
              <PlanForm fixedCustomerId={customer.id} customers={customers} planDefaults={planDefaults}
                onClose={() => setShowAdd(false)} action={createPlanAction} submitLabel="追加する" />
            </div>
          ) : (
            isAdmin && (
              <div className="pt-3">
                <button onClick={() => setShowAdd(true)}
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium">
                  <Plus size={13} /> プランを追加
                </button>
              </div>
            )
          )}

          {/* 回数券セクション */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs font-bold text-gray-600 flex items-center gap-1.5 mb-2">
              <Ticket size={12} className="text-amber-500" /> 回数券
            </p>
            <SessionPassList passes={passes} sessionPassPriceMap={sessionPassPriceMap} isAdmin={isAdmin} memberNames={memberNames} />
            {showAddPass ? (
              <div className="mt-2">
                <SessionPassForm customerId={customer.id} sessionPassPriceMap={sessionPassPriceMap}
                  onClose={() => setShowAddPass(false)} />
              </div>
            ) : (
              isAdmin && (
                <button onClick={() => setShowAddPass(true)}
                  className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 font-medium">
                  <Plus size={13} /> 回数券を追加
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── メインコンポーネント ─────────────────────────────
export function PlansClient({ customers, plans, sessionPasses, planDefaults, sessionPassPriceMap, isAdmin, memberNames = {} }: {
  customers: Customer[]; plans: CustomerPlanRecord[]; sessionPasses: SessionPass[];
  planDefaults: PlanDefault[]; sessionPassPriceMap: SessionPassPriceMap; isAdmin: boolean; memberNames?: MemberNames;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");

  const grouped = useMemo(() => {
    const plansByCustomer = new Map<string, CustomerPlanRecord[]>();
    plans.forEach((p) => {
      if (!plansByCustomer.has(p.customerId)) plansByCustomer.set(p.customerId, []);
      plansByCustomer.get(p.customerId)!.push(p);
    });
    const passesByCustomer = new Map<string, SessionPass[]>();
    sessionPasses.forEach((p) => {
      if (!passesByCustomer.has(p.customerId)) passesByCustomer.set(p.customerId, []);
      passesByCustomer.get(p.customerId)!.push(p);
    });
    return customers.map((c) => ({
      customer: c,
      plans: (plansByCustomer.get(c.id) ?? []).sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
      passes: passesByCustomer.get(c.id) ?? [],
    }));
  }, [customers, plans, sessionPasses]);

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
          <PlanForm customers={customers} planDefaults={planDefaults} onClose={() => setShowAdd(false)}
            action={createPlanAction} submitLabel="追加する" />
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(({ customer, plans: ps, passes }) => (
          <CustomerGroup key={customer.id} customer={customer} plans={ps} passes={passes}
            customers={customers} planDefaults={planDefaults} sessionPassPriceMap={sessionPassPriceMap}
            isAdmin={isAdmin} memberNames={memberNames} />
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

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Pencil, Trash2, X, Search,
  ChevronDown, ChevronUp, CalendarRange, Ticket,
} from "lucide-react";
import { CustomerPlanRecord, ContractPlan, CONTRACT_PLAN_LABEL } from "@/lib/customer-plans-types";
import { Customer } from "@/lib/customers-types";
import { SessionPass } from "@/lib/session-passes-types";
import {
  updatePlanAction, deletePlanAction,
  createSessionPassAction, updateSessionPassAction, deleteSessionPassAction,
} from "./actions";
import { cn } from "@/lib/cn";
import { Spinner } from "@/components/ui/spinner";
import { AuthorStamp } from "@/components/ui/author-stamp";
import { useSubmitLock } from "@/lib/use-submit-lock";
import { CustomerPicker, normalizeForSearch } from "@/components/ui/customer-picker";
import { assertActionOk, type ActionResult } from "@/lib/action-result";

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

// ─── 月額プラン（以前の記録の編集用。新しく足す入口はもう無い） ─────
function PlanForm({
  defaultValues, fixedCustomerId, planDefaults, onClose, action, submitLabel,
}: {
  defaultValues?: Partial<CustomerPlanRecord>;
  fixedCustomerId: string;
  planDefaults: PlanDefault[];
  onClose: () => void;
  action: (fd: FormData) => Promise<ActionResult | void>;
  submitLabel: string;
}) {
  const router = useRouter();
  const { locked: loading, run } = useSubmitLock();
  const [error, setError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(defaultValues?.plan ?? "");
  const [price, setPrice] = useState(defaultValues?.price?.toString() ?? "");

  async function handleSubmit(fd: FormData) {
    await run(async () => {
      setError("");
      try { assertActionOk(await action(fd)); onClose(); router.refresh(); }
      catch (e) { setError(e instanceof Error ? e.message : "エラーが発生しました"); }
    });
  }

  const inputClass = "w-full min-w-0 max-w-full box-border px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelClass = "text-xs font-semibold text-gray-600 mb-1.5 block";

  return (
    <form action={handleSubmit} className="space-y-4">
      <input type="hidden" name="customerId" value={fixedCustomerId} />

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
function PlanItem({ record, customer, planDefaults, isAdmin, memberNames }: {
  record: CustomerPlanRecord; customer: Customer;
  planDefaults: PlanDefault[]; isAdmin: boolean; memberNames: MemberNames;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const { locked: deleting, run: runDelete } = useSubmitLock();
  const boundUpdate = updatePlanAction.bind(null, record.id, customer.id);

  if (editing) return (
    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 my-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-gray-700">プランを編集</p>
        <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
      </div>
      <PlanForm defaultValues={record} fixedCustomerId={customer.id} planDefaults={planDefaults}
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
            runDelete(async () => {
              try { assertActionOk(await deletePlanAction(record.id)); router.refresh(); }
              catch (e) { alert(e instanceof Error ? e.message : "削除に失敗しました"); }
            });
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
  const router = useRouter();
  const { locked: loading, run } = useSubmitLock();
  const [personCount, setPersonCount] = useState(1);
  const [totalCount, setTotalCount] = useState("");
  const [price, setPrice] = useState("");

  function autoFillPrice(persons: number, count: string) {
    const n = parseInt(count, 10);
    const defaultPrice = sessionPassPriceMap[persons]?.[n];
    if (defaultPrice != null && price === "") setPrice(String(defaultPrice));
  }

  async function handleSubmit(fd: FormData) {
    await run(async () => {
      assertActionOk(await createSessionPassAction(fd));
      onClose();
      router.refresh();
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
                if (defaultPrice != null) setPrice(String(defaultPrice));
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
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const { locked: deleting, run: runDelete } = useSubmitLock();
  const { locked: loading, run } = useSubmitLock();
  const [personCount, setPersonCount] = useState(pass.personCount ?? 1);
  const [totalCount, setTotalCount] = useState(String(pass.totalCount));
  const [price, setPrice] = useState(pass.price != null ? String(pass.price) : "");

  const inputClass = "w-full min-w-0 max-w-full box-border px-3 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500";

  async function handleEdit(fd: FormData) {
    await run(async () => {
      assertActionOk(await updateSessionPassAction(pass.id, fd));
      setEditing(false);
      router.refresh();
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
                if (def != null) setPrice(String(def));
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
              if (def != null && price === "") setPrice(String(def));
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
            runDelete(async () => {
              try { assertActionOk(await deleteSessionPassAction(pass.id)); router.refresh(); }
              catch (e) { alert(e instanceof Error ? e.message : "削除に失敗しました"); }
            });
          }} disabled={deleting}
            className="p-1 text-gray-300 hover:text-red-400 transition disabled:opacity-50">
            {deleting ? <Spinner size={11} /> : <Trash2 size={11} />}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── 回数券一覧（使い切った券は畳む） ─────────────────
function SessionPassList({ passes, sessionPassPriceMap, isAdmin, memberNames }: {
  passes: SessionPass[]; sessionPassPriceMap: SessionPassPriceMap; isAdmin: boolean; memberNames: MemberNames;
}) {
  const [showUsed, setShowUsed] = useState(false);
  if (passes.length === 0) return <p className="text-xs text-gray-400 py-1">回数券なし</p>;

  const live = passes.filter((p) => p.remainingCount > 0);
  const used = passes.filter((p) => p.remainingCount <= 0);

  return (
    <div className="space-y-1.5">
      {live.map((pass) => (
        <SessionPassItem key={pass.id} pass={pass} sessionPassPriceMap={sessionPassPriceMap} isAdmin={isAdmin} memberNames={memberNames} />
      ))}
      {used.length > 0 && (
        showUsed ? (
          used.map((pass) => (
            <SessionPassItem key={pass.id} pass={pass} sessionPassPriceMap={sessionPassPriceMap} isAdmin={isAdmin} memberNames={memberNames} />
          ))
        ) : (
          <button type="button" onClick={() => setShowUsed(true)}
            className="w-full text-left text-xs text-gray-500 hover:text-gray-700 px-3 py-2 rounded-xl border border-dashed border-gray-200">
            使い切った回数券 {used.length}枚を見る
          </button>
        )
      )}
    </div>
  );
}

/** 購入日の新しい順（いま使っている券が上に来る） */
function byPurchasedDesc(a: SessionPass, b: SessionPass) {
  return (b.purchasedAt ?? "").localeCompare(a.purchasedAt ?? "");
}

// ─── 顧客1人分 ────────────────────────────────────────
function CustomerGroup({ customer, plans, passes, planDefaults, sessionPassPriceMap, isAdmin, memberNames, defaultOpen }: {
  customer: Customer; plans: CustomerPlanRecord[]; passes: SessionPass[];
  planDefaults: PlanDefault[]; sessionPassPriceMap: SessionPassPriceMap; isAdmin: boolean; memberNames: MemberNames;
  defaultOpen?: boolean;
}) {
  const [expanded, setExpanded] = useState(!!defaultOpen);
  const [showAddPass, setShowAddPass] = useState(false);

  const totalRemaining = passes.reduce((s, p) => s + Math.max(0, p.remainingCount), 0);
  const latest = passes[0];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition text-left">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-gray-900">{customer.fullName}</p>
            {customer.status === "inactive" && <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">退会</span>}
            {totalRemaining > 0 ? (
              <span className={cn(
                "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold border",
                totalRemaining <= 2 ? "text-red-700 bg-red-50 border-red-200" : "text-amber-700 bg-amber-50 border-amber-200",
              )}>
                <Ticket size={10} /> 残り{totalRemaining}回
              </span>
            ) : passes.length > 0 ? (
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">使い切り</span>
            ) : null}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {latest
              ? <>最新 {latest.totalCount}回券{latest.price != null && ` ¥${latest.price.toLocaleString("ja-JP")}`}・{latest.purchasedAt} 購入</>
              : "回数券なし"}
          </p>
        </div>
        <div className="flex-shrink-0 text-gray-400">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3">
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

          {/* 月額プランはもう使わない。以前の記録がある人だけ、直せるように残す */}
          {plans.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-[11px] font-semibold text-gray-400 mb-1">月額プラン（以前の記録）</p>
              {plans.map((p) => (
                <PlanItem key={p.id} record={p} customer={customer}
                  planDefaults={planDefaults} isAdmin={isAdmin} memberNames={memberNames} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 回数券を追加（顧客をえらんでから） ───────────────
function AddPassPanel({ customers, sessionPassPriceMap, onClose }: {
  customers: Customer[]; sessionPassPriceMap: SessionPassPriceMap; onClose: () => void;
}) {
  const [customerId, setCustomerId] = useState("");
  return (
    <div className="bg-white rounded-2xl border-2 border-amber-300 p-4 mb-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5"><Ticket size={15} className="text-amber-500" /> 回数券を追加</p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="閉じる"><X size={16} /></button>
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-600 mb-1.5">顧客</p>
        <CustomerPicker customers={customers} value={customerId} onChange={setCustomerId} />
      </div>
      {customerId && (
        <SessionPassForm key={customerId} customerId={customerId} sessionPassPriceMap={sessionPassPriceMap} onClose={onClose} />
      )}
    </div>
  );
}

type Filter = "live" | "all";

// ─── メインコンポーネント ─────────────────────────────
export function PlansClient({ customers, plans, sessionPasses, planDefaults, sessionPassPriceMap, isAdmin, memberNames = {} }: {
  customers: Customer[]; plans: CustomerPlanRecord[]; sessionPasses: SessionPass[];
  planDefaults: PlanDefault[]; sessionPassPriceMap: SessionPassPriceMap; isAdmin: boolean; memberNames?: MemberNames;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("live");

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
    return customers.map((c) => {
      const passes = (passesByCustomer.get(c.id) ?? []).sort(byPurchasedDesc);
      return {
        customer: c,
        plans: (plansByCustomer.get(c.id) ?? []).sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
        passes,
        remaining: passes.reduce((s, p) => s + Math.max(0, p.remainingCount), 0),
        lastPurchased: passes[0]?.purchasedAt ?? "",
      };
    });
  }, [customers, plans, sessionPasses]);

  const liveCount = grouped.filter((g) => g.remaining > 0).length;

  const filtered = useMemo(() => {
    const q = normalizeForSearch(search);
    const list = grouped.filter(({ customer, remaining }) => {
      if (q) {
        return [customer.fullName, customer.email ?? "", (customer.phoneNumber ?? "").replace(/\D/g, "")]
          .some((f) => normalizeForSearch(f).includes(q));
      }
      if (filter === "live") return remaining > 0;
      return customer.status !== "inactive";   // 退会した人は検索したときだけ
    });
    // 残っている人を上に（残り少ない＝次の券をすすめる人から）、次に最近買った人、最後に名前
    return list.sort((a, b) =>
      (b.remaining > 0 ? 1 : 0) - (a.remaining > 0 ? 1 : 0)
      || (a.remaining > 0 && b.remaining > 0 ? a.remaining - b.remaining : 0)
      || b.lastPurchased.localeCompare(a.lastPurchased)
      || a.customer.fullName.localeCompare(b.customer.fullName, "ja"));
  }, [grouped, search, filter]);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto pb-24">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-gray-900 flex items-center gap-2">
            <Ticket size={20} className="text-amber-500" /> 回数券
          </h1>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5">残っている人 {liveCount}名</p>
        </div>
        {isAdmin && !showAdd && (
          <button onClick={() => setShowAdd(true)}
            className="hidden md:flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition">
            <Plus size={16} /> 回数券を追加
          </button>
        )}
      </div>

      {showAdd && (
        <AddPassPanel customers={customers} sessionPassPriceMap={sessionPassPriceMap} onClose={() => setShowAdd(false)} />
      )}

      <div className="mb-3 relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="名前の一部で検索（例：堀、田中）"
          className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-300 text-[16px] md:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
      </div>

      {!search && (
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-3">
          {([["live", `残りあり ${liveCount}`], ["all", "すべて"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)}
              className={cn("flex-1 py-2 rounded-lg text-sm font-semibold transition",
                filter === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
              {label}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-12">
          {search ? "見つかりません。字を減らすか、別の書き方で試してください" : "回数券が残っている人はいません"}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map(({ customer, plans: ps, passes }) => (
            <CustomerGroup key={customer.id} customer={customer} plans={ps} passes={passes}
              planDefaults={planDefaults} sessionPassPriceMap={sessionPassPriceMap}
              isAdmin={isAdmin} memberNames={memberNames} defaultOpen={filtered.length === 1} />
          ))}
        </div>
      )}

      {isAdmin && !showAdd && (
        <button onClick={() => { setShowAdd(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          className="md:hidden fixed bottom-6 right-4 w-14 h-14 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-full shadow-lg shadow-amber-200 flex items-center justify-center transition z-30"
          aria-label="回数券を追加">
          <Plus size={26} />
        </button>
      )}
    </div>
  );
}

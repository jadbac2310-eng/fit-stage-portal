"use client";

import { useState } from "react";
import { Save, CalendarRange, Ticket, Coins, Users } from "lucide-react";
import type { PlanMaster, PlanPaymentType, SessionPassPrice } from "@/lib/plans-master-types";
import { updatePlanAmountAction, updateSessionPassPriceAmountAction } from "./actions";
import { Spinner } from "@/components/ui/spinner";
import { useSubmitLock } from "@/lib/use-submit-lock";

function yen(n: number): string {
  return `¥${n.toLocaleString("ja-JP")}`;
}

const TYPE_META: Record<PlanPaymentType, { icon: typeof CalendarRange; color: string; bg: string }> = {
  monthly:      { icon: CalendarRange, color: "text-blue-600",  bg: "bg-blue-100"  },
  session_pass: { icon: Ticket,        color: "text-amber-600", bg: "bg-amber-100" },
  single:       { icon: Coins,         color: "text-gray-600",  bg: "bg-gray-100"  },
};

// ─── プラン1行 ────────────────────────────────────────
function PlanRow({ plan, isAdmin }: { plan: PlanMaster; isAdmin: boolean }) {
  const [amount, setAmount] = useState(String(plan.amount));
  const { locked: loading, run } = useSubmitLock();
  const [saved, setSaved] = useState(false);

  const meta = TYPE_META[plan.paymentType];
  const Icon = meta.icon;
  const isMonthly = plan.paymentType === "monthly";
  const parsed = parseInt(amount, 10);
  const unit = Number.isFinite(parsed) && plan.sessions > 0 ? Math.round(parsed / plan.sessions) : 0;
  const dirty = amount.trim() !== "" && parsed !== plan.amount;

  async function handleSave() {
    if (!dirty) return;
    await run(async () => {
      setSaved(false);
      const fd = new FormData();
      fd.set("amount", amount);
      await updatePlanAmountAction(plan.id, fd);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
          <Icon size={18} className={meta.color} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900">{plan.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {isMonthly ? `月${plan.sessions}回・単価 ${yen(unit)}/回` : `1回あたり単価`}
          </p>
        </div>
      </div>

      <div className="flex items-end gap-2">
        <div className="flex-1 min-w-0">
          <label className="text-xs font-semibold text-gray-600 mb-1 block">
            {isMonthly ? "月額金額（税込）" : "1回単価（税込）"}
          </label>
          <input
            type="number"
            min="0"
            step="1"
            value={amount}
            disabled={!isAdmin}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>
        {isAdmin && (
          <button
            onClick={handleSave}
            disabled={!dirty || loading}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold transition flex-shrink-0"
          >
            {loading ? <Spinner size={14} /> : <Save size={14} />}
            {saved ? "保存済" : "保存"}
          </button>
        )}
      </div>

      {isMonthly && (
        <p className="text-xs text-gray-400 mt-2">
          単価は「月額 ÷ 月{plan.sessions}回」で売上・歩合の計算に使われます
        </p>
      )}
    </div>
  );
}

// ─── 回数券マトリクス1行（人数×回数） ─────────────────
function SessionPassPriceRow({ row, isAdmin }: { row: SessionPassPrice; isAdmin: boolean }) {
  const [amount, setAmount] = useState(String(row.amount));
  const { locked: loading, run } = useSubmitLock();
  const [saved, setSaved] = useState(false);

  const parsed = parseInt(amount, 10);
  const unit = Number.isFinite(parsed) && row.totalCount > 0 ? Math.round(parsed / row.totalCount) : 0;
  const dirty = amount.trim() !== "" && parsed !== row.amount;

  async function handleSave() {
    if (!dirty) return;
    await run(async () => {
      setSaved(false);
      const fd = new FormData();
      fd.set("amount", amount);
      await updateSessionPassPriceAmountAction(row.id, fd);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="flex items-end gap-2 py-2.5 border-b border-gray-100 last:border-0">
      <div className="flex-shrink-0 w-24">
        <p className="text-sm font-bold text-gray-900">{row.personCount}名様</p>
        <p className="text-xs text-gray-400 mt-0.5">{row.totalCount}回・{yen(unit)}/回</p>
      </div>
      <div className="flex-1 min-w-0">
        <input
          type="number"
          min="0"
          step="1"
          value={amount}
          disabled={!isAdmin}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-50 disabled:text-gray-500"
        />
      </div>
      {isAdmin && (
        <button
          onClick={handleSave}
          disabled={!dirty || loading}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold transition flex-shrink-0"
        >
          {loading ? <Spinner size={14} /> : <Save size={14} />}
          {saved ? "保存済" : "保存"}
        </button>
      )}
    </div>
  );
}

// ─── メインコンポーネント ─────────────────────────────
export function PlansMasterClient({
  plans, sessionPassPrices, isAdmin,
}: {
  plans: PlanMaster[];
  sessionPassPrices: SessionPassPrice[];
  isAdmin: boolean;
}) {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-4 hidden md:block">
        <h1 className="text-xl font-bold text-gray-900">プランマスタ</h1>
        <p className="text-sm text-gray-500 mt-0.5">各コースの標準金額を管理します</p>
      </div>
      <div className="md:hidden mb-4">
        <h1 className="text-lg font-bold text-gray-900">プランマスタ</h1>
      </div>

      {!isAdmin && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-4">
          <p className="text-xs text-amber-700">閲覧のみ可能です（編集は管理者のみ）</p>
        </div>
      )}

      <div className="space-y-2.5">
        {plans.map((p) => (
          <PlanRow key={p.id} plan={p} isAdmin={isAdmin} />
        ))}
      </div>

      {/* 回数券の標準金額（人数 × 回数） */}
      {sessionPassPrices.length > 0 && (
        <div className="mt-6">
          <p className="text-sm font-bold text-gray-700 flex items-center gap-1.5 mb-2">
            <Users size={15} className="text-amber-500" /> 回数券の標準金額（人数 × 回数）
          </p>
          <div className="bg-white rounded-2xl border border-gray-200 px-4 py-1">
            {sessionPassPrices.map((r) => (
              <SessionPassPriceRow key={r.id} row={r} isAdmin={isAdmin} />
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            回数券追加時の初期金額として使われます（任意の回数も入力可能）
          </p>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4 leading-relaxed">
        ここで設定した金額は新規プラン・レッスンの標準単価として使われます。
        顧客ごとに金額が異なる場合は、プラン管理の各顧客プラン・回数券で個別に上書きできます。
      </p>
    </div>
  );
}

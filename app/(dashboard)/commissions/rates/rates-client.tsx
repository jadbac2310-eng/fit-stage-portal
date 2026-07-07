"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Percent, Check, Trash2, ArrowLeft } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { MemberLabel } from "@/components/ui/member-label";
import { useSubmitLock } from "@/lib/use-submit-lock";
import { setMemberCustomerRateAction, deleteMemberCustomerRateAction } from "./actions";

type Member   = { id: string; name: string; avatarUrl?: string };
type Customer = { id: string; name: string };
type Rate     = { memberId: string; customerId: string; rate: number };

const DEFAULT_RATE = 50;

export function RatesClient({
  members,
  customers,
  rates,
}: {
  members:   Member[];
  customers: Customer[];
  rates:     Rate[];
}) {
  const router = useRouter();

  const [memberId, setMemberId]     = useState("");
  const [customerId, setCustomerId] = useState("");
  const [rateInput, setRateInput]   = useState("");
  const { locked: saving, run: runSave }     = useSubmitLock();
  const { locked: removing, run: runRemove } = useSubmitLock();
  const [saved, setSaved]           = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const memberMap   = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const customerMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);

  // 組み合わせの既存設定を引く
  const existing = useMemo(
    () => rates.find((r) => r.memberId === memberId && r.customerId === customerId),
    [rates, memberId, customerId],
  );

  // 担当者・顧客を選び直したら、既存の率があれば入力欄に反映する
  function syncRate(mId: string, cId: string) {
    setSaved(false);
    setError(null);
    if (mId && cId) {
      const ex = rates.find((r) => r.memberId === mId && r.customerId === cId);
      setRateInput(ex ? String(ex.rate) : "");
    }
  }
  function pickMember(id: string)   { setMemberId(id);   syncRate(id, customerId); }
  function pickCustomer(id: string) { setCustomerId(id); syncRate(memberId, id); }
  function editCombo(r: Rate) {
    setMemberId(r.memberId);
    setCustomerId(r.customerId);
    setRateInput(String(r.rate));
    setSaved(false);
    setError(null);
  }

  async function save() {
    setError(null);
    if (!memberId || !customerId) { setError("担当者と顧客を選択してください"); return; }
    const n = parseInt(rateInput, 10);
    if (rateInput.trim() === "" || Number.isNaN(n)) { setError("歩合率（％）を入力してください"); return; }
    setSaved(false);
    await runSave(async () => {
      try {
        await setMemberCustomerRateAction(memberId, customerId, n);
        setSaved(true);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "保存に失敗しました");
      }
    });
  }

  function remove(r: Rate) {
    if (removing) return;
    runRemove(async () => {
      try {
        await deleteMemberCustomerRateAction(r.memberId, r.customerId);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "削除に失敗しました");
      }
    });
  }

  // 一覧（担当者名→顧客名で並べる）
  const sortedRates = useMemo(() => {
    return [...rates].sort((a, b) => {
      const ma = memberMap.get(a.memberId)?.name ?? "";
      const mb = memberMap.get(b.memberId)?.name ?? "";
      if (ma !== mb) return ma.localeCompare(mb, "ja");
      const ca = customerMap.get(a.customerId)?.name ?? "";
      const cb = customerMap.get(b.customerId)?.name ?? "";
      return ca.localeCompare(cb, "ja");
    });
  }, [rates, memberMap, customerMap]);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* ヘッダー */}
      <div className="mb-5">
        <Link href="/commissions" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-2">
          <ArrowLeft size={14} /> 歩合管理に戻る
        </Link>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Percent size={20} className="text-blue-600" /> 歩合率設定
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          担当者と顧客の組み合わせごとにトレーナー歩合率を設定します。設定が無い組み合わせは既定の{DEFAULT_RATE}%です。
        </p>
      </div>

      {/* 設定フォーム */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 md:p-5 mb-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">担当者</label>
          <select
            value={memberId}
            onChange={(e) => pickMember(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">選択してください</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">顧客</label>
          <select
            value={customerId}
            onChange={(e) => pickCustomer(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">選択してください</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">歩合率（％）</label>
          <div className="flex items-center gap-2">
            <input
              type="number" min="0" max="100" step="1"
              value={rateInput}
              onChange={(e) => { setRateInput(e.target.value); setSaved(false); }}
              placeholder={String(DEFAULT_RATE)}
              className="w-28 px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-400">%</span>
            {existing && (
              <span className="text-xs text-gray-400 ml-1">現在: {existing.rate}%</span>
            )}
          </div>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button
          onClick={save}
          disabled={saving}
          className="w-full inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl py-2.5 transition"
        >
          {saving ? <Spinner size={14} /> : saved ? <Check size={16} /> : null}
          {saving ? "保存中..." : saved ? "保存しました" : existing ? "更新する" : "設定する"}
        </button>
      </div>

      {/* 設定済み一覧 */}
      <div>
        <p className="text-sm font-bold text-gray-700 mb-2 px-1">設定済みの組み合わせ（{sortedRates.length}件）</p>
        {sortedRates.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10 bg-white rounded-2xl border border-gray-200">
            まだ設定はありません。すべて既定の{DEFAULT_RATE}%です。
          </p>
        ) : (
          <div className="space-y-2">
            {sortedRates.map((r) => {
              const m = memberMap.get(r.memberId);
              const c = customerMap.get(r.customerId);
              return (
                <div
                  key={`${r.memberId}_${r.customerId}`}
                  className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 px-4 py-3"
                >
                  <button
                    onClick={() => editCombo(r)}
                    className="flex-1 min-w-0 text-left"
                    title="クリックして編集"
                  >
                    <MemberLabel name={m?.name ?? "（削除済み）"} avatarUrl={m?.avatarUrl} size="sm" textClassName="text-sm font-semibold text-gray-900" />
                    <p className="text-xs text-gray-500 mt-0.5 truncate">顧客: {c?.name ?? "（削除済み）"}</p>
                  </button>
                  <span className="text-base font-bold text-blue-600">{r.rate}%</span>
                  <button
                    onClick={() => remove(r)}
                    disabled={removing}
                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                    title="削除（既定50%に戻す）"
                  >
                    {removing ? <Spinner size={16} /> : <Trash2 size={16} />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

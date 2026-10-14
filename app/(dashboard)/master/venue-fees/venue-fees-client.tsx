"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Coins, Check, Trash2 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useSubmitLock } from "@/lib/use-submit-lock";
import { assertActionOk } from "@/lib/action-result";
import { venueKey, type VenueKind } from "@/lib/lessons-types";
import { setVenueFeeAction, deleteVenueFeeAction } from "./actions";

type Opt      = { id: string; name: string };
type Venue    = { key: string; kind: VenueKind; id: string; name: string; fee: number; group: string };
type FeeRow   = { id: string; customerId: string; venueKind: VenueKind; venueId: string; fee: number };

const inputClass = "w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";
const labelClass = "block text-xs font-semibold text-gray-600 mb-1.5";

function yen(n: number) {
  return `¥${n.toLocaleString("ja-JP")}`;
}

export function VenueFeesClient({
  fees, customers, rentalGyms, fctStores, avenirStores, stores,
}: {
  fees: FeeRow[];
  customers: Opt[];
  rentalGyms: (Opt & { fee: number })[];
  fctStores: (Opt & { fee: number })[];
  avenirStores: (Opt & { fee: number })[];
  stores: (Opt & { fee: number })[];
}) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState("");
  const [venue, setVenue]           = useState("");
  const [feeInput, setFeeInput]     = useState("");
  const [error, setError]           = useState<string | null>(null);
  const [saved, setSaved]           = useState(false);
  const { locked: saving, run: runSave }     = useSubmitLock();
  const { locked: removing, run: runRemove } = useSubmitLock();

  // 料金のある会場（店舗は利用料が無いので出さない）
  const venues: Venue[] = useMemo(() => [
    ...stores.map((v)    => ({ key: venueKey("store", v.id),   kind: "store"  as const, id: v.id, name: v.name, fee: v.fee, group: "FIT STAGE店舗" })),
    ...rentalGyms.map((g) => ({ key: venueKey("gym", g.id),    kind: "gym"    as const, id: g.id, name: g.name, fee: g.fee, group: "レンタルジム" })),
    ...fctStores.map((f)  => ({ key: venueKey("fct", f.id),    kind: "fct"    as const, id: f.id, name: f.name, fee: f.fee, group: "FCT店舗" })),
    ...avenirStores.map((a) => ({ key: venueKey("avenir", a.id), kind: "avenir" as const, id: a.id, name: a.name, fee: a.fee, group: "アヴニール店舗" })),
  ], [stores, rentalGyms, fctStores, avenirStores]);

  const venueMap    = useMemo(() => new Map(venues.map((v) => [v.key, v])), [venues]);
  const customerMap = useMemo(() => new Map(customers.map((c) => [c.id, c.name])), [customers]);
  const selected    = venueMap.get(venue);

  // 選び直したら、その組み合わせの設定済みの額を入れる
  function syncFee(cId: string, vKey: string) {
    setSaved(false); setError(null);
    const v = venueMap.get(vKey);
    if (!cId || !v) return;
    const ex = fees.find((f) => f.customerId === cId && f.venueKind === v.kind && f.venueId === v.id);
    setFeeInput(ex ? String(ex.fee) : "");
  }

  async function save() {
    setError(null);
    if (!customerId) { setError("顧客を選択してください"); return; }
    if (!venue)      { setError("会場を選択してください"); return; }
    const n = parseInt(feeInput, 10);
    if (feeInput.trim() === "" || Number.isNaN(n)) { setError("料金を入力してください"); return; }
    setSaved(false);
    await runSave(async () => {
      try {
        const fd = new FormData();
        fd.set("customerId", customerId);
        fd.set("venue", venue);
        fd.set("fee", String(n));
        assertActionOk(await setVenueFeeAction(fd));
        setSaved(true);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "保存に失敗しました");
      }
    });
  }

  const rows = useMemo(() => {
    return [...fees].sort((a, b) => {
      const ca = customerMap.get(a.customerId) ?? "";
      const cb = customerMap.get(b.customerId) ?? "";
      return ca.localeCompare(cb, "ja");
    });
  }, [fees, customerMap]);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Coins size={20} className="text-emerald-600" /> 顧客ごとの会場料金
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          同じ会場でもお客さんによって料金が違うときに設定します。レッスン追加時の初期値になり、毎回打ち直さなくて済みます。料金のかからない会場には設定不要です。
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 md:p-5 mb-6 space-y-4">
        <div>
          <label className={labelClass}>顧客</label>
          <select value={customerId} onChange={(e) => { setCustomerId(e.target.value); syncFee(e.target.value, venue); }} className={inputClass}>
            <option value="">選択してください</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className={labelClass}>会場</label>
          <select value={venue} onChange={(e) => { setVenue(e.target.value); syncFee(customerId, e.target.value); }} className={inputClass}>
            <option value="">選択してください</option>
            {["FIT STAGE店舗", "レンタルジム", "FCT店舗", "アヴニール店舗"].map((g) => {
              const list = venues.filter((v) => v.group === g);
              if (list.length === 0) return null;
              return (
                <optgroup key={g} label={g}>
                  {list.map((v) => <option key={v.key} value={v.key}>{v.name}</option>)}
                </optgroup>
              );
            })}
          </select>
          {selected && (
            <p className="text-xs text-gray-400 mt-1">マスタの料金は {yen(selected.fee)} です</p>
          )}
        </div>

        <div>
          <label className={labelClass}>この顧客の料金（税込・1回あたり）</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">¥</span>
            <input
              type="number" min="0" step="1"
              value={feeInput}
              onChange={(e) => { setFeeInput(e.target.value); setSaved(false); }}
              placeholder={selected ? String(selected.fee) : "例: 4100"}
              className="w-32 px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button onClick={save} disabled={saving}
          className="w-full inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl py-2.5 transition">
          {saving ? <Spinner size={14} /> : saved ? <Check size={16} /> : null}
          {saving ? "保存中..." : saved ? "保存しました" : "設定する"}
        </button>
      </div>

      <p className="text-sm font-bold text-gray-700 mb-2 px-1">設定済み（{rows.length}件）</p>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10 bg-white rounded-2xl border border-gray-200">
          まだ設定はありません。すべてマスタの料金を使います。
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const v = venueMap.get(venueKey(r.venueKind, r.venueId));
            return (
              <div key={r.id} className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 px-4 py-3">
                <button
                  onClick={() => {
                    setCustomerId(r.customerId);
                    setVenue(venueKey(r.venueKind, r.venueId));
                    setFeeInput(String(r.fee));
                    setSaved(false); setError(null);
                  }}
                  className="flex-1 min-w-0 text-left"
                  title="タップして編集"
                >
                  <p className="text-sm font-semibold text-gray-900 truncate">{customerMap.get(r.customerId) ?? "（削除済み）"}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {v ? v.name : "（削除された会場）"}
                    {v && v.fee !== r.fee ? `（マスタ ${yen(v.fee)}）` : ""}
                  </p>
                </button>
                <span className="text-base font-bold text-emerald-600 whitespace-nowrap">{yen(r.fee)}</span>
                <button
                  onClick={() => {
                    if (removing) return;
                    runRemove(async () => {
                      try { assertActionOk(await deleteVenueFeeAction(r.id)); router.refresh(); }
                      catch (e) { setError(e instanceof Error ? e.message : "削除に失敗しました"); }
                    });
                  }}
                  disabled={removing}
                  className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                  title="削除（マスタの料金に戻す）"
                >
                  {removing ? <Spinner size={16} /> : <Trash2 size={16} />}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

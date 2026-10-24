"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Wallet, Plus, Trash2, Pencil, Check, AlertTriangle } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useSubmitLock } from "@/lib/use-submit-lock";
import { assertActionOk } from "@/lib/action-result";
import { ADJUSTMENT_PRESETS, type CommissionAdjustment } from "@/lib/commission-adjustments-types";
import {
  addCommissionAdjustmentAction,
  updateCommissionAdjustmentAction,
  deleteCommissionAdjustmentAction,
} from "./actions";

function yen(n: number) {
  return `¥${n.toLocaleString("ja-JP")}`;
}

function signedYen(n: number) {
  return n < 0 ? `−${yen(Math.abs(n))}` : `＋${yen(n)}`;
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * 対象月の選択肢。
 *
 * 先に渡したお金は「これから払う月」から引くので、過去だけでなく先の月も選べるようにする。
 * 過去6か月〜3か月先。
 */
function monthOptions(): { value: string; label: string }[] {
  const now = new Date();
  const opts: { value: string; label: string }[] = [];
  for (let i = 3; i >= -6; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    opts.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: `${d.getFullYear()}年${d.getMonth() + 1}月分`,
    });
  }
  return opts;
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-");
  return `${y}年${Number(m)}月分`;
}

const inputClass = "w-full px-3 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";
const labelClass = "block text-xs font-semibold text-gray-600 mb-1";

interface Member { id: string; name: string; avatarUrl?: string }

/** 追加・編集の共通フォーム */
function AdjustmentForm({
  members, initial, onDone, onCancel,
}: {
  members: Member[];
  initial?: CommissionAdjustment;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [kind, setKind] = useState<"deduct" | "add">(
    initial ? (initial.amount < 0 ? "deduct" : "add") : "deduct",
  );
  const [label, setLabel] = useState(initial?.label ?? ADJUSTMENT_PRESETS[0].label);
  const [error, setError] = useState("");
  const { locked, run } = useSubmitLock();
  const options = useMemo(() => monthOptions(), []);

  async function submit(formData: FormData) {
    setError("");
    await run(async () => {
      try {
        assertActionOk(
          initial
            ? await updateCommissionAdjustmentAction(initial.id, formData)
            : await addCommissionAdjustmentAction(formData),
        );
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "保存できませんでした");
      }
    });
  }

  return (
    <form action={submit} className="bg-white rounded-2xl border border-indigo-200 p-4 space-y-3">
      <input type="hidden" name="kind" value={kind} />

      {/* 引く／足す。符号を手で打たせない */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        {([
          { value: "deduct" as const, label: "差し引く" },
          { value: "add"    as const, label: "足す" },
        ]).map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => setKind(o.value)}
            className={[
              "flex-1 py-2 rounded-lg text-sm font-semibold transition",
              kind === o.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700",
            ].join(" ")}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>誰の</label>
          <select name="memberId" required defaultValue={initial?.memberId ?? ""} className={inputClass}>
            <option value="">選択...</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>どの月のコミッションから</label>
          <select name="month" required defaultValue={initial?.month ?? currentMonth()} className={inputClass}>
            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>内容（明細に出ます）</label>
        <input
          name="label"
          required
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="例）10/24 前払い分"
          className={inputClass}
        />
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {ADJUSTMENT_PRESETS.filter((p) => (kind === "deduct" ? p.sign === -1 : p.sign === 1)).map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setLabel(p.label)}
              title={p.hint}
              className="px-2 py-1 rounded-full border border-gray-200 bg-gray-50 text-[11px] text-gray-600 hover:bg-gray-100 transition"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelClass}>金額（マイナスは付けなくていいです）</label>
        <input
          name="amount"
          type="number"
          min="1"
          step="1"
          required
          inputMode="numeric"
          defaultValue={initial ? Math.abs(initial.amount) : ""}
          placeholder="例: 70000"
          className={inputClass}
        />
        <p className="text-xs text-gray-400 mt-1">
          「{kind === "deduct" ? "差し引く" : "足す"}」を選んでいるので、明細では{kind === "deduct" ? "マイナス" : "プラス"}になります。
        </p>
      </div>

      <div>
        <label className={labelClass}>メモ（任意）</label>
        <input
          name="note"
          defaultValue={initial?.note ?? ""}
          placeholder="例）現金で手渡し"
          className={inputClass}
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button type="button" onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
          やめる
        </button>
        <button type="submit" disabled={locked}
          className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-semibold flex items-center justify-center gap-1.5 transition">
          {locked ? <Spinner size={14} /> : <Check size={14} />} {initial ? "保存する" : "登録する"}
        </button>
      </div>
    </form>
  );
}

function AdjustmentRow({ a, onEdit }: { a: CommissionAdjustment; onEdit: () => void }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const { locked, run } = useSubmitLock();

  async function remove() {
    if (!confirm(`「${a.label}（${signedYen(a.amount)}）」を取り消します。よろしいですか？`)) return;
    setError("");
    await run(async () => {
      try {
        assertActionOk(await deleteCommissionAdjustmentAction(a.id));
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "取り消せませんでした");
      }
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{a.label}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {a.memberName ?? "（担当者不明）"} ・ {monthLabel(a.month)}のコミッションから
          </p>
          {a.note && <p className="text-xs text-gray-400 mt-0.5 truncate">{a.note}</p>}
        </div>
        <p className={`text-base font-bold tabular-nums ${a.amount < 0 ? "text-red-600" : "text-green-600"}`}>
          {signedYen(a.amount)}
        </p>
        <button type="button" onClick={onEdit} aria-label="編集"
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition">
          <Pencil size={14} />
        </button>
        <button type="button" onClick={remove} disabled={locked} aria-label="取り消す"
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 transition">
          {locked ? <Spinner size={14} /> : <Trash2 size={14} />}
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
    </div>
  );
}

export function AdjustmentsClient({
  adjustments, members,
}: { adjustments: CommissionAdjustment[]; members: Member[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // 月ごとにまとめる。新しい月が上
  const byMonth = useMemo(() => {
    const map = new Map<string, CommissionAdjustment[]>();
    for (const a of adjustments) {
      const arr = map.get(a.month);
      if (arr) arr.push(a);
      else map.set(a.month, [a]);
    }
    return Array.from(map.entries()).sort((x, y) => y[0].localeCompare(x[0]));
  }, [adjustments]);

  const thisMonth = currentMonth();
  const upcoming = adjustments.filter((a) => a.month >= thisMonth);
  const upcomingTotal = upcoming.reduce((s, a) => s + a.amount, 0);

  function done() {
    setAdding(false);
    setEditingId(null);
    router.refresh();
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <Link href="/commissions" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition mb-4">
        <ChevronLeft size={15} /> 歩合管理
      </Link>

      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Wallet size={20} className="text-indigo-600" />
          <h1 className="text-xl font-bold text-gray-900">前払い・差し引き</h1>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">
          先に渡したお金を、あとのコミッションから引くための記録です。
        </p>
      </div>

      {/* 何のための画面かを1行で。覚えておく必要がないことを伝える */}
      <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-4 mb-4">
        <p className="text-xs text-indigo-800 leading-relaxed">
          ここに入れておけば、<span className="font-bold">その月のコミッション明細に自動で載って差し引かれます</span>。
          覚えておかなくて大丈夫です。受け取る側の明細にも「何がいくら引かれたか」が出ます。
        </p>
      </div>

      {/* これから差し引く分の合計。払う前にここを見れば足りる */}
      {upcoming.length > 0 && (
        <div className="rounded-2xl bg-white border border-gray-200 p-4 mb-4">
          <p className="text-xs font-semibold text-gray-500">これから反映される分（今月以降）</p>
          <p className={`text-2xl font-bold mt-0.5 ${upcomingTotal < 0 ? "text-red-600" : "text-green-600"}`}>
            {signedYen(upcomingTotal)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{upcoming.length}件</p>
        </div>
      )}

      {adding ? (
        <div className="mb-4">
          <AdjustmentForm members={members} onDone={done} onCancel={() => setAdding(false)} />
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)}
          className="w-full mb-4 flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition">
          <Plus size={15} /> 前払い・差し引きを登録する
        </button>
      )}

      {byMonth.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">💴</p>
          <p className="text-sm font-semibold text-gray-600">まだ登録はありません</p>
          <p className="text-xs text-gray-400 mt-1">先にお金を渡したときに、ここへ入れておいてください</p>
        </div>
      ) : (
        <div className="space-y-5">
          {byMonth.map(([month, rows]) => {
            const total = rows.reduce((s, a) => s + a.amount, 0);
            return (
              <div key={month}>
                <div className="flex items-baseline justify-between px-1 mb-2">
                  <p className="text-sm font-bold text-gray-700">
                    {monthLabel(month)}のコミッション
                    {month < thisMonth && <span className="text-xs font-normal text-gray-400 ml-1.5">（反映済み）</span>}
                  </p>
                  <p className={`text-sm font-bold ${total < 0 ? "text-red-600" : "text-green-600"}`}>
                    {signedYen(total)}
                  </p>
                </div>
                <div className="space-y-2">
                  {rows.map((a) => (
                    editingId === a.id ? (
                      <AdjustmentForm key={a.id} members={members} initial={a}
                        onDone={done} onCancel={() => setEditingId(null)} />
                    ) : (
                      <AdjustmentRow key={a.id} a={a} onEdit={() => setEditingId(a.id)} />
                    )
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-6 leading-relaxed flex items-start gap-1.5">
        <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
        差し引く額がその月の報酬より多いと振込額がマイナスになります。
        その場合は金額を分けて、残りを翌月のぶんとして登録してください。
      </p>
    </div>
  );
}

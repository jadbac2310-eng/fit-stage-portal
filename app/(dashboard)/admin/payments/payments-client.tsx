"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet, CheckCircle2, Circle, Ticket, CreditCard, Dumbbell, X, Pencil, Link2, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/cn";
import { useSubmitLock } from "@/lib/use-submit-lock";
import { Spinner } from "@/components/ui/spinner";
import type { Receivable } from "@/lib/payments-types";
import { SOURCE_TYPE_LABEL, PAYMENT_METHODS, type PaymentSourceType } from "@/lib/payments-types";
import type { StripeCheckout } from "@/lib/stripe-checkouts";
import { recordPaymentAction, unrecordPaymentAction, createCheckoutLinkAction } from "./actions";

function yen(n: number) { return `¥${Math.round(n).toLocaleString("ja-JP")}`; }
function todayStr() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function monthOptions() {
  const out: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: `${d.getFullYear()}年${d.getMonth() + 1}月` });
  }
  return out;
}

const TYPE_ICON: Record<PaymentSourceType, React.ReactNode> = {
  session_pass: <Ticket size={12} />,
  customer_plan: <CreditCard size={12} />,
  single_lesson: <Dumbbell size={12} />,
};
const TYPE_CLS: Record<PaymentSourceType, string> = {
  session_pass: "bg-amber-100 text-amber-700",
  customer_plan: "bg-indigo-100 text-indigo-700",
  single_lesson: "bg-blue-100 text-blue-700",
};

function PaymentForm({ item, onClose }: { item: Receivable; onClose: () => void }) {
  const router = useRouter();
  const { locked: saving, run } = useSubmitLock();
  const inputClass = "w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await run(async () => {
      try {
        await recordPaymentAction(fd);
        router.refresh();
        onClose();
      } catch {}
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-2 p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-2.5">
      <input type="hidden" name="sourceType" value={item.sourceType} />
      <input type="hidden" name="sourceId" value={item.sourceId} />
      <input type="hidden" name="customerId" value={item.customerId} />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] font-semibold text-gray-500 mb-1 block">入金日</label>
          <input type="date" name="paidAt" defaultValue={item.payment?.paidAt ?? todayStr()} className={inputClass} />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-gray-500 mb-1 block">入金額</label>
          <input type="number" name="amount" min="0" defaultValue={item.payment?.amount ?? item.amount} className={inputClass} />
        </div>
      </div>
      <div>
        <label className="text-[11px] font-semibold text-gray-500 mb-1 block">入金方法</label>
        <select name="method" defaultValue={item.payment?.method ?? "振込"} className={inputClass}>
          {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div>
        <label className="text-[11px] font-semibold text-gray-500 mb-1 block">メモ（任意）</label>
        <input name="note" defaultValue={item.payment?.note ?? ""} placeholder="振込人名義など" className={inputClass} />
      </div>
      <div className="flex gap-2 pt-0.5">
        <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-100 transition">キャンセル</button>
        <button type="submit" disabled={saving} className="flex-1 py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition">
          {saving && <Spinner size={13} />}{item.payment ? "入金を更新" : "入金済みにする"}
        </button>
      </div>
    </form>
  );
}

function Row({ item }: { item: Receivable }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { locked: removing, run: runRemove } = useSubmitLock();
  const paid = !!item.payment;

  function unrecord() {
    if (removing) return;
    if (!confirm("入金記録を取り消しますか？")) return;
    runRemove(async () => {
      try {
        await unrecordPaymentAction(item.sourceType, item.sourceId);
        router.refresh();
      } catch {}
    });
  }

  return (
    <div className={cn("rounded-2xl border p-3.5", paid ? "bg-white border-gray-200" : "bg-amber-50/40 border-amber-200")}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0">
          {paid ? <CheckCircle2 size={20} className="text-green-600" /> : <Circle size={20} className="text-amber-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold", TYPE_CLS[item.sourceType])}>
              {TYPE_ICON[item.sourceType]} {SOURCE_TYPE_LABEL[item.sourceType]}
            </span>
            <span className="text-sm font-semibold text-gray-900 truncate">{item.customerName}</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{item.label} ・ {item.date}</p>
          {paid && (
            <p className="text-[11px] text-green-700 mt-1">
              入金済 {item.payment?.paidAt ?? ""}{item.payment?.method ? ` ・ ${item.payment.method}` : ""}
              {item.payment && item.payment.amount !== item.amount ? ` ・ ${yen(item.payment.amount)}` : ""}
              {item.payment?.note ? ` ・ ${item.payment.note}` : ""}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <span className="text-base font-bold text-gray-900 tabular-nums">{yen(item.amount)}</span>
          {paid ? (
            <div className="flex items-center gap-1">
              <button onClick={() => setOpen((v) => !v)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" aria-label="編集"><Pencil size={13} /></button>
              <button onClick={unrecord} disabled={removing} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50" aria-label="取消">
                {removing ? <Spinner size={13} /> : <X size={14} />}
              </button>
            </div>
          ) : (
            <button onClick={() => setOpen((v) => !v)} className="text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg px-2.5 py-1.5 transition">
              入金記録
            </button>
          )}
        </div>
      </div>
      {open && <PaymentForm item={item} onClose={() => setOpen(false)} />}
    </div>
  );
}

function CheckoutCard({
  customerId, customerName, total, count, month, existing,
}: {
  customerId: string; customerName: string; total: number; count: number; month: string;
  existing?: StripeCheckout;
}) {
  const [url, setUrl] = useState<string | null>(existing?.status === "pending" ? existing.url ?? null : null);
  const { locked: loading, run } = useSubmitLock();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("コピーに失敗しました。リンクを長押しでコピーしてください。");
    }
  }

  async function generate() {
    setError(null);
    await run(async () => {
      try {
        const res = await createCheckoutLinkAction(customerId, month);
        if (res.ok) {
          setUrl(res.url);
          await copy(res.url);
        } else {
          setError(res.error);
        }
      } catch {
        setError("リンク発行に失敗しました");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50/40 p-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{customerName}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">未入金 {count}件 ・ {yen(total)}</p>
        </div>
        {!url ? (
          <button onClick={generate} disabled={loading}
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 rounded-lg px-3 py-2 transition flex-shrink-0">
            {loading ? <Spinner size={13} /> : <Link2 size={13} />} 決済リンク発行
          </button>
        ) : (
          <button onClick={() => copy(url)}
            className="flex items-center gap-1.5 text-xs font-semibold text-violet-700 bg-white border border-violet-300 hover:bg-violet-50 rounded-lg px-3 py-2 transition flex-shrink-0">
            {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />} {copied ? "コピー済" : "リンクをコピー"}
          </button>
        )}
      </div>
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="mt-2 block text-[11px] text-violet-600 underline break-all hover:text-violet-800">
          {url}
        </a>
      )}
      {error && <p className="mt-2 text-[11px] text-red-600">{error}</p>}
    </div>
  );
}

// ─── 顧客・法人ごとにまとめた1グループ（1レッスンごとに行が並んで埋もれるのを防ぐ） ───
function CustomerPaymentGroup({ billerName, items }: { billerName: string; items: Receivable[] }) {
  const unpaid = items.filter((r) => !r.payment);
  const [expanded, setExpanded] = useState(items.length <= 1);
  const total = items.reduce((s, r) => s + r.amount, 0);
  const unpaidTotal = unpaid.reduce((s, r) => s + r.amount, 0);

  return (
    <div className={cn("rounded-2xl border overflow-hidden", unpaid.length > 0 ? "bg-amber-50/30 border-amber-200" : "bg-white border-gray-200")}>
      <button onClick={() => setExpanded((v) => !v)} className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-black/[0.02] transition text-left">
        <div className="mt-0.5 flex-shrink-0">
          {unpaid.length === 0 ? <CheckCircle2 size={18} className="text-green-600" /> : <Circle size={18} className="text-amber-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{billerName}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {items.length}件 ・ {yen(total)}
            {unpaid.length > 0 && <span className="text-amber-600 font-medium">　未入金 {unpaid.length}件・{yen(unpaidTotal)}</span>}
          </p>
        </div>
        {expanded ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
      </button>
      {expanded && (
        <div className="border-t border-gray-100 px-3 py-2.5 space-y-2 bg-white/60">
          {items.map((r) => <Row key={`${r.sourceType}-${r.sourceId}`} item={r} />)}
        </div>
      )}
    </div>
  );
}

export function PaymentsClient({
  receivables, month, checkouts = {}, stripeEnabled = false, billerMap = {},
}: {
  receivables: Receivable[];
  month: string;
  checkouts?: Record<string, StripeCheckout>;
  stripeEnabled?: boolean;
  billerMap?: Record<string, { id: string; name: string }>;
}) {
  const router = useRouter();
  const options = useMemo(() => monthOptions(), []);
  const [filter, setFilter] = useState<"all" | "unpaid" | "paid">("all");

  // 顧客別の未入金まとめ（カード決済リンク用）
  const unpaidByCustomer = useMemo(() => {
    const map = new Map<string, { customerId: string; customerName: string; total: number; count: number }>();
    for (const r of receivables) {
      if (r.payment || r.amount <= 0 || !r.customerId) continue;
      const cur = map.get(r.customerId) ?? { customerId: r.customerId, customerName: r.customerName, total: 0, count: 0 };
      cur.total += r.amount;
      cur.count += 1;
      map.set(r.customerId, cur);
    }
    return Array.from(map.values()).sort((a, b) => a.customerName.localeCompare(b.customerName, "ja"));
  }, [receivables]);

  const total = receivables.reduce((s, r) => s + r.amount, 0);
  const paidItems = receivables.filter((r) => r.payment);
  const paidTotal = paidItems.reduce((s, r) => s + (r.payment?.amount ?? r.amount), 0);
  const unpaidItems = receivables.filter((r) => !r.payment);
  const unpaidTotal = unpaidItems.reduce((s, r) => s + r.amount, 0);

  const shown = receivables.filter((r) =>
    filter === "all" ? true : filter === "paid" ? !!r.payment : !r.payment,
  );

  // 同じ会社・人物(billingToCustomerId でまとめ先が同じ顧客)ごとにグルーピングする
  const groups = useMemo(() => {
    const map = new Map<string, { key: string; billerName: string; items: Receivable[] }>();
    for (const r of shown) {
      const biller = billerMap[r.customerId];
      const key = biller?.id ?? r.customerId;
      const name = biller?.name ?? r.customerName;
      if (!map.has(key)) map.set(key, { key, billerName: name, items: [] });
      map.get(key)!.items.push(r);
    }
    for (const g of map.values()) g.items.sort((a, b) => b.date.localeCompare(a.date));
    // 未入金を含むグループを先に、件数が多い順で並べる
    return Array.from(map.values()).sort((a, b) => {
      const aUnpaid = a.items.some((r) => !r.payment) ? 1 : 0;
      const bUnpaid = b.items.some((r) => !r.payment) ? 1 : 0;
      return bUnpaid - aUnpaid || b.items.length - a.items.length;
    });
  }, [shown, billerMap]);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto pb-10">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Wallet size={20} className="text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">入金管理</h1>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">売上（回数券・月額プラン・都度払い）の入金状況を管理します</p>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm font-semibold text-gray-600">対象月</label>
        <select
          value={month}
          onChange={(e) => router.push(`/admin/payments?month=${e.target.value}`)}
          className="px-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-3">
          <p className="text-[11px] font-semibold text-gray-500">売上合計</p>
          <p className="text-lg font-bold text-gray-900 tabular-nums">{yen(total)}</p>
          <p className="text-[10px] text-gray-400">{receivables.length}件</p>
        </div>
        <div className="bg-green-50 rounded-2xl border border-green-100 p-3">
          <p className="text-[11px] font-semibold text-green-600">入金済</p>
          <p className="text-lg font-bold text-green-700 tabular-nums">{yen(paidTotal)}</p>
          <p className="text-[10px] text-green-500">{paidItems.length}件</p>
        </div>
        <div className="bg-amber-50 rounded-2xl border border-amber-100 p-3">
          <p className="text-[11px] font-semibold text-amber-600">未入金</p>
          <p className="text-lg font-bold text-amber-700 tabular-nums">{yen(unpaidTotal)}</p>
          <p className="text-[10px] text-amber-500">{unpaidItems.length}件</p>
        </div>
      </div>

      {/* カード決済リンク（顧客別の未入金まとめ。リンクを発行→コピーして公式LINEで送る） */}
      {stripeEnabled && unpaidByCustomer.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <CreditCard size={15} className="text-violet-600" />
            <h2 className="text-sm font-bold text-gray-800">カード決済リンク</h2>
            <span className="text-[11px] text-gray-400">発行→コピーしてLINEで送付</span>
          </div>
          <div className="space-y-2">
            {unpaidByCustomer.map((c) => (
              <CheckoutCard
                key={c.customerId}
                customerId={c.customerId}
                customerName={c.customerName}
                total={c.total}
                count={c.count}
                month={month}
                existing={checkouts[c.customerId]}
              />
            ))}
          </div>
        </div>
      )}

      {/* フィルタ */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-4">
        {([["all", "すべて", receivables.length], ["unpaid", "未入金", unpaidItems.length], ["paid", "入金済", paidItems.length]] as const).map(([key, label, n]) => (
          <button key={key} onClick={() => setFilter(key)}
            className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition",
              filter === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
            {label}
            <span className={cn("text-[11px] min-w-[1.1rem] h-[1.1rem] px-1 inline-flex items-center justify-center rounded-full font-bold",
              filter === key ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-500")}>{n}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🧾</p>
          <p className="text-sm font-semibold text-gray-600">該当する売上はありません</p>
          <p className="text-xs text-gray-400 mt-1">回数券・月額プランの購入や都度レッスンがあると表示されます</p>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((g) => (
            <CustomerPaymentGroup key={g.key} billerName={g.billerName} items={g.items} />
          ))}
        </div>
      )}
    </div>
  );
}

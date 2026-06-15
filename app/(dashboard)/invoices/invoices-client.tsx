"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Receipt, ChevronRight } from "lucide-react";
import type { CustomerInvoice } from "@/lib/invoices";

function yen(n: number) {
  return `¥${n.toLocaleString("ja-JP")}`;
}

function monthOptions(): { value: string; label: string }[] {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    opts.push({ value, label: `${d.getFullYear()}年${d.getMonth() + 1}月` });
  }
  return opts;
}

export function InvoicesClient({ invoices, month }: { invoices: CustomerInvoice[]; month: string }) {
  const router = useRouter();
  const options = useMemo(() => monthOptions(), []);
  const grandTotal = invoices.reduce((s, inv) => s + inv.total, 0);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Receipt size={20} className="text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">請求書</h1>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">顧客ごとに月次の請求書を発行します</p>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <label className="text-sm font-semibold text-gray-600">対象月</label>
        <select
          value={month}
          onChange={(e) => router.push(`/invoices?month=${e.target.value}`)}
          className="px-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="text-sm text-gray-500 ml-auto">
          {invoices.length}件 ・ 合計 <span className="font-bold text-gray-800">{yen(grandTotal)}</span>
        </span>
      </div>

      {invoices.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🧾</p>
          <p className="text-sm font-semibold text-gray-600">この月の請求はありません</p>
          <p className="text-xs text-gray-400 mt-1">月額プラン・回数券の購入や都度レッスンがあると表示されます</p>
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => (
            <Link
              key={inv.customerId}
              href={`/invoices/print?customer=${inv.customerId}&month=${month}`}
              className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition group"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText size={18} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{inv.customerName}</p>
                <p className="text-xs text-gray-400 mt-0.5">{inv.lines.length}明細</p>
              </div>
              <p className="text-base font-bold text-gray-800">{yen(inv.total)}</p>
              <ChevronRight size={16} className="text-gray-400 group-hover:text-blue-500 transition flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X, RotateCcw } from "lucide-react";
import { updateInvoiceDueDateAction } from "../actions";
import { useSubmitLock } from "@/lib/use-submit-lock";
import { Spinner } from "@/components/ui/spinner";

/**
 * 請求書の支払期限。クリックで編集でき、保存すると請求書（顧客×対象月）ごとに上書きされる。
 * 「既定に戻す」で上書きを消すと、対象月の翌月10日に戻る。
 * 編集用の操作ボタンは印刷時には表示しない（print:hidden）。
 */
export function EditableDueDate({
  billerId, month, label, value, defaultValue,
}: {
  billerId: string;
  month: string;
  label: string;        // 表示用（例: 2026年8月10日）
  value: string | null; // 上書き設定（YYYY-MM-DD）。未設定なら null
  defaultValue: string; // 既定の支払期限（YYYY-MM-DD）
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(value ?? defaultValue);
  const { locked: saving, run } = useSubmitLock();

  function save(next: string | null) {
    run(async () => {
      const res = await updateInvoiceDueDateAction(billerId, month, next);
      if (!res.ok) {
        alert(res.error);
        return;
      }
      setDate(next ?? defaultValue);
      setEditing(false);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <div className="flex flex-wrap items-center gap-1.5 mt-3 text-xs text-gray-500">
        <span>お支払期限:</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border-b-2 border-blue-400 focus:outline-none px-1 py-0.5 text-gray-800"
        />
        <button type="button" onClick={() => save(date)} disabled={saving}
          className="print:hidden text-green-600 hover:bg-green-50 rounded p-1 disabled:opacity-50">
          {saving ? <Spinner size={14} /> : <Check size={14} />}
        </button>
        <button type="button" onClick={() => { setDate(value ?? defaultValue); setEditing(false); }}
          className="print:hidden text-gray-400 hover:bg-gray-100 rounded p-1">
          <X size={14} />
        </button>
        {value && (
          <button type="button" onClick={() => save(null)} disabled={saving}
            className="print:hidden inline-flex items-center gap-1 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded px-1.5 py-1 disabled:opacity-50">
            <RotateCcw size={12} /> 既定に戻す
          </button>
        )}
      </div>
    );
  }

  return (
    <p className="text-xs text-gray-500 mt-3">
      お支払期限: {label}（振込手数料はご負担ください）
      <button type="button" onClick={() => setEditing(true)}
        className="print:hidden align-middle ml-1 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded p-1 transition">
        <Pencil size={12} />
      </button>
    </p>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X } from "lucide-react";
import { updateBillingNameAction } from "../actions";
import { useSubmitLock } from "@/lib/use-submit-lock";
import { Spinner } from "@/components/ui/spinner";

/**
 * 請求書の宛名。クリックで編集でき、保存すると billing_name を更新する。
 * 編集用の操作ボタンは印刷時には表示しない（print:hidden）。
 */
export function EditableBillingName({ customerId, name, suffix = "様" }: { customerId: string; name: string; suffix?: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const { locked: saving, run } = useSubmitLock();

  function save() {
    run(async () => {
      await updateBillingNameAction(customerId, value);
      setEditing(false);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          className="text-lg font-bold text-gray-900 border-b-2 border-blue-400 focus:outline-none px-1 py-0.5 min-w-0 w-44"
        />
        <span className="text-lg font-bold text-gray-900">{suffix}</span>
        <button type="button" onClick={save} disabled={saving}
          className="print:hidden text-green-600 hover:bg-green-50 rounded p-1 disabled:opacity-50">
          {saving ? <Spinner size={16} /> : <Check size={16} />}
        </button>
        <button type="button" onClick={() => { setValue(name); setEditing(false); }}
          className="print:hidden text-gray-400 hover:bg-gray-100 rounded p-1">
          <X size={16} />
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-lg font-bold text-gray-900 border-b border-gray-400 pb-1">{name} {suffix}</span>
      <button type="button" onClick={() => setEditing(true)}
        className="print:hidden text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded p-1 transition">
        <Pencil size={13} />
      </button>
    </span>
  );
}

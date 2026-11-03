"use client";

import { useState, useTransition } from "react";
import { Cake, Loader2 } from "lucide-react";
import { setMyBirthDateAction } from "./actions";

/** 自分の生年月日を入れる小さなフォーム。星まわりページの入口 */
export function BirthForm({ current, compact = false }: { current?: string; compact?: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      action={(fd) => start(async () => {
        setError(null);
        const r = await setMyBirthDateAction(fd);
        if (r?.error) setError(r.error);
      })}
      className={compact ? "flex items-center gap-2" : "flex flex-col sm:flex-row sm:items-center gap-2"}
    >
      <label className="flex items-center gap-2 text-sm text-gray-700">
        {!compact && <Cake size={16} className="text-pink-500" />}
        <input
          name="birthDate"
          type="date"
          required
          defaultValue={current ?? ""}
          className="px-3 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 disabled:opacity-50 flex items-center gap-1.5"
      >
        {pending && <Loader2 size={14} className="animate-spin" />}
        {current ? "変更" : "今日の一手を見る"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}

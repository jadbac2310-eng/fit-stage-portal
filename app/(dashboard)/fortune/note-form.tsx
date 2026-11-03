"use client";

import { useState, useTransition } from "react";
import { Loader2, Check } from "lucide-react";
import { saveFortuneNoteAction } from "./actions";

/** 代表が書く「ひとこと」。1人ずつ、または全員へ。空で保存すると消える */
export function NoteForm({ memberId, month, current, placeholder }: {
  memberId: string | null; month: string; current?: string; placeholder: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  return (
    <form
      action={(fd) => start(async () => {
        setError(null); setSaved(false);
        const r = await saveFortuneNoteAction(fd);
        if (r?.error) setError(r.error); else setSaved(true);
      })}
      className="mt-2"
    >
      <input type="hidden" name="month" value={month} />
      <input type="hidden" name="memberId" value={memberId ?? ""} />
      <textarea
        name="body"
        defaultValue={current ?? ""}
        placeholder={placeholder}
        rows={2}
        maxLength={400}
        className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <div className="flex items-center gap-2 mt-1.5">
        <button type="submit" disabled={pending}
          className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 disabled:opacity-50 flex items-center gap-1">
          {pending ? <Loader2 size={12} className="animate-spin" /> : saved ? <Check size={12} /> : null}
          {current ? "書き直す" : "送る"}
        </button>
        {saved && <span className="text-xs text-emerald-600">保存しました</span>}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </form>
  );
}

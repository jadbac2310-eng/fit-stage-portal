"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check } from "lucide-react";
import { useSubmitLock } from "@/lib/use-submit-lock";
import { Spinner } from "@/components/ui/spinner";
import { assertActionOk } from "@/lib/action-result";
import { saveLessonNoteAction } from "../lessons/regular/actions";

/**
 * その回の記録（備考）を、担当トレーナーがその場で書けるようにする。
 *
 * レッスン全体の編集は「管理者か、追加した本人」に限っている。
 * それだと、坂根さんが入れた予定を担当した渡辺さんが記録を書けず、
 * 引き継ぎが成立しない。ここは備考だけを書き換える専用の口にして、
 * 日時・金額・お客さまには触れないようにしている。
 *
 * 完了したあとでも書ける。記録はレッスンが終わってから書くものなので。
 */
export function LessonNoteEditor({ lessonId, note }: { lessonId: string; note?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(note ?? "");
  const [error, setError] = useState("");
  const { locked: saving, run } = useSubmitLock();

  async function save() {
    setError("");
    await run(async () => {
      try {
        assertActionOk(await saveLessonNoteAction(lessonId, value));
        setOpen(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "保存できませんでした");
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { setValue(note ?? ""); setOpen(true); }}
        className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-xl py-2 transition"
      >
        <Pencil size={13} /> {note?.trim() ? "記録を書き直す" : "今日やったことを記録する"}
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-xl border border-indigo-200 bg-indigo-50/50 p-2.5">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        autoFocus
        placeholder="例）下半身中心。スクワット20kg×10×3。腰に違和感ありと申告、最後は軽めに。"
        className="w-full px-2.5 py-2 rounded-lg border border-gray-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <p className="text-[10px] text-gray-500 mt-1">次に担当する人がここを読みます。</p>
      {error && <p className="text-[11px] text-red-600 mt-1">{error}</p>}
      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={() => { setOpen(false); setError(""); }}
          className="flex-1 py-2 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
        >
          キャンセル
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition"
        >
          {saving ? <Spinner size={13} /> : <Check size={13} />} 保存する
        </button>
      </div>
    </div>
  );
}

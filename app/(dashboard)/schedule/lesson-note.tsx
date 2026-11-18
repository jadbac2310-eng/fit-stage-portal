"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check } from "lucide-react";
import { useSubmitLock } from "@/lib/use-submit-lock";
import { Spinner } from "@/components/ui/spinner";
import { assertActionOk } from "@/lib/action-result";
import { saveLessonNoteAction } from "../lessons/regular/actions";
import { saveTrialHandoverNoteAction } from "../lessons/trial/actions";
import { useT } from "@/components/i18n/lang-provider";

/**
 * その回の記録（備考）を、担当トレーナーがその場で書けるようにする。
 *
 * レッスン全体の編集は「管理者か、追加した本人」に限っている。
 * それだと、坂根さんが入れた予定を担当した渡辺さんが記録を書けず、
 * 引き継ぎが成立しない。ここは備考だけを書き換える専用の口にして、
 * 日時・金額・お客さまには触れないようにしている。
 *
 * 完了したあとでも書ける。記録はレッスンが終わってから書くものなので。
 *
 * 体験（trial）でも同じ口を使う（2026-11-15〜）。体験は申込内容が備考に入っているので、
 * 引き継ぎは別の列（trial_lessons.handover_note）に保存する。
 */
export function LessonNoteEditor({ lessonId, note, trial = false }: { lessonId: string; note?: string; trial?: boolean }) {
  const router = useRouter();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(note ?? "");
  const [error, setError] = useState("");
  const { locked: saving, run } = useSubmitLock();

  async function save() {
    setError("");
    await run(async () => {
      try {
        assertActionOk(trial
          ? await saveTrialHandoverNoteAction(lessonId, value)
          : await saveLessonNoteAction(lessonId, value));
        setOpen(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : t("保存できませんでした", "Couldn't save"));
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
        <Pencil size={13} /> {trial
          ? (note?.trim() ? t("引き継ぎを書き直す", "Edit handover") : t("次の人への引き継ぎを書く", "Write a handover for the next coach"))
          : (note?.trim() ? t("記録を書き直す", "Edit session notes") : t("今日やったことを記録する", "Write today's session notes"))}
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
        placeholder={trial
          ? t("例）姿勢改善が目的。右肩が上がりにくい。スクワットは自重で膝が内に入る。次回はフォームづくりから。", "e.g. Goal: posture. Right shoulder is tight. Knees cave in on bodyweight squats. Start with form next time.")
          : t("例）下半身中心。スクワット20kg×10×3。腰に違和感ありと申告、最後は軽めに。", "e.g. Lower body. Squat 20kg x10 x3. Mentioned lower-back discomfort, kept the end light.")}
        className="w-full px-2.5 py-2 rounded-lg border border-gray-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <p className="text-[10px] text-gray-500 mt-1">{t("次に担当する人がここを読みます。", "The next coach will read this.")}</p>
      {error && <p className="text-[11px] text-red-600 mt-1">{error}</p>}
      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={() => { setOpen(false); setError(""); }}
          className="flex-1 py-2 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
        >
          {t("キャンセル", "Cancel")}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition"
        >
          {saving ? <Spinner size={13} /> : <Check size={13} />} {t("保存する", "Save")}
        </button>
      </div>
    </div>
  );
}

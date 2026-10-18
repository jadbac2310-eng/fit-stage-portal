"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useSubmitLock } from "@/lib/use-submit-lock";
import { assertActionOk } from "@/lib/action-result";
import { setLessonStatusAction } from "../lessons/regular/actions";
import { setTrialLessonStatusAction } from "../lessons/trial/actions";
import type { PendingLessonRow } from "@/lib/trainer-stats";

function yen(n: number) {
  return `¥${n.toLocaleString("ja-JP")}`;
}

function dateLabel(iso: string): string {
  const d = new Date(iso);
  const wd = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()}(${wd})`;
}

function Row({ row, onDone }: { row: PendingLessonRow; onDone: () => void }) {
  const { locked, run } = useSubmitLock();
  const [error, setError] = useState("");

  function complete() {
    run(async () => {
      try {
        assertActionOk(row.isTrial
          ? await setTrialLessonStatusAction(row.lessonId, "completed")
          : await setLessonStatusAction(row.lessonId, "completed"));
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "変更に失敗しました");
      }
    });
  }

  return (
    <div className="flex items-center gap-2 py-2 border-t border-amber-200/70 first:border-t-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">
          {row.customerName}
          {row.isTrial && <span className="ml-1.5 text-[10px] font-medium text-purple-600">体験</span>}
        </p>
        <p className="text-[11px] text-gray-500 mt-0.5">
          {dateLabel(row.scheduledAt)}{row.course ? ` ／ ${row.course}` : ""}
        </p>
        {error && <p className="text-[11px] text-red-500 mt-0.5">{error}</p>}
      </div>
      <span className="text-sm font-bold text-amber-700 whitespace-nowrap">+{yen(row.amount)}</span>
      <button
        type="button"
        onClick={complete}
        disabled={locked}
        className="flex items-center gap-1 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg px-2.5 py-1.5 transition disabled:opacity-50"
      >
        {locked ? <Spinner size={12} /> : <CheckCircle size={12} />} 完了
      </button>
    </div>
  );
}

/**
 * 終わったのに「予定」のままのレッスン。
 * 完了にしないと歩合にならないので、増える歩合の金額と一緒に出す。
 */
export function PendingLessonsCard({ rows }: { rows: PendingLessonRow[] }) {
  const router = useRouter();
  const [done, setDone] = useState<string[]>([]);
  const left = rows.filter((r) => !done.includes(r.id));
  if (left.length === 0) return null;

  const total = left.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4 mb-6">
      <div className="flex items-start gap-2 mb-1">
        <AlertTriangle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-amber-900">完了にしていないレッスンが{left.length}件あります</p>
          <p className="text-xs text-amber-700 mt-0.5">
            完了にすると、あなたの歩合が <span className="font-bold">{yen(total)}</span> 増えます
          </p>
        </div>
      </div>
      <div className="mt-2">
        {left.slice(0, 8).map((r) => (
          <Row
            key={r.id}
            row={r}
            onDone={() => { setDone((d) => [...d, r.id]); router.refresh(); }}
          />
        ))}
      </div>
      {/* 9件目以降も開けるようにする。完了にしないと歩合にならないので、
          隠れたままだと取りこぼしになる */}
      {left.length > 8 && (
        <details className="mt-2">
          <summary className="cursor-pointer list-none text-[11px] font-semibold text-amber-800 hover:underline">
            ほか{left.length - 8}件を表示
          </summary>
          <div className="mt-1">
            {left.slice(8).map((r) => (
              <Row
                key={r.id}
                row={r}
                onDone={() => { setDone((d) => [...d, r.id]); router.refresh(); }}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

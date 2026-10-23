import Link from "next/link";
import { ClipboardList, Target, History } from "lucide-react";
import type { Lesson } from "@/lib/lessons-types";
import type { TrialLesson } from "@/lib/trial-lessons-types";
import { parseTrialNote } from "@/lib/trial-note";

/**
 * 引き継ぎの申し送り。
 *
 * 同じお客さまを複数のトレーナーで見るとき、次に入る人がこの画面だけで
 *   ・そもそも何に困って来た人か（最初の困りごと・目的）
 *   ・前回までに何をしたか
 * を読めるようにする。レッスンごとの備考は書けても、読む導線が無いと引き継ぎにならない。
 */

/**
 * 申込フォームの項目のうち、引き継ぎで読む必要がないもの。
 *
 * 本人確認やお金の話は、次に入るトレーナーがレッスン前に読むものではないので落とす。
 * ここに無い項目は出す（フォームに項目が増えても勝手に拾えるようにするため）。
 */
const SKIP = /フリガナ|ふりがな|氏名|名前|電話|メール|住所|郵便|生年月日|年齢|性別|支払|料金|プラン|紹介|予約|希望日|店舗/;

function handoverItems(trial: TrialLesson | null) {
  if (!trial?.note) return [];
  return parseTrialNote(trial.note).items.filter((i) => !SKIP.test(i.label) && i.value);
}

function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString("ja-JP", {
    month: "numeric", day: "numeric", weekday: "short", timeZone: "Asia/Tokyo",
  });
}

export function Handover({ trial, history }: { trial: TrialLesson | null; history: Lesson[] }) {
  const items = handoverItems(trial);
  // 備考が書いてある回だけ出す。空の回を並べても引き継ぎの役に立たないため
  const withNote = history.filter((l) => l.note?.trim());

  if (items.length === 0 && history.length === 0) return null;

  return (
    <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-1.5 mb-3">
        <ClipboardList size={14} className="text-indigo-600" />
        <p className="text-xs font-bold text-gray-700">引き継ぎ</p>
      </div>

      {/* 最初の困りごと・目的 */}
      {items.length > 0 && (
        <div className="mb-3">
          <p className="text-[11px] font-semibold text-gray-500 flex items-center gap-1 mb-1.5">
            <Target size={11} className="text-amber-500" /> 最初の困りごと・目的
          </p>
          <div className="rounded-xl bg-amber-50/60 border border-amber-100 px-3 py-2 space-y-1">
            {items.map((i) => (
              <p key={i.label} className="text-xs text-gray-700">
                <span className="text-gray-500">{i.label}</span>
                <span className="mx-1 text-gray-300">/</span>
                <span className="font-medium whitespace-pre-wrap">{i.value}</span>
              </p>
            ))}
          </div>
          {trial && (
            <Link href={`/schedule/${trial.id}`} className="text-[11px] text-blue-600 hover:underline mt-1 inline-block">
              体験レッスンの記録を見る →
            </Link>
          )}
        </div>
      )}

      {/* 前回までにやったこと */}
      <div>
        <p className="text-[11px] font-semibold text-gray-500 flex items-center gap-1 mb-1.5">
          <History size={11} className="text-gray-400" /> 前回までの記録
        </p>
        {withNote.length === 0 ? (
          <p className="text-xs text-gray-400">
            {history.length === 0
              ? "このお客さまは今回が初めてです。"
              : `直近${history.length}回ぶんに備考がありません。レッスン後に「何をしたか」を残すと、次の担当に伝わります。`}
          </p>
        ) : (
          <div className="space-y-1.5">
            {withNote.map((l) => (
              <Link
                key={l.id}
                href={`/schedule/${l.id}`}
                className="block rounded-xl bg-gray-50 hover:bg-gray-100 transition px-3 py-2"
              >
                <p className="text-[11px] text-gray-500">
                  {fmtShort(l.scheduledAt)}
                  <span className="mx-1 text-gray-300">/</span>
                  {l.trainerMemberName ?? "担当未設定"}
                </p>
                <p className="text-xs text-gray-800 whitespace-pre-wrap mt-0.5">{l.note}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import Link from "next/link";
import { ClipboardList, Target, History } from "lucide-react";
import { parseTrialNote } from "@/lib/trial-note";
import { makeT, dateLocale, type Lang } from "@/lib/i18n";

/**
 * 引き継ぎの申し送り。
 *
 * 同じお客さまを複数のトレーナーで見るとき、次に入る人がこの画面だけで
 *   ・そもそも何に困って来た人か（最初の困りごと・目的）
 *   ・前回までに何をしたか
 * を読めるようにする。レッスンごとの備考は書けても、読む導線が無いと引き継ぎにならない。
 */

/**
 * 申込フォームの項目のうち、引き継ぎの「目的」の欄に出さないもの。
 *
 * 本人確認やお金の話は、次に入るトレーナーがレッスン前に読むものではないので落とす。
 * 年齢・性別・人数は、いちばん上の1行（体験の日付・担当の横）にまとめて出す（2026-11-21 尚樹）。
 * ここに無い項目は出す（フォームに項目が増えても勝手に拾えるようにするため）。
 */
const SKIP = /フリガナ|ふりがな|氏名|名前|電話|メール|住所|郵便|生年月日|年齢|性別|利用人数|人数|支払|料金|プラン|紹介|予約|希望日|店舗|経路|参照元|最初に開いたページ|UTM/;

/** レッスンの前に見ておきたい本人のこと（年齢・性別・人数）を拾う */
function profileOf(items: { label: string; value: string }[]): string[] {
  const pick = (re: RegExp) => items.find((i) => re.test(i.label))?.value?.trim();
  const out: string[] = [];
  const age = pick(/^年齢/);
  const gender = pick(/^性別/);
  const people = pick(/人数/);
  if (age) out.push(age);
  if (gender && !/回答しない/.test(gender)) out.push(gender);
  if (people && /2/.test(people)) out.push(people.includes("名") ? people : `${people}名`);
  return out;
}

/**
 * 必要な項目だけを受け取る形にしておく。
 * 予定の詳細ページ（Lesson）からも、スケジュール一覧の展開カード（ScheduleItem）からも
 * 同じ見た目で出せるようにするため。
 */
export interface HandoverLesson {
  id: string;
  scheduledAt: string;
  /** 誰が書いたか。引き継ぎでは「前回だれが見たか」が要る */
  trainerName?: string;
  note?: string;
}
export interface HandoverTrial {
  id: string;
  note?: string;
  /** 体験のときに担当が書いた記録（trial_lessons.handover_note。2026-11-15〜） */
  handoverNote?: string;
  trainerName?: string;
  scheduledAt?: string;
}

/** 新しい順に、最初からこの回数だけ見せる。もっと前は「もっと前の記録」を開くと出る */
const SHOW_FIRST = 3;

function fmtShort(iso: string, lang: Lang = "ja") {
  return new Date(iso).toLocaleDateString(dateLocale(lang), {
    month: "numeric", day: "numeric", weekday: "short", timeZone: "Asia/Tokyo",
  });
}

function RecordLink({ l, lang }: { l: HandoverLesson; lang: Lang }) {
  const t = makeT(lang);
  return (
    <Link href={`/schedule/${l.id}`} className="block rounded-xl bg-gray-50 hover:bg-gray-100 transition px-3 py-2">
      <p className="text-[11px] text-gray-500">
        {fmtShort(l.scheduledAt, lang)}
        <span className="mx-1 text-gray-300">/</span>
        {l.trainerName ?? t("担当未設定", "No coach")}
      </p>
      <p className="text-xs text-gray-800 whitespace-pre-wrap mt-0.5">{l.note}</p>
    </Link>
  );
}

/**
 * 並びは「最初の体験（いつ・誰が・年齢など・目的・体験の記録）」→「前回までの記録（新しい順）」。
 * 体験のことを1つの枠にまとめ、箱を増やさない（尚樹「あまり散らかさないで」）。
 * history は新しい順で、何回分渡してもよい（最初の3回だけ見せ、残りはたたむ）。
 */
export function Handover({ trial, history, lang = "ja" }: { trial?: HandoverTrial | null; history: HandoverLesson[]; lang?: Lang }) {
  const t = makeT(lang);
  const all = trial?.note ? parseTrialNote(trial.note).items.filter((i) => i.value) : [];
  const items = all.filter((i) => !SKIP.test(i.label));
  const profile = profileOf(all);
  // 備考が書いてある回だけ出す。空の回を並べても引き継ぎの役に立たないため
  const withNote = history.filter((l) => l.note?.trim());
  const recent = withNote.slice(0, SHOW_FIRST);
  const older = withNote.slice(SHOW_FIRST);

  const trialMemo = trial?.handoverNote?.trim();
  const showTrial = !!trial && (items.length > 0 || profile.length > 0 || !!trialMemo || !!trial.scheduledAt);
  if (!showTrial && history.length === 0) return null;

  return (
    <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-1.5 mb-3">
        <ClipboardList size={14} className="text-indigo-600" />
        <p className="text-xs font-bold text-gray-700">{t("引き継ぎ", "Handover")}</p>
      </div>

      {/* 最初の体験：いつ・誰が・年齢など → 目的 → 体験の記録 */}
      {showTrial && (
        <div className="mb-3">
          <p className="text-[11px] font-semibold text-gray-500 flex items-center gap-1 mb-1.5">
            <Target size={11} className="text-amber-500" /> {t("最初の体験レッスン", "First trial session")}
          </p>
          <div className="rounded-xl bg-amber-50/60 border border-amber-100 px-3 py-2 space-y-1">
            <p className="text-[11px] text-gray-500">
              {trial!.scheduledAt ? fmtShort(trial!.scheduledAt, lang) : t("体験", "Trial")}
              <span className="mx-1 text-gray-300">/</span>
              {trial!.trainerName ?? t("担当未設定", "No coach")}
              {profile.length > 0 && (
                <>
                  <span className="mx-1 text-gray-300">/</span>
                  <span className="font-semibold text-gray-800">{profile.join("・")}</span>
                </>
              )}
            </p>
            {items.map((i) => (
              <p key={i.label} className="text-xs text-gray-700">
                <span className="text-gray-500">{i.label}</span>
                <span className="mx-1 text-gray-300">/</span>
                <span className="font-medium whitespace-pre-wrap">{i.value}</span>
              </p>
            ))}
            {trialMemo && (
              <div className="pt-1.5 mt-1 border-t border-amber-100">
                <p className="text-[11px] text-gray-500">{t("体験の記録", "Trial notes")}</p>
                <p className="text-xs text-gray-800 whitespace-pre-wrap mt-0.5">{trialMemo}</p>
              </div>
            )}
          </div>
          <Link href={`/schedule/${trial!.id}`} className="text-[11px] text-blue-600 hover:underline mt-1 inline-block">
            {trialMemo ? t("体験レッスンを開く →", "Open the trial →") : t("体験レッスンを開く（記録を書く）→", "Open the trial (write notes) →")}
          </Link>
        </div>
      )}

      {/* 前回までにやったこと（新しい順。最初の3回だけ見せ、もっと前はたたむ） */}
      <div>
        <p className="text-[11px] font-semibold text-gray-500 flex items-center gap-1 mb-1.5">
          <History size={11} className="text-gray-400" /> {t("前回までの記録", "Previous sessions")}
        </p>
        {withNote.length === 0 ? (
          <p className="text-xs text-gray-400">
            {history.length === 0
              ? t("このお客さまは今回が初めての通常レッスンです。", "This is their first regular session.")
              : t("これまでの回に記録がありません。レッスン後に「何をしたか」を残すと、次の担当に伝わります。", "No notes on earlier sessions yet. Write what you did after each session so the next coach knows.")}
          </p>
        ) : (
          <div className="space-y-1.5">
            {recent.map((l) => <RecordLink key={l.id} l={l} lang={lang} />)}
            {older.length > 0 && (
              <details className="group">
                <summary className="cursor-pointer list-none text-[11px] text-blue-600 hover:underline py-1">
                  <span className="group-open:hidden">{t(`もっと前の記録を見る（${older.length}回）`, `Show earlier sessions (${older.length})`)}</span>
                  <span className="hidden group-open:inline">{t("たたむ", "Hide")}</span>
                </summary>
                <div className="space-y-1.5 mt-1">
                  {older.map((l) => <RecordLink key={l.id} l={l} lang={lang} />)}
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

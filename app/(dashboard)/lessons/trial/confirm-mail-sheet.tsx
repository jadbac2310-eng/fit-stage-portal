"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lightbulb, Check, ExternalLink, Sparkles, RotateCcw } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Spinner } from "@/components/ui/spinner";
import { useSubmitLock } from "@/lib/use-submit-lock";
import { parseTrialNote } from "@/lib/trial-note";
import type { TrialLesson } from "@/lib/trial-lessons-types";
import { buildConfirmMail, findStore, hintsFromApplication, isPair } from "@/lib/trial-confirm-mail";
import { sendTrialConfirmMailAction, suggestTrialPersonalNoteAction } from "./actions";

/**
 * 体験レッスンの「ご予約確定」メールを送る画面（2026-11-14〜）。
 * 名前・日時・店舗・担当は予約から自動で入る。お客様の申込内容に合わせた「ひとこと」も
 * 開いたときに自動で下書きが入る（AIで作文。lib/trial-personal-note.ts）。下の目印を見ながら直せる。
 * 本文はそのまま直接直すこともできる。
 */
export function ConfirmMailSheet({ lesson, email, storeName, mailFrom, sent, onClose }: {
  lesson: TrialLesson;
  email?: string;
  storeName?: string;          // 店舗マスタの名前（予約に店舗が入っているとき）
  mailFrom: string | null;     // 送信元の Gmail（未設定なら Gmail で開く）
  sent?: { at: string; by?: string };
  onClose: () => void;
}) {
  const router = useRouter();
  const { locked, run } = useSubmitLock();
  const items = useMemo(() => parseTrialNote(lesson.note).items, [lesson.note]);
  const get = (l: string) => items.find((x) => x.label === l)?.value;
  const store = findStore(storeName, get("希望店舗"), lesson.location);
  const hints = useMemo(() => hintsFromApplication(items), [items]);

  const [to, setTo] = useState(email ?? "");
  const [personalNote, setPersonalNote] = useState("");
  // ひとことの下書き：開いたときに1回作る。作っている間に手で書き始めたら上書きしない
  const [noteLoading, setNoteLoading] = useState(true);
  const [noteBy, setNoteBy] = useState<"ai" | "template" | null>(null);
  const typedRef = useRef(false);
  const suggest = useRef(async (force: boolean) => {
    setNoteLoading(true);
    try {
      const r = await suggestTrialPersonalNoteAction(lesson.id);
      if (r.ok && (force || !typedRef.current)) { setPersonalNote(r.text); setNoteBy(r.text ? r.by : null); typedRef.current = false; }
    } catch { /* 下書きが作れなくても、空欄のまま手で書ける */ }
    setNoteLoading(false);
  });
  useEffect(() => { void suggest.current(false); }, []);
  const base = buildConfirmMail({
    customerName: lesson.customerName,
    scheduledAt: lesson.scheduledAt,
    store,
    placeText: store ? undefined : lesson.location,
    trainerName: lesson.trainerMemberName,
    pair: isPair(get("利用人数")),
    personalNote,
  });
  const [subject, setSubject] = useState(base.subject);
  // 本文を手で直したら、それ以降は「ひとこと」を変えても上書きしない
  const [editedBody, setEditedBody] = useState<string | null>(null);
  const body = editedBody ?? base.body;
  const [error, setError] = useState<string | null>(null);
  // 開いた時点の時刻で過去かどうかを見る（描画のたびに時刻を読まない）
  const [openedAt] = useState(() => Date.now());
  const [done, setDone] = useState<string | null>(null);

  const warnings: string[] = [];
  if (!lesson.trainerMemberName) warnings.push("担当トレーナーが未設定です（本文に担当の行が入りません）");
  if (!store && !lesson.location) warnings.push("店舗・場所が分かりません。本文の「場所」を書き換えてください");
  if (new Date(lesson.scheduledAt).getTime() < openedAt) warnings.push("日時が過去になっています。予約の日時を確認してください");

  async function send() {
    setError(null);
    await run(async () => {
      let r = await sendTrialConfirmMailAction(lesson.id, { to, subject, body });
      // 10分以内に送っていたら確認してから送り直す（ロックの中で続けて呼ぶ）
      if (!r.ok && r.duplicate && confirm(r.error)) {
        r = await sendTrialConfirmMailAction(lesson.id, { to, subject, body }, { force: true });
      }
      if (r.ok) { setDone(r.to); router.refresh(); return; }
      if (!r.duplicate) setError(r.error);
    });
  }

  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const label = "block text-xs font-semibold text-gray-500 mb-1";
  const input = "w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-400";

  if (done) return (
    <BottomSheet title="確定メールを送りました" onClose={onClose}>
      <div className="flex items-start gap-2 text-sm text-gray-700">
        <Check size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
        <p>{lesson.customerName} 様（{done}）へ送りました。Gmail の「送信済み」にも残っています。</p>
      </div>
      <button onClick={onClose} className="mt-4 w-full rounded-xl bg-gray-900 text-white text-sm font-semibold py-2.5">閉じる</button>
    </BottomSheet>
  );

  return (
    <BottomSheet title={`確定メール — ${lesson.customerName}`} onClose={onClose} scrollable>
      <div className="space-y-4">
        {sent && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {new Date(sent.at).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" })}
            {sent.by ? `に${sent.by}さんが` : "に"}送信済みです。日時を変えたときなどは、もう一度送れます。
          </p>
        )}
        {warnings.map((w) => (
          <p key={w} className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{w}</p>
        ))}

        <div>
          <label className={label}>宛先</label>
          <input type="email" value={to} onChange={(e) => setTo(e.target.value)} className={input} placeholder="お客様のメールアドレス" />
        </div>

        {hints.length > 0 && (
          <div className="rounded-xl bg-blue-50 border border-blue-200 px-3 py-2.5">
            <p className="flex items-center gap-1 text-xs font-semibold text-blue-700 mb-1"><Lightbulb size={13} />申込内容から、一言足すとよさそうなこと</p>
            <ul className="space-y-1">
              {hints.map((h) => <li key={h} className="text-xs text-blue-900 leading-relaxed">・{h}</li>)}
            </ul>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-gray-500">ひとこと（お客様に合わせた下書き・直せます）</label>
            <button type="button" disabled={noteLoading || editedBody !== null}
              onClick={() => { if (!typedRef.current || confirm("書いた内容を消して、下書きを作り直しますか？")) void suggest.current(true); }}
              className="flex items-center gap-1 text-xs text-blue-600 disabled:text-gray-300">
              {noteLoading ? <Spinner size={11} /> : <RotateCcw size={11} />}{noteLoading ? "作成中..." : "作り直す"}
            </button>
          </div>
          <textarea
            value={personalNote}
            onChange={(e) => { typedRef.current = true; setPersonalNote(e.target.value); }}
            disabled={editedBody !== null}
            rows={3}
            className={input}
            placeholder={noteLoading ? "お客様の申込内容から下書きを作っています…" : "例：来年6月の結婚式に向けて、ドレスを綺麗に着こなせるお身体づくりを、一緒に考えさせていただきます。"}
          />
          {noteBy && !noteLoading && (
            <p className="flex items-center gap-1 text-xs text-gray-400 mt-1">
              <Sparkles size={11} />{noteBy === "ai" ? "申込内容からAIが作った下書きです。読んでから送ってください。" : "決まった言い回しの下書きです。必要なら直してください。"}
            </p>
          )}
          {editedBody !== null && (
            <p className="text-xs text-gray-400 mt-1">
              本文を直接直したので、ひとことは本文の中で直してください。
              <button type="button" onClick={() => setEditedBody(null)} className="text-blue-600 underline ml-1">本文を元に戻す</button>
            </p>
          )}
        </div>

        <div>
          <label className={label}>件名</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className={input} />
        </div>

        <div>
          <label className={label}>本文（そのまま直せます）</label>
          <textarea value={body} onChange={(e) => setEditedBody(e.target.value)} rows={16} className={`${input} font-mono text-[13px] leading-relaxed`} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {mailFrom ? (
          <>
            <button onClick={send} disabled={locked}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-3 disabled:opacity-60">
              {locked ? <Spinner size={14} /> : <Mail size={15} />}{locked ? "送信中..." : "この内容で送信する"}
            </button>
            <p className="text-xs text-gray-400 text-center">送信元：{mailFrom}</p>
          </>
        ) : (
          <>
            <a href={gmailUrl} target="_blank" rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 text-white text-sm font-semibold py-3">
              <ExternalLink size={15} />Gmail で開いて送る
            </a>
            <p className="text-xs text-gray-400 text-center">ポータルからの送信設定がまだないため、Gmail の作成画面に内容を入れて開きます。</p>
          </>
        )}
      </div>
    </BottomSheet>
  );
}

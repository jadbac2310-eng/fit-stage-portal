"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, ChevronDown, ChevronUp, Plus, X, Trash2, ExternalLink, CalendarClock,
  MessageSquareText, Phone, Lightbulb, UserRound, Pencil, CalendarCheck, Info, ClipboardList,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { MemberLabel } from "@/components/ui/member-label";
import { useSubmitLock } from "@/lib/use-submit-lock";
import { assertActionOk, type ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/cn";
import {
  SALES_PRIORITIES, SALES_STATUSES, STATUS_TONE_CLASS, LOG_KINDS, LOG_KIND_CLASS,
  statusTone, isOverdue,
  type SalesTarget, type SalesTargetLog,
} from "@/lib/sales-targets-types";
import {
  updateSalesProgressAction, updateSalesStatusAction, updateSalesInfoAction,
  addSalesLogAction, deleteSalesLogAction, createSalesTargetAction, deleteSalesTargetAction,
} from "./actions";

type MemberLite = { id: string; name: string; avatarUrl?: string };

function pad(n: number) { return String(n).padStart(2, "0"); }

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function nowTime(): string {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function mdLabel(ymd: string): string {
  const [, m, d] = ymd.split("-");
  return `${Number(m)}/${Number(d)}`;
}

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];

/** 日本時間で「10/23(木) 14:00」 */
function whenLabel(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${WEEK[d.getUTCDay()]}) ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

const inputClass = "w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
const labelClass = "text-xs font-semibold text-gray-600 mb-1.5 block";

function SubmitButtons({ locked, label, onCancel }: { locked: boolean; label: string; onCancel?: () => void }) {
  return (
    <div className="flex gap-2">
      {onCancel && (
        <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">キャンセル</button>
      )}
      <button type="submit" disabled={locked} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold transition flex items-center justify-center gap-2">
        {locked && <Spinner size={14} />}{locked ? "保存中..." : label}
      </button>
    </div>
  );
}

/** フォーム送信 → サーバーアクション → 再読込、の共通処理 */
function useActionForm(action: (fd: FormData) => Promise<ActionResult>, onDone?: () => void) {
  const router = useRouter();
  const { locked, run } = useSubmitLock();
  const [error, setError] = useState("");
  async function submit(fd: FormData) {
    setError("");
    await run(async () => {
      try { assertActionOk(await action(fd)); router.refresh(); onDone?.(); }
      catch (e) { setError(e instanceof Error ? e.message : "保存に失敗しました"); }
    });
  }
  return { locked, error, submit };
}

// ─── 営業の進め方（全員共通） ─────────────────────────────
function Playbook() {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between gap-2 text-left">
        <span className="flex items-center gap-2 text-sm font-bold text-amber-900">
          <Lightbulb size={16} /> 営業の進め方（はじめに読む）
        </span>
        {open ? <ChevronUp size={16} className="text-amber-700" /> : <ChevronDown size={16} className="text-amber-700" />}
      </button>

      <div className="mt-3 space-y-3 text-sm text-amber-950">
        <div>
          <p className="text-xs font-bold text-amber-800 mb-1">どのホテルでも伝える3つ</p>
          <ul className="list-disc pl-5 space-y-0.5">
            <li>客室・館内ジムへトレーナーが伺う（ホテル側の準備は不要）</li>
            <li>英語・イタリア語・日本語で対応できる</li>
            <li>前日〜当日の予約にも対応できる</li>
          </ul>
        </div>

        {open && (
          <>
            <div>
              <p className="text-xs font-bold text-amber-800 mb-1">ゲスト向けの料金（税込）</p>
              <p>1名60分 ¥9,900／1名90分 ¥13,500／2名60分 ¥13,500。体験料金はなし。</p>
              <a href="https://www.fitstage.jp/en/hotel/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-700 hover:underline mt-0.5">
                ホテル向け英語ページ（先方に見せる用） <ExternalLink size={11} />
              </a>
            </div>
            <div>
              <p className="text-xs font-bold text-amber-800 mb-1">下調べで分かったこと（2026年10月）</p>
              <ul className="list-disc pl-5 space-y-0.5">
                <li>英語で指導できるトレーナーがいると公式に書いているホテルは1軒もない</li>
                <li>1回だけ受けられて料金も出ているのは、フォーシーズンズ（60分20,000円）とパティーナ（105分41,800円）だけ</li>
                <li>パーソナルがない・公式に書いていないホテルが半分。ジムだけのところは提案が通りやすい</li>
                <li>各ホテルの詳しい情報は「ホテル情報」に書いてある。「記載なし」は公式に書いていないだけなので、電話で確認する</li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold text-amber-800 mb-1">窓口</p>
              <p>ジムではなくコンシェルジュ（ゲストリレーション）。館内に専属トレーナーがいるホテルでは、競合ではなく「語学・時間外の補完」として話す。</p>
            </div>
            <div>
              <p className="text-xs font-bold text-amber-800 mb-1 flex items-center gap-1"><Phone size={12} /> 最初の電話で聞くこと</p>
              <ul className="list-disc pl-5 space-y-0.5">
                <li>宿泊のお客様からパーソナルトレーニングの依頼はあるか</li>
                <li>そのとき、1回だけ・英語でも手配できているか</li>
                <li>提案資料をお送りする場合の宛先（部署・担当者名）</li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold text-amber-800 mb-1">電話の切り出し（例）</p>
              <p className="bg-white/70 rounded-xl p-3 leading-relaxed">
                「お忙しいところ失礼いたします。大阪で出張パーソナルトレーニングを行っておりますFIT STAGEの〇〇と申します。
                海外からのお客様向けに、英語でのトレーニングを客室や館内ジムで1回からご提供しておりまして、
                ご案内の資料をお送りしたくご連絡いたしました。ご担当の方はいらっしゃいますでしょうか。」
              </p>
            </div>
            <div>
              <p className="text-xs font-bold text-amber-800 mb-1">記録の残し方</p>
              <ul className="list-disc pl-5 space-y-0.5">
                <li>電話・アポ・訪問をしたら、そのホテルの「やりとりを記録」に残す。日時を入れるとスケジュールにも入る</li>
                <li>アポが取れたら種類を「アポ」にして、アポの日時を入れる。担当者のスケジュールに入り、LINEでも知らせる</li>
                <li>「引き継ぎ」には今の状況を1〜2行でまとめておく。担当が替わっても、ここを読めば続きができるように</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── 引き継ぎ（今の状況） ───────────────────────────────
function HandoverSection({ target, members }: { target: SalesTarget; members: MemberLite[] }) {
  const [editing, setEditing] = useState(false);
  const form = useActionForm(updateSalesProgressAction.bind(null, target.id), () => setEditing(false));
  const assignee = members.find((m) => m.id === target.assigneeId);

  if (!editing) {
    const rows: [string, React.ReactNode][] = [
      ["担当", assignee ? <MemberLabel name={assignee.name} avatarUrl={assignee.avatarUrl} textClassName="text-sm" /> : <span className="text-amber-600">未割当</span>],
      ["状況", target.status],
      ["先方の担当者", target.contactPerson ?? <span className="text-gray-400">まだ分からない</span>],
      ["先方の連絡先", target.contactInfo ?? <span className="text-gray-400">—</span>],
      ["次にやること", target.nextAction || target.nextActionOn
        ? <>{target.nextActionOn && <span className="tabular-nums font-semibold mr-1">{mdLabel(target.nextActionOn)}まで</span>}{target.nextAction}</>
        : <span className="text-gray-400">—</span>],
    ];
    return (
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-gray-700 flex items-center gap-1"><ClipboardList size={13} /> 引き継ぎ</h3>
          <button onClick={() => setEditing(true)} className="text-xs text-blue-600 font-semibold inline-flex items-center gap-1"><Pencil size={12} />編集</button>
        </div>
        <dl className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[6.5rem_1fr] gap-2">
              <dt className="text-xs text-gray-500 pt-0.5">{k}</dt>
              <dd className="text-gray-900 min-w-0 break-words">{v}</dd>
            </div>
          ))}
          <div className="pt-1.5 border-t border-gray-200">
            <dt className="text-xs text-gray-500 mb-0.5">引き継ぎメモ</dt>
            <dd className="text-gray-900 whitespace-pre-wrap break-words">{target.memo ?? <span className="text-gray-400">今の状況を1〜2行で書いておく</span>}</dd>
          </div>
        </dl>
      </section>
    );
  }

  return (
    <section>
      <h3 className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1"><ClipboardList size={13} /> 引き継ぎを編集</h3>
      <form action={form.submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass} htmlFor={`assignee-${target.id}`}>担当</label>
            <select id={`assignee-${target.id}`} name="assigneeId" defaultValue={target.assigneeId ?? ""} className={inputClass}>
              <option value="">未割当</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor={`status-${target.id}`}>状況</label>
            <select id={`status-${target.id}`} name="status" defaultValue={target.status} className={inputClass}>
              {SALES_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.value}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass} htmlFor={`person-${target.id}`}>先方の担当者</label>
            <input id={`person-${target.id}`} name="contactPerson" defaultValue={target.contactPerson} placeholder="例: コンシェルジュ 山田様" className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor={`info-${target.id}`}>先方の連絡先</label>
            <input id={`info-${target.id}`} name="contactInfo" defaultValue={target.contactInfo} placeholder="電話・メール" className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div className="min-w-0">
            <label className={labelClass} htmlFor={`next-${target.id}`}>次にやること</label>
            <input id={`next-${target.id}`} name="nextAction" defaultValue={target.nextAction} placeholder="例: 資料をメールで送る" className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor={`due-${target.id}`}>期日</label>
            <input id={`due-${target.id}`} name="nextActionOn" type="date" defaultValue={target.nextActionOn} className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass} htmlFor={`memo-${target.id}`}>引き継ぎメモ</label>
          <textarea id={`memo-${target.id}`} name="memo" rows={3} defaultValue={target.memo} placeholder="例: 宿泊部の山田様が窓口。英語対応に興味あり。料金表を送って返事待ち" className={inputClass} />
        </div>
        {form.error && <p className="text-xs text-red-500">{form.error}</p>}
        <SubmitButtons locked={form.locked} label="保存する" onCancel={() => setEditing(false)} />
      </form>
    </section>
  );
}

// ─── やりとりの記録 ─────────────────────────────────────
function LogSection({
  target, logs, members, meId, isAdmin,
}: { target: SalesTarget; logs: SalesTargetLog[]; members: MemberLite[]; meId?: string; isAdmin: boolean }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState("電話");
  const del = useSubmitLock();
  const form = useActionForm(addSalesLogAction.bind(null, target.id), () => setAdding(false));
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const kindDef = LOG_KINDS.find((k) => k.value === kind) ?? LOG_KINDS[0];

  // 日時の新しい順（日時がないものは記録した日時で並べる）
  const sorted = useMemo(() => [...logs].sort((a, b) =>
    (b.occurredAt ?? b.createdAt).localeCompare(a.occurredAt ?? a.createdAt)), [logs]);

  function handleDelete(l: SalesTargetLog) {
    const msg = l.eventId ? "この記録を削除しますか？スケジュールに入れた予定も消えます。" : "この記録を削除しますか？";
    if (!confirm(msg)) return;
    del.run(async () => {
      try { assertActionOk(await deleteSalesLogAction(l.id)); router.refresh(); }
      catch (e) { alert(e instanceof Error ? e.message : "削除に失敗しました"); }
    });
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold text-gray-700 flex items-center gap-1"><MessageSquareText size={13} /> やりとりの記録</h3>
        {!adding && (
          <button onClick={() => setAdding(true)} className="text-xs text-blue-600 font-semibold inline-flex items-center gap-1"><Plus size={13} />記録する</button>
        )}
      </div>

      {adding && (
        <form action={form.submit} className="border-2 border-blue-300 rounded-xl p-3 space-y-3 mb-3">
          <div>
            <p className={labelClass}>種類</p>
            <div className="flex flex-wrap gap-1.5">
              {LOG_KINDS.map((k) => (
                <button
                  key={k.value} type="button" onClick={() => setKind(k.value)}
                  className={cn("px-3 py-1.5 rounded-full text-xs font-semibold border transition",
                    kind === k.value ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200")}
                >{k.value}</button>
              ))}
            </div>
            <input type="hidden" name="kind" value={kind} />
          </div>
          <div>
            <p className={labelClass}>{kindDef.hint}{kind === "アポ" && <span className="text-red-500"> *</span>}</p>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <input key={`d-${kind}`} name="date" type="date" defaultValue={kind === "アポ" ? "" : todayStr()} required={kind === "アポ"} aria-label="日付" className={inputClass} />
              <input key={`t-${kind}`} name="time" type="time" defaultValue={kind === "アポ" ? "" : nowTime()} required={kind === "アポ"} aria-label="時刻" className={inputClass} />
            </div>
            {kindDef.schedule && (
              <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                <CalendarCheck size={11} />日時を入れるとスケジュールに入ります{kind === "アポ" ? "（担当者にLINEでもお知らせ）" : ""}
              </p>
            )}
          </div>
          <div>
            <label className={labelClass} htmlFor={`lp-${target.id}`}>先方の担当者</label>
            <input id={`lp-${target.id}`} name="person" defaultValue={target.contactPerson} placeholder="例: コンシェルジュ 山田様" className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor={`lb-${target.id}`}>内容・結果</label>
            <textarea id={`lb-${target.id}`} name="body" rows={2} placeholder={kind === "アポ" ? "例: ロビーで15分。料金表と英語ページを持っていく" : "例: 担当不在。明日14時ごろにかけ直してほしいとのこと"} className={inputClass} />
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div className="min-w-0">
              <label className={labelClass} htmlFor={`ln-${target.id}`}>次にやること（任意）</label>
              <input id={`ln-${target.id}`} name="nextAction" placeholder="例: 明日14時にかけ直す" className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor={`lnd-${target.id}`}>期日</label>
              <input id={`lnd-${target.id}`} name="nextActionOn" type="date" className={inputClass} />
            </div>
          </div>
          {form.error && <p className="text-xs text-red-500">{form.error}</p>}
          <SubmitButtons locked={form.locked} label="記録する" onCancel={() => setAdding(false)} />
        </form>
      )}

      {sorted.length === 0 ? (
        !adding && <p className="text-xs text-gray-400">まだ記録はありません</p>
      ) : (
        <ol className="space-y-2.5">
          {sorted.map((l) => {
            const author = l.createdById ? memberById.get(l.createdById) : undefined;
            const canDelete = isAdmin || (!!meId && l.createdById === meId);
            return (
              <li key={l.id} className="border-l-2 border-gray-200 pl-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={cn("text-[11px] font-semibold rounded-md px-1.5 py-0.5", LOG_KIND_CLASS[l.kind] ?? LOG_KIND_CLASS["メモ"])}>{l.kind}</span>
                  <span className="text-xs font-semibold text-gray-700 tabular-nums">{whenLabel(l.occurredAt ?? l.createdAt)}</span>
                  {l.eventId && <span className="text-[11px] text-emerald-600 inline-flex items-center gap-0.5"><CalendarCheck size={11} />スケジュール</span>}
                  {canDelete && (
                    <button onClick={() => handleDelete(l)} aria-label="記録を削除" className="ml-auto p-1 text-gray-300 hover:text-red-500 transition"><Trash2 size={12} /></button>
                  )}
                </div>
                {l.person && <p className="text-xs text-gray-500 mt-0.5">先方：{l.person}</p>}
                {l.body !== l.kind && <p className="text-sm text-gray-800 mt-0.5 whitespace-pre-wrap break-words">{l.body}</p>}
                {author && <p className="text-[11px] text-gray-400 mt-0.5">記録：{author.name}</p>}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

// ─── ホテル情報 ───────────────────────────────────────
function InfoFields({ target }: { target?: SalesTarget }) {
  const id = target?.id ?? "new";
  return (
    <>
      <div>
        <label className={labelClass} htmlFor={`name-${id}`}>ホテル名 <span className="text-red-500">*</span></label>
        <input id={`name-${id}`} name="name" required defaultValue={target?.name} placeholder="例: ホテル〇〇大阪" className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor={`prio-${id}`}>優先度</label>
          <select id={`prio-${id}`} name="priority" defaultValue={target?.priority ?? "中"} className={inputClass}>
            {SALES_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor={`area-${id}`}>エリア</label>
          <input id={`area-${id}`} name="area" defaultValue={target?.area} placeholder="例: 梅田" className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass} htmlFor={`cp-${id}`}>窓口の目安</label>
        <input id={`cp-${id}`} name="contactPoint" defaultValue={target?.contactPoint} placeholder="例: コンシェルジュ" className={inputClass} />
      </div>
      <div>
        <label className={labelClass} htmlFor={`pitch-${id}`}>提案のポイント</label>
        <textarea id={`pitch-${id}`} name="pitch" rows={2} defaultValue={target?.pitch} placeholder="例: 海外客が多い。英語対応を押す" className={inputClass} />
      </div>
      <div>
        <label className={labelClass} htmlFor={`hi-${id}`}>ホテル情報</label>
        <textarea id={`hi-${id}`} name="hotelInfo" rows={6} defaultValue={target?.hotelInfo}
          placeholder={"外資系／国内系、何つ星か、客室数\nパーソナルの有無・料金\n英語対応 など"} className={inputClass} />
      </div>
      <div>
        <label className={labelClass} htmlFor={`url-${id}`}>公式サイト</label>
        <input id={`url-${id}`} name="url" type="url" defaultValue={target?.url} placeholder="https://" className={inputClass} />
      </div>
    </>
  );
}

function InfoSection({ target, isAdmin }: { target: SalesTarget; isAdmin: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const form = useActionForm(updateSalesInfoAction.bind(null, target.id), () => setEditing(false));
  const del = useSubmitLock();

  function handleDelete() {
    if (!confirm(`「${target.name}」をリストから削除しますか？やりとりの記録も消えます。`)) return;
    del.run(async () => {
      try { assertActionOk(await deleteSalesTargetAction(target.id)); router.refresh(); }
      catch (e) { alert(e instanceof Error ? e.message : "削除に失敗しました"); }
    });
  }

  if (editing) {
    return (
      <section>
        <h3 className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1"><Info size={13} /> ホテル情報を編集</h3>
        <form action={form.submit} className="space-y-3">
          <InfoFields target={target} />
          {form.error && <p className="text-xs text-red-500">{form.error}</p>}
          <SubmitButtons locked={form.locked} label="保存する" onCancel={() => setEditing(false)} />
        </form>
        {isAdmin && (
          <button onClick={handleDelete} disabled={del.locked} className="mt-3 text-xs text-gray-400 hover:text-red-500 inline-flex items-center gap-1">
            <Trash2 size={12} /> このホテルをリストから削除
          </button>
        )}
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold text-gray-700 flex items-center gap-1"><Info size={13} /> ホテル情報</h3>
        <button onClick={() => setEditing(true)} className="text-xs text-blue-600 font-semibold inline-flex items-center gap-1"><Pencil size={12} />編集</button>
      </div>
      <div className="text-sm text-gray-800 space-y-2">
        {target.contactPoint && <p><span className="text-xs text-gray-500 mr-1">窓口の目安</span>{target.contactPoint}</p>}
        {target.hotelInfo
          ? <p className="whitespace-pre-wrap break-words bg-gray-50 rounded-xl p-3 leading-relaxed">{target.hotelInfo}</p>
          : <p className="text-xs text-gray-400">まだ情報がありません</p>}
        {target.url && (
          <a href={target.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
            公式サイトを開く <ExternalLink size={11} />
          </a>
        )}
      </div>
    </section>
  );
}

// ─── 1軒の行 ───────────────────────────────────────────
function TargetRow({
  target, logs, members, meId, isAdmin, today,
}: {
  target: SalesTarget; logs: SalesTargetLog[]; members: MemberLite[];
  meId?: string; isAdmin: boolean; today: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const statusLock = useSubmitLock();
  const assignee = members.find((m) => m.id === target.assigneeId);
  const overdue = isOverdue(target, today);
  const latest = useMemo(() => [...logs].sort((a, b) =>
    (b.occurredAt ?? b.createdAt).localeCompare(a.occurredAt ?? a.createdAt))[0], [logs]);

  function changeStatus(value: string) {
    statusLock.run(async () => {
      try { assertActionOk(await updateSalesStatusAction(target.id, value)); router.refresh(); }
      catch (e) { alert(e instanceof Error ? e.message : "変更に失敗しました"); }
    });
  }

  return (
    <div className={cn("bg-white rounded-2xl border p-4", overdue ? "border-red-300" : "border-gray-200")}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-gray-900 leading-snug">{target.name}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-gray-500">
            {target.area && <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">{target.area}</span>}
            {assignee
              ? <MemberLabel name={assignee.name} avatarUrl={assignee.avatarUrl} textClassName="text-xs text-gray-700 font-medium" />
              : <span className="inline-flex items-center gap-1 text-amber-600 font-medium"><UserRound size={12} />担当 未割当</span>}
          </div>
        </div>
        <div className="flex-shrink-0 flex items-center gap-1">
          {statusLock.locked && <Spinner size={12} />}
          <select
            value={target.status}
            onChange={(e) => changeStatus(e.target.value)}
            disabled={statusLock.locked}
            aria-label={`${target.name}の状況`}
            className={cn("text-xs font-semibold rounded-full pl-3 pr-2 py-1 border-0 focus:outline-none focus:ring-2 focus:ring-blue-500", STATUS_TONE_CLASS[statusTone(target.status)])}
          >
            {SALES_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.value}</option>)}
          </select>
        </div>
      </div>

      {target.pitch && <p className="text-sm text-gray-700 mt-2">{target.pitch}</p>}

      {(target.nextAction || target.nextActionOn) && (
        <p className={cn("text-xs mt-2 flex items-center gap-1", overdue ? "text-red-600 font-semibold" : "text-gray-600")}>
          <CalendarClock size={12} className="flex-shrink-0" />
          {target.nextActionOn && <span className="tabular-nums flex-shrink-0">{mdLabel(target.nextActionOn)}{overdue ? "（期日切れ）" : ""}</span>}
          <span className="truncate">{target.nextAction}</span>
        </p>
      )}

      {latest && !open && (
        <p className="text-xs text-gray-400 mt-1.5 truncate">
          直近：{latest.kind} {whenLabel(latest.occurredAt ?? latest.createdAt)}{latest.body !== latest.kind ? `　${latest.body}` : ""}
        </p>
      )}

      {!open ? (
        <button onClick={() => setOpen(true)} className="mt-3 w-full py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-xs font-semibold text-gray-600 transition flex items-center justify-center gap-1">
          引き継ぎ・記録・ホテル情報 {logs.length > 0 && <span className="text-gray-400">（記録{logs.length}件）</span>}<ChevronDown size={14} />
        </button>
      ) : (
        <div className="border-t border-gray-100 mt-3 pt-4 space-y-5">
          <HandoverSection target={target} members={members} />
          <LogSection target={target} logs={logs} members={members} meId={meId} isAdmin={isAdmin} />
          <InfoSection target={target} isAdmin={isAdmin} />
          <button onClick={() => setOpen(false)} className="w-full py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-xs font-semibold text-gray-600 transition flex items-center justify-center gap-1">
            閉じる <ChevronUp size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── ホテルの追加 ─────────────────────────────────────
function AddTargetForm({ onClose }: { onClose: () => void }) {
  const form = useActionForm(createSalesTargetAction, onClose);
  return (
    <div className="bg-white rounded-2xl border-2 border-blue-400 p-5 mb-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold text-gray-900">ホテルを追加</p>
        <button onClick={onClose} aria-label="閉じる" className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
      </div>
      <form action={form.submit} className="space-y-3">
        <InfoFields />
        {form.error && <p className="text-xs text-red-500">{form.error}</p>}
        <SubmitButtons locked={form.locked} label="追加する" onCancel={onClose} />
      </form>
    </div>
  );
}

// ─── 一覧 ─────────────────────────────────────────────
type StatusFilter = "all" | "active" | "todo" | "closed";

export function SalesClient({
  targets, logs, members, meId, isAdmin,
}: {
  targets: SalesTarget[]; logs: SalesTargetLog[]; members: MemberLite[];
  meId?: string; isAdmin: boolean;
}) {
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showAdd, setShowAdd] = useState(false);
  const today = useMemo(() => todayStr(), []);

  const logsByTarget = useMemo(() => {
    const map = new Map<string, SalesTargetLog[]>();
    for (const l of logs) {
      const list = map.get(l.targetId) ?? [];
      list.push(l);
      map.set(l.targetId, list);
    }
    return map;
  }, [logs]);

  const filtered = useMemo(() => targets.filter((t) => {
    if (assigneeFilter === "me" && t.assigneeId !== meId) return false;
    if (assigneeFilter === "none" && t.assigneeId) return false;
    if (!["all", "me", "none"].includes(assigneeFilter) && t.assigneeId !== assigneeFilter) return false;
    const tone = statusTone(t.status);
    if (statusFilter === "todo" && tone !== "todo") return false;
    if (statusFilter === "active" && tone !== "doing") return false;
    if (statusFilter === "closed" && tone !== "won" && tone !== "off") return false;
    return true;
  }), [targets, assigneeFilter, statusFilter, meId]);

  const counts = useMemo(() => ({
    total:      targets.length,
    unassigned: targets.filter((t) => !t.assigneeId).length,
    active:     targets.filter((t) => statusTone(t.status) === "doing").length,
    won:        targets.filter((t) => t.status === "提携").length,
    overdue:    targets.filter((t) => isOverdue(t, today)).length,
  }), [targets, today]);

  const priorities = useMemo(() => {
    const known = SALES_PRIORITIES as readonly string[];
    const extra = [...new Set(targets.map((t) => t.priority).filter((p) => !known.includes(p)))];
    return [...known, ...extra];
  }, [targets]);

  const assignedMembers = useMemo(
    () => members.filter((m) => m.id !== meId && targets.some((t) => t.assigneeId === m.id)),
    [members, targets, meId],
  );

  const chip = (active: boolean) => cn(
    "px-3 py-1.5 rounded-full text-xs font-semibold border transition whitespace-nowrap",
    active ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50",
  );

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto pb-10">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Building2 size={20} className="text-slate-600" />
            <h1 className="text-xl font-bold text-gray-900">ホテル営業</h1>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">大阪・京都のホテルへの出張パーソナルの営業先リスト</p>
        </div>
        {!showAdd && (
          <button onClick={() => setShowAdd(true)} className="flex-shrink-0 inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3.5 py-2 rounded-xl transition">
            <Plus size={16} /> 追加
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: "全体", value: counts.total, cls: "text-gray-900" },
          { label: "担当 未割当", value: counts.unassigned, cls: counts.unassigned ? "text-amber-600" : "text-gray-900" },
          { label: "進行中", value: counts.active, cls: "text-blue-700" },
          { label: "提携", value: counts.won, cls: "text-emerald-700" },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 py-2 text-center">
            <p className={cn("text-lg font-bold tabular-nums", c.cls)}>{c.value}</p>
            <p className="text-[11px] text-gray-500">{c.label}</p>
          </div>
        ))}
      </div>
      {counts.overdue > 0 && (
        <p className="text-xs text-red-600 font-semibold mb-4">期日を過ぎた「次にやること」が {counts.overdue} 件あります（赤枠のホテル）</p>
      )}

      {showAdd && <AddTargetForm onClose={() => setShowAdd(false)} />}

      <Playbook />

      <div className="space-y-2 mb-5">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button className={chip(assigneeFilter === "all")} onClick={() => setAssigneeFilter("all")}>全員</button>
          {meId && <button className={chip(assigneeFilter === "me")} onClick={() => setAssigneeFilter("me")}>自分の担当</button>}
          <button className={chip(assigneeFilter === "none")} onClick={() => setAssigneeFilter("none")}>未割当</button>
          {assignedMembers.map((m) => (
            <button key={m.id} className={chip(assigneeFilter === m.id)} onClick={() => setAssigneeFilter(m.id)}>{m.name}</button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {([["all", "すべて"], ["todo", "未着手"], ["active", "進行中"], ["closed", "提携・見送り・保留"]] as const).map(([v, label]) => (
            <button key={v} className={chip(statusFilter === v)} onClick={() => setStatusFilter(v)}>{label}</button>
          ))}
        </div>
      </div>

      {targets.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm font-semibold text-gray-600">ホテルがまだありません</p>
          <p className="text-xs text-gray-400 mt-1">データベースの更新（npx supabase db push）が済むと、ホテル18軒が表示されます</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-gray-500 py-12">条件に合うホテルはありません</p>
      ) : (
        <div className="space-y-6">
          {priorities.map((p) => {
            const rows = filtered.filter((t) => t.priority === p);
            if (rows.length === 0) return null;
            return (
              <section key={p}>
                <h2 className="text-sm font-bold text-gray-900 mb-2">
                  優先度 {p}<span className="ml-1.5 text-xs font-normal text-gray-400">{rows.length}軒</span>
                </h2>
                <div className="space-y-2">
                  {rows.map((t) => (
                    <TargetRow
                      key={t.id} target={t} logs={logsByTarget.get(t.id) ?? []}
                      members={members} meId={meId} isAdmin={isAdmin} today={today}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

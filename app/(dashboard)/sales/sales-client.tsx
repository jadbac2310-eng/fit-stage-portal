"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, ChevronDown, ChevronUp, Plus, X, Trash2, ExternalLink, CalendarClock,
  Lightbulb, UserRound, Pencil, CalendarCheck, Users,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { MemberLabel } from "@/components/ui/member-label";
import { useSubmitLock } from "@/lib/use-submit-lock";
import { assertActionOk, type ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/cn";
import {
  SALES_PRIORITIES, SALES_STEPS, SALES_END_STATUSES, SALES_STATUSES, END_STATUS_CLASS,
  LOG_KINDS, LOG_KIND_CLASS, stepIndex, isOverdue,
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

function byWhenDesc(a: SalesTargetLog, b: SalesTargetLog) {
  return (b.occurredAt ?? b.createdAt).localeCompare(a.occurredAt ?? a.createdAt);
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

// ─── 進み具合のバー（テレアポ → 企画書作成 → 訪問） ─────────────
function StepBar({ status }: { status: string }) {
  const idx = stepIndex(status);
  if (idx < 0) {
    return <span className={cn("text-[11px] font-semibold rounded-full px-2.5 py-0.5", END_STATUS_CLASS[status] ?? "bg-gray-100 text-gray-500")}>{status}</span>;
  }
  return (
    <div className="flex items-center gap-1" aria-label={`状況: ${status}`}>
      {SALES_STEPS.map((s, i) => (
        <div key={s} className="flex-1 min-w-0">
          <div className={cn("h-1.5 rounded-full", i < idx ? "bg-blue-500" : "bg-gray-200")} />
          <p className={cn("text-[10px] mt-0.5 truncate", i < idx ? "text-blue-700 font-semibold" : "text-gray-400")}>{s}</p>
        </div>
      ))}
    </div>
  );
}

// ─── 営業の流れ（全員共通） ─────────────────────────────
function Playbook() {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between gap-2 text-left">
        <span className="flex items-center gap-2 text-sm font-bold text-amber-900">
          <Lightbulb size={16} /> 営業の流れ：テレアポ → 企画書作成 → 訪問
        </span>
        {open ? <ChevronUp size={16} className="text-amber-700 flex-shrink-0" /> : <ChevronDown size={16} className="text-amber-700 flex-shrink-0" />}
      </button>

      {open && (
        <div className="mt-3 space-y-3 text-sm text-amber-950">
          <div>
            <p className="text-xs font-bold text-amber-800 mb-1">1. テレアポ</p>
            <ul className="list-disc pl-5 space-y-0.5">
              <li>窓口はジムではなくコンシェルジュ（各ホテルの「ホテル情報」に目安あり）</li>
              <li>聞くこと：宿泊客からパーソナルの依頼はあるか／1回だけ・英語でも手配できているか／資料の送り先</li>
              <li>電話したら「記録する」→「電話」で残す（スケジュールにも入る）</li>
            </ul>
            <p className="bg-white/70 rounded-xl p-3 leading-relaxed mt-2 text-[13px]">
              「お忙しいところ失礼いたします。大阪で出張パーソナルトレーニングを行っておりますFIT STAGEの〇〇と申します。
              海外からのお客様向けに、英語でのトレーニングを客室や館内ジムで1回からご提供しておりまして、
              ご案内の資料をお送りしたくご連絡いたしました。ご担当の方はいらっしゃいますでしょうか。」
            </p>
          </div>
          <div>
            <p className="text-xs font-bold text-amber-800 mb-1">2. 企画書作成</p>
            <ul className="list-disc pl-5 space-y-0.5">
              <li>伝えるのは3つ：客室・館内ジムへ伺う（ホテル側の準備は不要）／英語・イタリア語・日本語で対応／前日〜当日の予約にも対応</li>
              <li>料金（ホテル経由）：1名60分 ¥16,000（税・交通費込み）。90分・2名は要相談。体験料金なし。HPの ¥9,900 とは別</li>
              <li>館内に専属トレーナーがいるホテルでは、競合ではなく「語学・時間外の補完」として書く</li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold text-amber-800 mb-1">3. 訪問</p>
            <ul className="list-disc pl-5 space-y-0.5">
              <li>日程が決まったら「記録する」→「訪問」で日時を入れる。2人で行くなら付き添いも選ぶ</li>
              <li>担当者と付き添いのスケジュールに入り、LINEでも届く</li>
              <li>終わったら結果を「メモ」で残し、「引き継ぎ」を書き直す</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 状況をタップで変える ───────────────────────────────
function StatusPicker({ target }: { target: SalesTarget }) {
  const router = useRouter();
  const { locked, run } = useSubmitLock();
  function change(value: string) {
    if (value === target.status) return;
    run(async () => {
      try { assertActionOk(await updateSalesStatusAction(target.id, value)); router.refresh(); }
      catch (e) { alert(e instanceof Error ? e.message : "変更に失敗しました"); }
    });
  }
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {SALES_STATUSES.map((s) => (
        <button
          key={s} type="button" disabled={locked} onClick={() => change(s)}
          className={cn("px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap transition",
            target.status === s ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-500 border-gray-200")}
        >{s}</button>
      ))}
      {locked && <Spinner size={12} />}
    </div>
  );
}

// ─── 記録 ─────────────────────────────────────────────
function LogForm({
  target, members, meId, onClose,
}: { target: SalesTarget; members: MemberLite[]; meId?: string; onClose: () => void }) {
  const [kind, setKind] = useState<string>("電話");
  const [companions, setCompanions] = useState<string[]>([]);
  const form = useActionForm(addSalesLogAction.bind(null, target.id), onClose);
  const kindDef = LOG_KINDS.find((k) => k.value === kind) ?? LOG_KINDS[0];
  const visit = kind === "訪問";

  function toggle(id: string) {
    setCompanions((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  }

  return (
    <form action={form.submit} className="border-2 border-blue-300 rounded-xl p-3 space-y-3 mb-3">
      <div className="flex gap-1.5">
        {LOG_KINDS.map((k) => (
          <button
            key={k.value} type="button" onClick={() => setKind(k.value)}
            className={cn("flex-1 py-2 rounded-xl text-sm font-semibold border transition",
              kind === k.value ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200")}
          >{k.value}</button>
        ))}
        <input type="hidden" name="kind" value={kind} />
      </div>

      <div>
        <p className={labelClass}>{kindDef.hint}{visit && <span className="text-red-500"> *</span>}</p>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input key={`d-${kind}`} name="date" type="date" defaultValue={visit ? "" : todayStr()} required={visit} aria-label="日付" className={inputClass} />
          <input key={`t-${kind}`} name="time" type="time" defaultValue={visit ? "" : nowTime()} required={visit} aria-label="時刻" className={inputClass} />
        </div>
        {kindDef.schedule && (
          <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
            <CalendarCheck size={11} />スケジュールに入ります{visit ? "（担当者・付き添いにLINEでもお知らせ）" : ""}
          </p>
        )}
      </div>

      {visit && (
        <div>
          <p className={cn(labelClass, "flex items-center gap-1")}><Users size={12} />付き添い（2人で行くとき）</p>
          <div className="flex flex-wrap gap-1.5">
            {members.filter((m) => m.id !== meId).map((m) => (
              <button
                key={m.id} type="button" onClick={() => toggle(m.id)}
                className={cn("px-3 py-1.5 rounded-full text-xs font-semibold border transition",
                  companions.includes(m.id) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200")}
              >{m.name}</button>
            ))}
          </div>
          {companions.map((id) => <input key={id} type="hidden" name="companionIds" value={id} />)}
        </div>
      )}

      {kind !== "メモ" && (
        <div>
          <label className={labelClass} htmlFor={`lp-${target.id}`}>先方の担当者</label>
          <input id={`lp-${target.id}`} name="person" defaultValue={target.contactPerson} placeholder="例: コンシェルジュ 山田様" className={inputClass} />
        </div>
      )}

      <div>
        <label className={labelClass} htmlFor={`lb-${target.id}`}>{kind === "メモ" ? "内容" : "内容・結果"}</label>
        <textarea id={`lb-${target.id}`} name="body" rows={2} required={kind === "メモ"}
          placeholder={visit ? "例: ロビーで15分。企画書と英語ページを持っていく" : kind === "電話" ? "例: 担当不在。明日14時ごろにかけ直す" : "例: 企画書をメールで送った"}
          className={inputClass} />
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <div className="min-w-0">
          <label className={labelClass} htmlFor={`ln-${target.id}`}>次にやること（任意）</label>
          <input id={`ln-${target.id}`} name="nextAction" placeholder="例: 企画書を作る" className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor={`lnd-${target.id}`}>期日</label>
          <input id={`lnd-${target.id}`} name="nextActionOn" type="date" className={inputClass} />
        </div>
      </div>

      {form.error && <p className="text-xs text-red-500">{form.error}</p>}
      <SubmitButtons locked={form.locked} label="記録する" onCancel={onClose} />
    </form>
  );
}

function LogList({ logs, members, meId, isAdmin }: { logs: SalesTargetLog[]; members: MemberLite[]; meId?: string; isAdmin: boolean }) {
  const router = useRouter();
  const del = useSubmitLock();
  const nameOf = useMemo(() => new Map(members.map((m) => [m.id, m.name])), [members]);
  const sorted = useMemo(() => [...logs].sort(byWhenDesc), [logs]);

  function handleDelete(l: SalesTargetLog) {
    const msg = l.eventId ? "この記録を削除しますか？スケジュールの予定も消えます。" : "この記録を削除しますか？";
    if (!confirm(msg)) return;
    del.run(async () => {
      try { assertActionOk(await deleteSalesLogAction(l.id)); router.refresh(); }
      catch (e) { alert(e instanceof Error ? e.message : "削除に失敗しました"); }
    });
  }

  if (sorted.length === 0) return <p className="text-xs text-gray-400">まだ記録はありません</p>;

  return (
    <ol className="space-y-3">
      {sorted.map((l) => {
        const canDelete = isAdmin || (!!meId && l.createdById === meId);
        const companions = l.companionIds.map((id) => nameOf.get(id)).filter(Boolean);
        return (
          <li key={l.id} className="border-l-2 border-gray-200 pl-3">
            <div className="flex items-center gap-1.5">
              <span className={cn("text-[11px] font-semibold rounded-md px-1.5 py-0.5", LOG_KIND_CLASS[l.kind] ?? LOG_KIND_CLASS["メモ"])}>{l.kind}</span>
              <span className="text-xs font-semibold text-gray-700 tabular-nums">{whenLabel(l.occurredAt ?? l.createdAt)}</span>
              {l.eventId && <CalendarCheck size={12} className="text-emerald-600" aria-label="スケジュールに登録済み" />}
              {canDelete && (
                <button onClick={() => handleDelete(l)} aria-label="記録を削除" className="ml-auto p-1 text-gray-300 hover:text-red-500 transition"><Trash2 size={12} /></button>
              )}
            </div>
            {l.body !== l.kind && <p className="text-sm text-gray-800 mt-0.5 whitespace-pre-wrap break-words">{l.body}</p>}
            <p className="text-[11px] text-gray-400 mt-0.5">
              {[
                l.person && `先方：${l.person}`,
                companions.length > 0 && `付き添い：${companions.join("・")}`,
                l.createdById && nameOf.get(l.createdById) && `記録：${nameOf.get(l.createdById)}`,
              ].filter(Boolean).join("　")}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

// ─── 引き継ぎ ─────────────────────────────────────────
function HandoverTab({ target, members }: { target: SalesTarget; members: MemberLite[] }) {
  const [editing, setEditing] = useState(false);
  const form = useActionForm(updateSalesProgressAction.bind(null, target.id), () => setEditing(false));
  const assignee = members.find((m) => m.id === target.assigneeId);

  if (!editing) {
    const rows: [string, React.ReactNode][] = [
      ["担当", assignee ? assignee.name : <span className="text-amber-600">未割当</span>],
      ["先方の担当者", target.contactPerson ?? <span className="text-gray-400">まだ分からない</span>],
      ["先方の連絡先", target.contactInfo ?? <span className="text-gray-400">—</span>],
    ];
    return (
      <div className="space-y-3">
        <dl className="space-y-1.5 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[6.5rem_1fr] gap-2">
              <dt className="text-xs text-gray-500 pt-0.5">{k}</dt>
              <dd className="text-gray-900 min-w-0 break-words">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-0.5">引き継ぎメモ</p>
          <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">{target.memo ?? <span className="text-gray-400">今の状況を1〜2行で。担当が替わっても続きができるように</span>}</p>
        </div>
        <button onClick={() => setEditing(true)} className="text-xs text-blue-600 font-semibold inline-flex items-center gap-1"><Pencil size={12} />担当・先方・メモを編集</button>
      </div>
    );
  }

  return (
    <form action={form.submit} className="space-y-3">
      <div>
        <label className={labelClass} htmlFor={`assignee-${target.id}`}>担当</label>
        <select id={`assignee-${target.id}`} name="assigneeId" defaultValue={target.assigneeId ?? ""} className={inputClass}>
          <option value="">未割当</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor={`person-${target.id}`}>先方の担当者</label>
          <input id={`person-${target.id}`} name="contactPerson" defaultValue={target.contactPerson} placeholder="例: 山田様" className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor={`info-${target.id}`}>先方の連絡先</label>
          <input id={`info-${target.id}`} name="contactInfo" defaultValue={target.contactInfo} placeholder="電話・メール" className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div className="min-w-0">
          <label className={labelClass} htmlFor={`next-${target.id}`}>次にやること</label>
          <input id={`next-${target.id}`} name="nextAction" defaultValue={target.nextAction} placeholder="例: 企画書を作る" className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor={`due-${target.id}`}>期日</label>
          <input id={`due-${target.id}`} name="nextActionOn" type="date" defaultValue={target.nextActionOn} className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass} htmlFor={`memo-${target.id}`}>引き継ぎメモ</label>
        <textarea id={`memo-${target.id}`} name="memo" rows={3} defaultValue={target.memo} placeholder="例: 宿泊部の山田様が窓口。英語対応に興味あり。企画書を送って返事待ち" className={inputClass} />
      </div>
      {form.error && <p className="text-xs text-red-500">{form.error}</p>}
      <SubmitButtons locked={form.locked} label="保存する" onCancel={() => setEditing(false)} />
    </form>
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

function InfoTab({ target, isAdmin }: { target: SalesTarget; isAdmin: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const form = useActionForm(updateSalesInfoAction.bind(null, target.id), () => setEditing(false));
  const del = useSubmitLock();

  function handleDelete() {
    if (!confirm(`「${target.name}」をリストから削除しますか？記録も消えます。`)) return;
    del.run(async () => {
      try { assertActionOk(await deleteSalesTargetAction(target.id)); router.refresh(); }
      catch (e) { alert(e instanceof Error ? e.message : "削除に失敗しました"); }
    });
  }

  if (editing) {
    return (
      <div>
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
      </div>
    );
  }

  return (
    <div className="space-y-2 text-sm text-gray-800">
      {target.pitch && <p><span className="text-xs text-gray-500 block">提案のポイント</span>{target.pitch}</p>}
      {target.contactPoint && <p><span className="text-xs text-gray-500 block">窓口の目安</span>{target.contactPoint}</p>}
      {target.hotelInfo && <p className="whitespace-pre-wrap break-words bg-gray-50 rounded-xl p-3 leading-relaxed">{target.hotelInfo}</p>}
      <div className="flex items-center gap-4 pt-1">
        {target.url && (
          <a href={target.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
            公式サイト <ExternalLink size={11} />
          </a>
        )}
        <button onClick={() => setEditing(true)} className="text-xs text-blue-600 font-semibold inline-flex items-center gap-1"><Pencil size={12} />編集</button>
      </div>
    </div>
  );
}

// ─── 1軒 ─────────────────────────────────────────────
type Tab = "log" | "handover" | "info";

function TargetCard({
  target, logs, members, meId, isAdmin, today,
}: {
  target: SalesTarget; logs: SalesTargetLog[]; members: MemberLite[];
  meId?: string; isAdmin: boolean; today: string;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("log");
  const [adding, setAdding] = useState(false);
  const assignee = members.find((m) => m.id === target.assigneeId);
  const overdue = isOverdue(target, today);

  return (
    <div className={cn("bg-white rounded-2xl border", overdue ? "border-red-300" : "border-gray-200")}>
      <button onClick={() => setOpen(!open)} className="w-full text-left p-4" aria-expanded={open}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-gray-900 leading-snug">{target.name}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-gray-500">
              {target.area && <span>{target.area}</span>}
              {assignee
                ? <MemberLabel name={assignee.name} avatarUrl={assignee.avatarUrl} textClassName="text-xs text-gray-600" />
                : <span className="inline-flex items-center gap-1 text-amber-600"><UserRound size={12} />未割当</span>}
            </div>
          </div>
          {open ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0 mt-1" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0 mt-1" />}
        </div>
        <div className="mt-2.5"><StepBar status={target.status} /></div>
        {(target.nextAction || target.nextActionOn) && (
          <p className={cn("text-xs mt-2 flex items-center gap-1", overdue ? "text-red-600 font-semibold" : "text-gray-600")}>
            <CalendarClock size={12} className="flex-shrink-0" />
            {target.nextActionOn && <span className="tabular-nums flex-shrink-0">{mdLabel(target.nextActionOn)}{overdue ? "（期日切れ）" : ""}</span>}
            <span className="truncate">{target.nextAction}</span>
          </p>
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">
          <StatusPicker target={target} />

          <div className="flex border-b border-gray-200">
            {([["log", `記録${logs.length ? `（${logs.length}）` : ""}`], ["handover", "引き継ぎ"], ["info", "ホテル情報"]] as const).map(([v, label]) => (
              <button key={v} onClick={() => setTab(v)}
                className={cn("flex-1 pb-2 text-xs font-semibold border-b-2 -mb-px transition",
                  tab === v ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500")}>
                {label}
              </button>
            ))}
          </div>

          {tab === "log" && (
            <div>
              {adding
                ? <LogForm target={target} members={members} meId={meId} onClose={() => setAdding(false)} />
                : (
                  <button onClick={() => setAdding(true)} className="w-full mb-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition inline-flex items-center justify-center gap-1.5">
                    <Plus size={15} />記録する（電話・訪問・メモ）
                  </button>
                )}
              <LogList logs={logs} members={members} meId={meId} isAdmin={isAdmin} />
            </div>
          )}
          {tab === "handover" && <HandoverTab target={target} members={members} />}
          {tab === "info" && <InfoTab target={target} isAdmin={isAdmin} />}
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
export function SalesClient({
  targets, logs, members, meId, isAdmin,
}: {
  targets: SalesTarget[]; logs: SalesTargetLog[]; members: MemberLite[];
  meId?: string; isAdmin: boolean;
}) {
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
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

  // 担当で絞ったあとの件数を、状況のボタンに出す
  const byAssignee = useMemo(() => targets.filter((t) => {
    if (assigneeFilter === "me") return t.assigneeId === meId;
    if (assigneeFilter === "none") return !t.assigneeId;
    if (assigneeFilter !== "all") return t.assigneeId === assigneeFilter;
    return true;
  }), [targets, assigneeFilter, meId]);

  const statusGroups: [string, string, (s: string) => boolean][] = [
    ["all", "すべて", () => true],
    ["未着手", "未着手", (s) => s === "未着手"],
    ...SALES_STEPS.map((step) => [step, step, (s: string) => s === step] as [string, string, (s: string) => boolean]),
    ["end", "提携・見送り・保留", (s) => (SALES_END_STATUSES as readonly string[]).includes(s)],
  ];
  const statusMatch = statusGroups.find((g) => g[0] === statusFilter)?.[2] ?? (() => true);
  const filtered = byAssignee.filter((t) => statusMatch(t.status));
  const overdueCount = targets.filter((t) => isOverdue(t, today)).length;
  const unassigned = targets.filter((t) => !t.assigneeId).length;
  const assignedMembers = members.filter((m) => m.id !== meId && targets.some((t) => t.assigneeId === m.id));

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
          <p className="text-sm text-gray-500 mt-0.5">大阪・京都のホテルへの出張パーソナルの営業先 {targets.length}軒</p>
        </div>
        {!showAdd && (
          <button onClick={() => setShowAdd(true)} className="flex-shrink-0 inline-flex items-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold px-3 py-2 rounded-xl transition">
            <Plus size={15} /> ホテル追加
          </button>
        )}
      </div>

      {showAdd && <AddTargetForm onClose={() => setShowAdd(false)} />}

      <Playbook />

      <div className="space-y-2 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button className={chip(assigneeFilter === "all")} onClick={() => setAssigneeFilter("all")}>全員</button>
          {meId && <button className={chip(assigneeFilter === "me")} onClick={() => setAssigneeFilter("me")}>自分の担当</button>}
          <button className={chip(assigneeFilter === "none")} onClick={() => setAssigneeFilter("none")}>未割当 {unassigned}</button>
          {assignedMembers.map((m) => (
            <button key={m.id} className={chip(assigneeFilter === m.id)} onClick={() => setAssigneeFilter(m.id)}>{m.name}</button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {statusGroups.map(([v, label, match]) => (
            <button key={v} className={chip(statusFilter === v)} onClick={() => setStatusFilter(v)}>
              {label} <span className="opacity-60 tabular-nums">{byAssignee.filter((t) => match(t.status)).length}</span>
            </button>
          ))}
        </div>
      </div>

      {overdueCount > 0 && (
        <p className="text-xs text-red-600 font-semibold mb-3">期日を過ぎた「次にやること」が {overdueCount} 件（赤枠）</p>
      )}

      {targets.length === 0 ? (
        <p className="text-center text-sm text-gray-500 py-16">ホテルがまだありません</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-gray-500 py-12">条件に合うホテルはありません</p>
      ) : (
        <div className="space-y-6">
          {SALES_PRIORITIES.map((p) => {
            const rows = filtered.filter((t) => t.priority === p);
            if (rows.length === 0) return null;
            return (
              <section key={p}>
                <h2 className="text-sm font-bold text-gray-900 mb-2">
                  優先度 {p}<span className="ml-1.5 text-xs font-normal text-gray-400">{rows.length}軒</span>
                </h2>
                <div className="space-y-2">
                  {rows.map((t) => (
                    <TargetCard
                      key={t.id} target={t} logs={logsByTarget.get(t.id) ?? []}
                      members={members} meId={meId} isAdmin={isAdmin} today={today}
                    />
                  ))}
                </div>
              </section>
            );
          })}
          {/* 高・中・低以外の優先度が入っていた場合も落とさず出す */}
          {(() => {
            const rest = filtered.filter((t) => !(SALES_PRIORITIES as readonly string[]).includes(t.priority));
            return rest.length > 0 ? (
              <section>
                <h2 className="text-sm font-bold text-gray-900 mb-2">その他</h2>
                <div className="space-y-2">
                  {rest.map((t) => (
                    <TargetCard key={t.id} target={t} logs={logsByTarget.get(t.id) ?? []} members={members} meId={meId} isAdmin={isAdmin} today={today} />
                  ))}
                </div>
              </section>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );
}

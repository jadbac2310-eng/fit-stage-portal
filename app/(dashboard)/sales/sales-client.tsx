"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, ChevronDown, ChevronUp, Plus, X, Trash2, ExternalLink, CalendarClock,
  MessageSquareText, Phone, Lightbulb, UserRound,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { MemberLabel } from "@/components/ui/member-label";
import { useSubmitLock } from "@/lib/use-submit-lock";
import { assertActionOk } from "@/lib/action-result";
import { cn } from "@/lib/cn";
import {
  SALES_PRIORITIES, PRIORITY_NOTES, SALES_STATUSES, STATUS_TONE_CLASS,
  statusTone, factToneClass, isOverdue,
  type SalesTarget, type SalesTargetLog,
} from "@/lib/sales-targets-types";
import {
  updateSalesProgressAction, updateSalesStatusAction, addSalesLogAction, deleteSalesLogAction,
  createSalesTargetAction, deleteSalesTargetAction,
} from "./actions";

type MemberLite = { id: string; name: string; avatarUrl?: string };

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function mdLabel(ymd: string): string {
  const [, m, d] = ymd.split("-");
  return `${Number(m)}/${Number(d)}`;
}

function dateTimeLabel(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const inputClass = "w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
const labelClass = "text-xs font-semibold text-gray-600 mb-1.5 block";

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
              <p className="text-xs font-bold text-amber-800 mb-1">下調べで分かったこと（2026年10月）</p>
              <ul className="list-disc pl-5 space-y-0.5">
                <li>英語で指導できるトレーナーがいると公式に書いているホテルは18軒中ゼロ</li>
                <li>1回だけ受けられて料金も出ているのはフォーシーズンズ（60分20,000円）とパティーナ（105分41,800円）だけ</li>
                <li>パーソナルがない・公式に書いていないホテルは9軒。ジムだけのところは提案が通りやすい</li>
                <li>「不明」は公式に書いていないという意味。実際は電話で聞かないと分からない</li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold text-amber-800 mb-1">ゲスト向けの料金（税込）</p>
              <p>1名60分 ¥9,900／1名90分 ¥13,500／2名60分 ¥13,500。体験料金はなし。</p>
              <a href="https://www.fitstage.jp/en/hotel/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-700 hover:underline mt-0.5">
                ホテル向け英語ページ（先方に見せる用） <ExternalLink size={11} />
              </a>
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
              <p className="text-xs font-bold text-amber-800 mb-1">書き残すこと</p>
              <p>電話・訪問・メールをしたら、そのホテルの「やりとりの記録」に1行残す。次にやることと期日も入れておく。</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── 1軒の詳細（編集フォーム＋やりとりの記録） ─────────────
function TargetDetail({
  target, logs, members, meId, isAdmin, onClose,
}: {
  target: SalesTarget; logs: SalesTargetLog[]; members: MemberLite[];
  meId?: string; isAdmin: boolean; onClose: () => void;
}) {
  const router = useRouter();
  const save = useSubmitLock();
  const addLog = useSubmitLock();
  const del = useSubmitLock();
  const [error, setError] = useState("");
  const [logError, setLogError] = useState("");
  const [logText, setLogText] = useState("");
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  async function handleSave(fd: FormData) {
    setError("");
    await save.run(async () => {
      try { assertActionOk(await updateSalesProgressAction(target.id, fd)); router.refresh(); onClose(); }
      catch (e) { setError(e instanceof Error ? e.message : "保存に失敗しました"); }
    });
  }

  async function handleAddLog(fd: FormData) {
    setLogError("");
    await addLog.run(async () => {
      try { assertActionOk(await addSalesLogAction(target.id, fd)); setLogText(""); router.refresh(); }
      catch (e) { setLogError(e instanceof Error ? e.message : "記録に失敗しました"); }
    });
  }

  function handleDeleteLog(id: string) {
    if (!confirm("この記録を削除しますか？")) return;
    del.run(async () => {
      try { assertActionOk(await deleteSalesLogAction(id)); router.refresh(); }
      catch (e) { alert(e instanceof Error ? e.message : "削除に失敗しました"); }
    });
  }

  function handleDeleteTarget() {
    if (!confirm(`「${target.name}」を営業先リストから削除しますか？やりとりの記録も消えます。`)) return;
    del.run(async () => {
      try { assertActionOk(await deleteSalesTargetAction(target.id)); router.refresh(); }
      catch (e) { alert(e instanceof Error ? e.message : "削除に失敗しました"); }
    });
  }

  return (
    <div className="border-t border-gray-100 mt-3 pt-4 space-y-5">
      {/* 下調べ */}
      {(target.researchNote || target.contactPoint) && (
        <div className="text-xs text-gray-600 space-y-1.5">
          {target.contactPoint && <p><span className="font-semibold text-gray-500">窓口の目安：</span>{target.contactPoint}</p>}
          {target.researchNote && <p><span className="font-semibold text-gray-500">下調べ：</span>{target.researchNote}</p>}
          {target.researchUrl && (
            <a href={target.researchUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
              公式ページを開く <ExternalLink size={11} />
            </a>
          )}
        </div>
      )}

      {/* 進み具合 */}
      <form action={handleSave} className="space-y-3">
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
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div className="min-w-0">
            <label className={labelClass} htmlFor={`next-${target.id}`}>次にやること</label>
            <input id={`next-${target.id}`} name="nextAction" defaultValue={target.nextAction} placeholder="例: コンシェルジュに電話して担当者を聞く" className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor={`due-${target.id}`}>期日</label>
            <input id={`due-${target.id}`} name="nextActionOn" type="date" defaultValue={target.nextActionOn} className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass} htmlFor={`person-${target.id}`}>先方の担当者</label>
            <input id={`person-${target.id}`} name="contactPerson" defaultValue={target.contactPerson} placeholder="例: 宿泊部 山田様" className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor={`info-${target.id}`}>連絡先</label>
            <input id={`info-${target.id}`} name="contactInfo" defaultValue={target.contactInfo} placeholder="電話・メール" className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass} htmlFor={`memo-${target.id}`}>メモ</label>
          <textarea id={`memo-${target.id}`} name="memo" rows={2} defaultValue={target.memo} placeholder="先方の反応・条件など" className={inputClass} />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">閉じる</button>
          <button type="submit" disabled={save.locked} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold transition flex items-center justify-center gap-2">
            {save.locked && <Spinner size={14} />}{save.locked ? "保存中..." : "保存する"}
          </button>
        </div>
      </form>

      {/* やりとりの記録 */}
      <div>
        <p className="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1"><MessageSquareText size={13} /> やりとりの記録</p>
        <form action={handleAddLog} className="flex gap-2 mb-3">
          <input
            name="body" value={logText} onChange={(e) => setLogText(e.target.value)}
            placeholder="例: 電話。担当不在、明日かけ直し" className={cn(inputClass, "flex-1 min-w-0")}
            aria-label={`${target.name}のやりとりを記録`}
          />
          <button type="submit" disabled={addLog.locked || !logText.trim()} className="flex-shrink-0 px-4 rounded-xl bg-gray-900 hover:bg-gray-700 disabled:bg-gray-300 text-white text-sm font-semibold transition flex items-center gap-1.5">
            {addLog.locked ? <Spinner size={13} /> : <Plus size={14} />}記録
          </button>
        </form>
        {logError && <p className="text-xs text-red-500 mb-2">{logError}</p>}
        {logs.length === 0 ? (
          <p className="text-xs text-gray-400">まだ記録はありません</p>
        ) : (
          <ul className="space-y-2">
            {logs.map((l) => {
              const author = l.createdById ? memberById.get(l.createdById) : undefined;
              const canDelete = isAdmin || (meId && l.createdById === meId);
              return (
                <li key={l.id} className="flex items-start gap-2 text-sm">
                  <span className="text-[11px] text-gray-400 tabular-nums w-16 flex-shrink-0 pt-0.5">{dateTimeLabel(l.createdAt)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800 break-words">{l.body}</p>
                    {author && <MemberLabel name={author.name} avatarUrl={author.avatarUrl} className="mt-0.5" textClassName="text-[11px] text-gray-400" />}
                  </div>
                  {canDelete && (
                    <button onClick={() => handleDeleteLog(l.id)} aria-label="記録を削除" className="p-1 text-gray-300 hover:text-red-500 transition">
                      <Trash2 size={12} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {isAdmin && (
        <button onClick={handleDeleteTarget} disabled={del.locked} className="text-xs text-gray-400 hover:text-red-500 inline-flex items-center gap-1">
          <Trash2 size={12} /> この営業先をリストから削除
        </button>
      )}
    </div>
  );
}

// ─── 1軒の行 ───────────────────────────────────────────
function TargetRow({
  target, logs, members, meId, isAdmin, todayStr,
}: {
  target: SalesTarget; logs: SalesTargetLog[]; members: MemberLite[];
  meId?: string; isAdmin: boolean; todayStr: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const statusLock = useSubmitLock();
  const assignee = members.find((m) => m.id === target.assigneeId);
  const overdue = isOverdue(target, todayStr);
  const latest = logs[0];

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
            {target.area && <span>{target.area}</span>}
            {assignee
              ? <MemberLabel name={assignee.name} avatarUrl={assignee.avatarUrl} textClassName="text-xs text-gray-700 font-medium" />
              : <span className="inline-flex items-center gap-1 text-amber-600 font-medium"><UserRound size={12} />未割当</span>}
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

      {/* 下調べの3項目 */}
      <div className="flex flex-wrap gap-1.5 mt-2.5">
        {([["パーソナル", target.hasPt], ["単発", target.singleSession], ["英語", target.english]] as const).map(([k, v]) => (
          <span key={k} className={cn("text-[11px] rounded-md px-2 py-0.5 whitespace-nowrap", factToneClass(v))}>
            {k}<b className="ml-1">{v ?? "未調査"}</b>
          </span>
        ))}
      </div>

      {target.pitch && <p className="text-sm text-gray-700 mt-2">{target.pitch}</p>}

      {(target.nextAction || target.nextActionOn) && (
        <p className={cn("text-xs mt-2 flex items-center gap-1", overdue ? "text-red-600 font-semibold" : "text-gray-600")}>
          <CalendarClock size={12} className="flex-shrink-0" />
          {target.nextActionOn && <span className="tabular-nums">{mdLabel(target.nextActionOn)}{overdue ? "（期日切れ）" : ""}</span>}
          <span className="truncate">{target.nextAction}</span>
        </p>
      )}

      {latest && !open && (
        <p className="text-xs text-gray-400 mt-1.5 truncate">最新の記録 {dateTimeLabel(latest.createdAt)}：{latest.body}</p>
      )}

      {!open ? (
        <button onClick={() => setOpen(true)} className="mt-3 w-full py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-xs font-semibold text-gray-600 transition flex items-center justify-center gap-1">
          詳細・記録 {logs.length > 0 && <span className="text-gray-400">（{logs.length}件）</span>}<ChevronDown size={14} />
        </button>
      ) : (
        <TargetDetail target={target} logs={logs} members={members} meId={meId} isAdmin={isAdmin} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}

// ─── 営業先の追加（管理者） ─────────────────────────────
function AddTargetForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { locked, run } = useSubmitLock();
  const [error, setError] = useState("");

  async function handleSubmit(fd: FormData) {
    setError("");
    await run(async () => {
      try { assertActionOk(await createSalesTargetAction(fd)); router.refresh(); onClose(); }
      catch (e) { setError(e instanceof Error ? e.message : "追加に失敗しました"); }
    });
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-blue-400 p-5 mb-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold text-gray-900">営業先を追加</p>
        <button onClick={onClose} aria-label="閉じる" className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
      </div>
      <form action={handleSubmit} className="space-y-3">
        <div>
          <label className={labelClass} htmlFor="new-name">ホテル名 <span className="text-red-500">*</span></label>
          <input id="new-name" name="name" required autoFocus placeholder="例: ホテル〇〇大阪" className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass} htmlFor="new-priority">優先度</label>
            <select id="new-priority" name="priority" defaultValue="次点" className={inputClass}>
              {SALES_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="new-area">エリア</label>
            <input id="new-area" name="area" placeholder="例: 梅田" className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass} htmlFor="new-contact">窓口の目安</label>
          <input id="new-contact" name="contactPoint" placeholder="例: コンシェルジュ" className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="new-pitch">提案の切り口</label>
          <input id="new-pitch" name="pitch" placeholder="例: 海外客が多い。語学対応を押す" className={inputClass} />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button type="submit" disabled={locked} className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold transition flex items-center justify-center gap-2">
          {locked && <Spinner size={14} />}{locked ? "追加中..." : "追加する"}
        </button>
      </form>
    </div>
  );
}

// ─── 一覧 ─────────────────────────────────────────────
type AssigneeFilter = "all" | "me" | "none" | string;
type StatusFilter = "all" | "active" | "todo" | "closed";

export function SalesClient({
  targets, logs, members, meId, isAdmin,
}: {
  targets: SalesTarget[]; logs: SalesTargetLog[]; members: MemberLite[];
  meId?: string; isAdmin: boolean;
}) {
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showAdd, setShowAdd] = useState(false);
  const todayStr = useMemo(() => today(), []);

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
    overdue:    targets.filter((t) => isOverdue(t, todayStr)).length,
  }), [targets, todayStr]);

  const priorities = useMemo(() => {
    const known = SALES_PRIORITIES as readonly string[];
    const extra = [...new Set(targets.map((t) => t.priority).filter((p) => !known.includes(p)))];
    return [...known, ...extra];
  }, [targets]);

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
        {isAdmin && !showAdd && (
          <button onClick={() => setShowAdd(true)} className="flex-shrink-0 inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3.5 py-2 rounded-xl transition">
            <Plus size={16} /> 追加
          </button>
        )}
      </div>

      {/* 全体の数 */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: "全体", value: counts.total, cls: "text-gray-900" },
          { label: "未割当", value: counts.unassigned, cls: counts.unassigned ? "text-amber-600" : "text-gray-900" },
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

      {/* 絞り込み */}
      <div className="space-y-2 mb-5">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button className={chip(assigneeFilter === "all")} onClick={() => setAssigneeFilter("all")}>全員</button>
          {meId && <button className={chip(assigneeFilter === "me")} onClick={() => setAssigneeFilter("me")}>自分の担当</button>}
          <button className={chip(assigneeFilter === "none")} onClick={() => setAssigneeFilter("none")}>未割当</button>
          {members.filter((m) => targets.some((t) => t.assigneeId === m.id) && m.id !== meId).map((m) => (
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
          <p className="text-sm font-semibold text-gray-600">営業先がまだありません</p>
          <p className="text-xs text-gray-400 mt-1">データベースの更新（マイグレーション）が済むと、ホテル18軒が表示されます</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-gray-500 py-12">条件に合う営業先はありません</p>
      ) : (
        <div className="space-y-6">
          {priorities.map((p) => {
            const rows = filtered.filter((t) => t.priority === p);
            if (rows.length === 0) return null;
            return (
              <section key={p}>
                <div className="flex items-baseline gap-2 mb-2 flex-wrap">
                  <h2 className="text-base font-bold text-gray-900">{p}</h2>
                  {PRIORITY_NOTES[p] && <p className="text-xs text-gray-500">{PRIORITY_NOTES[p]}</p>}
                </div>
                <div className="space-y-2">
                  {rows.map((t) => (
                    <TargetRow
                      key={t.id} target={t} logs={logsByTarget.get(t.id) ?? []}
                      members={members} meId={meId} isAdmin={isAdmin} todayStr={todayStr}
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

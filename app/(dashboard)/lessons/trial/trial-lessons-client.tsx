"use client";

import { useState } from "react";
import {
  Plus, Pencil, Trash2, X, Search, MapPin, Calendar,
  User, StickyNote, CheckCircle, XCircle, Clock, ClipboardList,
} from "lucide-react";
import { TrialLesson, TrialLessonStatus, STATUS_LABEL } from "@/lib/trial-lessons-types";
import { Customer } from "@/lib/customers-types";
import { Member } from "@/lib/members";
import {
  createTrialLessonAction,
  updateTrialLessonAction,
  saveReportAction,
  deleteTrialLessonAction,
} from "./actions";
import { cn } from "@/lib/cn";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Spinner } from "@/components/ui/spinner";

// ─── バッジ ───────────────────────────────────────────
function StatusBadge({ status }: { status: TrialLessonStatus }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
      status === "scheduled" ? "bg-blue-100 text-blue-700"  :
      status === "completed" ? "bg-green-100 text-green-700" :
                               "bg-gray-100 text-gray-500"
    )}>
      {status === "scheduled" && <Clock size={10} />}
      {status === "completed" && <CheckCircle size={10} />}
      {status === "cancelled" && <XCircle size={10} />}
      {STATUS_LABEL[status]}
    </span>
  );
}

function ContractBadge({ contracted }: { contracted: boolean | null }) {
  if (contracted === null) return null;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
      contracted ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
    )}>
      {contracted ? <CheckCircle size={10} /> : <XCircle size={10} />}
      {contracted ? "契約成功" : "不成立"}
    </span>
  );
}

// datetime-local の値（ローカル時刻）を UTC ISO 文字列に変換
function localInputToISO(value: string): string {
  return new Date(value).toISOString();
}

// UTC ISO 文字列を datetime-local input 用のローカル時刻文字列に変換
function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── 体験レッスン作成・編集フォーム ──────────────────
function LessonForm({
  defaultValues, customers, members, onClose, action, submitLabel,
}: {
  defaultValues?: Partial<TrialLesson>;
  customers: Customer[];
  members: Member[];
  onClose: () => void;
  action: (fd: FormData) => Promise<void>;
  submitLabel: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(fd: FormData) {
    setError("");
    setLoading(true);
    // datetime-local はローカル時刻を返すので、UTC ISO に変換してから送信
    const raw = fd.get("scheduledAt") as string;
    if (raw) fd.set("scheduledAt", localInputToISO(raw));
    try { await action(fd); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : "エラー"); setLoading(false); }
  }

  const inputClass = "w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelClass = "text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5";
  const defaultScheduledAt = defaultValues?.scheduledAt
    ? isoToLocalInput(defaultValues.scheduledAt) : "";

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass}><User size={12} /> 顧客 <span className="text-red-500">*</span></label>
        <select name="customerId" required defaultValue={defaultValues?.customerId ?? ""} className={inputClass}>
          <option value="">顧客を選択...</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
        </select>
      </div>

      <div>
        <label className={labelClass}><User size={12} /> 営業担当者 <span className="text-red-500">*</span></label>
        <select name="salesMemberId" required defaultValue={defaultValues?.salesMemberId ?? ""} className={inputClass}>
          <option value="">営業担当者を選択...</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}{m.role ? `（${m.role}）` : ""}</option>)}
        </select>
      </div>

      <div>
        <label className={labelClass}><User size={12} /> トレーニング担当者</label>
        <select name="trainerMemberId" defaultValue={defaultValues?.trainerMemberId ?? ""} className={inputClass}>
          <option value="">未定</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}{m.role ? `（${m.role}）` : ""}</option>)}
        </select>
      </div>

      <div>
        <label className={labelClass}><Calendar size={12} /> 予定日時 <span className="text-red-500">*</span></label>
        <input name="scheduledAt" type="datetime-local" required defaultValue={defaultScheduledAt} className={inputClass} />
      </div>

      <div>
        <label className={labelClass}><MapPin size={12} /> 場所</label>
        <input name="location" defaultValue={defaultValues?.location} placeholder="FIT STAGE 渋谷店 など" className={inputClass} />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">キャンセル</button>
        <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold transition flex items-center justify-center gap-2">
          {loading && <Spinner size={14} />}{loading ? "保存中..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

// ─── レポートフォーム ─────────────────────────────────
function ReportForm({
  lesson, onClose,
}: {
  lesson: TrialLesson;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [contracted, setContracted] = useState<string>(
    lesson.contracted === true ? "true" : lesson.contracted === false ? "false" : "null"
  );
  const [error, setError] = useState("");
  const boundSave = saveReportAction.bind(null, lesson.id);

  async function handleSubmit(fd: FormData) {
    setError("");
    setLoading(true);
    try { await boundSave(fd); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : "エラー"); setLoading(false); }
  }

  const inputClass = "w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelClass = "text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5";

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700 font-medium">
        保存するとステータスが「完了」になります
      </div>

      <div>
        <label className={labelClass}><ClipboardList size={12} /> トレーニング内容</label>
        <textarea name="trainingContent" defaultValue={lesson.trainingContent} rows={3}
          placeholder="実施したトレーニングの内容..."
          className={cn(inputClass, "resize-none")} />
      </div>

      <div>
        <label className={labelClass}><User size={12} /> お客さんの様子</label>
        <textarea name="customerImpression" defaultValue={lesson.customerImpression} rows={3}
          placeholder="体験中の様子、反応、感想など..."
          className={cn(inputClass, "resize-none")} />
      </div>

      <div>
        <label className={labelClass}>契約結果</label>
        <select name="contracted" value={contracted} onChange={(e) => setContracted(e.target.value)} className={inputClass}>
          <option value="null">未確定</option>
          <option value="true">契約成功</option>
          <option value="false">不成立</option>
        </select>
      </div>


      <div>
        <label className={labelClass}><StickyNote size={12} /> 備考</label>
        <textarea name="note" defaultValue={lesson.note} rows={2}
          placeholder="次回アクション、申し送りなど..."
          className={cn(inputClass, "resize-none")} />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">キャンセル</button>
        <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-semibold transition flex items-center justify-center gap-2">
          {loading && <Spinner size={14} />}{loading ? "保存中..." : "レポートを保存"}
        </button>
      </div>
    </form>
  );
}

// ─── テーブル行 ───────────────────────────────────────
function LessonRow({ lesson, customers, members, isAdmin }: {
  lesson: TrialLesson; customers: Customer[]; members: Member[]; isAdmin: boolean;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "report">("view");
  const [deleting, setDeleting] = useState(false);
  const boundUpdate = updateTrialLessonAction.bind(null, lesson.id);

  const scheduledDate = new Date(lesson.scheduledAt);
  const dateStr = scheduledDate.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", weekday: "short" });
  const timeStr = scheduledDate.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });

  if (mode === "edit") return (
    <tr><td colSpan={7} className="px-4 py-3">
      <div className="bg-white rounded-2xl border-2 border-blue-400 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-gray-900">体験レッスンを編集</p>
          <button onClick={() => setMode("view")} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <LessonForm defaultValues={lesson} customers={customers} members={members}
          onClose={() => setMode("view")} action={boundUpdate} submitLabel="保存する" />
      </div>
    </td></tr>
  );

  if (mode === "report") return (
    <tr><td colSpan={7} className="px-4 py-3">
      <div className="bg-white rounded-2xl border-2 border-green-400 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-gray-900">
            レポート記入 — {lesson.customerName}
          </p>
          <button onClick={() => setMode("view")} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <ReportForm lesson={lesson} onClose={() => setMode("view")} />
      </div>
    </td></tr>
  );

  return (
    <tr className="hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
      <td className="px-4 py-3">
        <p className="text-xs font-semibold text-gray-900">{dateStr}</p>
        <p className="text-xs text-gray-400">{timeStr}</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-sm font-semibold text-gray-900">{lesson.customerName}</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-xs text-gray-600">{lesson.salesMemberName}</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-xs text-gray-600">{lesson.trainerMemberName ?? <span className="text-gray-300">—</span>}</p>
      </td>
      <td className="px-4 py-3">
        {lesson.location
          ? <p className="text-xs text-gray-600 flex items-center gap-1"><MapPin size={10} className="flex-shrink-0" />{lesson.location}</p>
          : <span className="text-xs text-gray-300">—</span>}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1">
          <StatusBadge status={lesson.status} />
          <ContractBadge contracted={lesson.contracted} />
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 justify-end">
          {lesson.status !== "cancelled" && (
            <button onClick={() => setMode("report")}
              className={cn(
                "flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition border",
                lesson.status === "scheduled"
                  ? "text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 border-green-300"
                  : "text-gray-600 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 border-gray-200 hover:border-blue-300"
              )}>
              <ClipboardList size={11} />
              {lesson.status === "scheduled" ? "レポート記入" : "レポート確認"}
            </button>
          )}
          {isAdmin && (
            <>
              <button onClick={() => setMode("edit")}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                <Pencil size={13} />
              </button>
              <button onClick={async () => {
                if (!confirm(`${lesson.customerName} の体験レッスンを削除しますか？`)) return;
                setDeleting(true);
                await deleteTrialLessonAction(lesson.id);
              }} disabled={deleting}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50">
                {deleting ? <Spinner size={13} /> : <Trash2 size={13} />}
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── モバイルカード ───────────────────────────────────
function LessonCard({ lesson, customers, members, isAdmin }: {
  lesson: TrialLesson; customers: Customer[]; members: Member[]; isAdmin: boolean;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "report">("view");
  const [deleting, setDeleting] = useState(false);
  const boundUpdate = updateTrialLessonAction.bind(null, lesson.id);

  const scheduledDate = new Date(lesson.scheduledAt);
  const dateStr = scheduledDate.toLocaleDateString("ja-JP", { year: "numeric", month: "numeric", day: "numeric", weekday: "short" });
  const timeStr = scheduledDate.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });

  if (mode === "edit") return (
    <div className="bg-white rounded-2xl border-2 border-blue-400 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold text-gray-900">体験レッスンを編集</p>
        <button onClick={() => setMode("view")} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
      </div>
      <LessonForm defaultValues={lesson} customers={customers} members={members}
        onClose={() => setMode("view")} action={boundUpdate} submitLabel="保存する" />
    </div>
  );

  if (mode === "report") return (
    <div className="bg-white rounded-2xl border-2 border-green-400 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold text-gray-900">レポート記入 — {lesson.customerName}</p>
        <button onClick={() => setMode("view")} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
      </div>
      <ReportForm lesson={lesson} onClose={() => setMode("view")} />
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="text-sm font-bold text-gray-900">{lesson.customerName}</p>
          <p className="text-xs text-gray-500 mt-0.5">営業: {lesson.salesMemberName}</p>
          {lesson.trainerMemberName && <p className="text-xs text-gray-500">TR: {lesson.trainerMemberName}</p>}
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={lesson.status} />
          <ContractBadge contracted={lesson.contracted} />
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-xs text-gray-600 flex items-center gap-1.5"><Calendar size={11} className="text-gray-400" />{dateStr} {timeStr}</p>
        {lesson.location && <p className="text-xs text-gray-600 flex items-center gap-1.5"><MapPin size={11} className="text-gray-400" />{lesson.location}</p>}
      </div>
      <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
        {lesson.status !== "cancelled" && (
          <button onClick={() => setMode("report")}
            className={cn(
              "flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition border",
              lesson.status === "scheduled"
                ? "text-green-600 bg-green-50 hover:bg-green-100 border-green-300"
                : "text-gray-600 bg-gray-50 hover:bg-blue-50 border-gray-200 hover:border-blue-300 hover:text-blue-600"
            )}>
            <ClipboardList size={11} />
            {lesson.status === "scheduled" ? "レポート記入" : "レポート確認"}
          </button>
        )}
        {isAdmin && (
          <>
            <button onClick={() => setMode("edit")}
              className="flex items-center gap-1 text-xs text-gray-600 hover:text-blue-600 font-medium bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 px-2.5 py-1.5 rounded-lg transition">
              <Pencil size={11} /> 編集
            </button>
            <button onClick={async () => {
              if (!confirm(`${lesson.customerName} の体験レッスンを削除しますか？`)) return;
              setDeleting(true);
              await deleteTrialLessonAction(lesson.id);
            }} disabled={deleting}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium bg-red-50 hover:bg-red-100 border border-red-300 px-2.5 py-1.5 rounded-lg transition">
              {deleting ? <><Spinner size={11} /> 削除中...</> : <><Trash2 size={11} /> 削除</>}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── メインコンポーネント ─────────────────────────────
export function TrialLessonsClient({ lessons, customers, members, isAdmin }: {
  lessons: TrialLesson[]; customers: Customer[]; members: Member[]; isAdmin: boolean;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<TrialLessonStatus | "">("");

  const filtered = lessons.filter((l) => {
    const q = search.toLowerCase();
    const matchSearch = !q || l.customerName.toLowerCase().includes(q) || l.salesMemberName.toLowerCase().includes(q) || (l.trainerMemberName ?? "").toLowerCase().includes(q) || (l.location ?? "").toLowerCase().includes(q);
    const matchStatus = !filterStatus || l.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="mb-4 hidden md:flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">体験レッスン</h1>
          <p className="text-sm text-gray-500 mt-0.5">{lessons.length}件</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition">
            <Plus size={16} /> 体験レッスンを追加
          </button>
        )}
      </div>

      <div className="md:hidden mb-4">
        <h1 className="text-lg font-bold text-gray-900">体験レッスン</h1>
        <p className="text-xs text-gray-500 mt-0.5">{lessons.length}件</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="顧客名・担当者・場所で検索..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as TrialLessonStatus | "")}
          className="px-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="">全ステータス</option>
          <option value="scheduled">予定</option>
          <option value="completed">完了</option>
          <option value="cancelled">キャンセル</option>
        </select>
      </div>

      {showAdd && (
        <div className="hidden md:block bg-white rounded-2xl border-2 border-blue-400 p-5 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-900">体験レッスンを追加</p>
            <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <LessonForm customers={customers} members={members}
            onClose={() => setShowAdd(false)} action={createTrialLessonAction} submitLabel="追加する" />
        </div>
      )}

      {lessons.length === 0 && !showAdd ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🗓️</p>
          <p className="text-sm font-semibold text-gray-600">体験レッスンが登録されていません</p>
          {isAdmin && (
            <button onClick={() => setShowAdd(true)}
              className="mt-5 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition">
              <Plus size={15} /> 体験レッスンを追加
            </button>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">該当する体験レッスンが見つかりません</p>
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">日時</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">顧客</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">営業担当</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">トレーナー</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">場所</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">状態</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <LessonRow key={l.id} lesson={l} customers={customers} members={members} isAdmin={isAdmin} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-2">
            {filtered.map((l) => (
              <LessonCard key={l.id} lesson={l} customers={customers} members={members} isAdmin={isAdmin} />
            ))}
          </div>
        </>
      )}

      {isAdmin && (
        <button onClick={() => setShowAdd(true)}
          className="md:hidden fixed bottom-6 right-4 w-14 h-14 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-full shadow-lg shadow-blue-200 flex items-center justify-center transition z-30"
          aria-label="体験レッスンを追加">
          <Plus size={26} />
        </button>
      )}

      {showAdd && (
        <BottomSheet title="体験レッスンを追加" onClose={() => setShowAdd(false)} scrollable>
          <LessonForm customers={customers} members={members}
            onClose={() => setShowAdd(false)} action={createTrialLessonAction} submitLabel="追加する" />
        </BottomSheet>
      )}
    </div>
  );
}

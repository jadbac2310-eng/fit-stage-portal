"use client";

import { useState } from "react";
import {
  Plus, Pencil, Trash2, X, Search, MapPin, Calendar,
  User, StickyNote, CheckCircle, XCircle, Clock,
} from "lucide-react";
import { TrialLesson, TrialLessonStatus, STATUS_LABEL, CONTRACT_LABEL } from "@/lib/trial-lessons-types";
import { Customer } from "@/lib/customers-types";
import { Member } from "@/lib/members";
import { createTrialLessonAction, updateTrialLessonAction, deleteTrialLessonAction } from "./actions";
import { cn } from "@/lib/cn";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Spinner } from "@/components/ui/spinner";

// ─── バッジ ───────────────────────────────────────────
function StatusBadge({ status }: { status: TrialLessonStatus }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
      status === "scheduled"  ? "bg-blue-100 text-blue-700"  :
      status === "completed"  ? "bg-green-100 text-green-700" :
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
  if (contracted === null) return <span className="text-xs text-gray-400">未確定</span>;
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

// ─── フォーム ─────────────────────────────────────────
function TrialLessonForm({
  defaultValues,
  customers,
  members,
  onClose,
  action,
  submitLabel,
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
  const [contracted, setContracted] = useState<string>(
    defaultValues?.contracted === true  ? "true"  :
    defaultValues?.contracted === false ? "false" : "null"
  );

  async function handleSubmit(fd: FormData) {
    setError("");
    setLoading(true);
    try {
      await action(fd);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
      setLoading(false);
    }
  }

  const inputClass = "w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelClass = "text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5";

  // datetime-local の初期値フォーマット（ISO → "YYYY-MM-DDTHH:mm"）
  const defaultScheduledAt = defaultValues?.scheduledAt
    ? new Date(defaultValues.scheduledAt).toISOString().slice(0, 16)
    : "";

  return (
    <form action={handleSubmit} className="space-y-4">
      {/* 顧客 */}
      <div>
        <label className={labelClass}>
          <User size={12} /> 顧客 <span className="text-red-500">*</span>
        </label>
        <select
          name="customerId"
          required
          defaultValue={defaultValues?.customerId ?? ""}
          className={inputClass}
        >
          <option value="">顧客を選択...</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.fullName}</option>
          ))}
        </select>
      </div>

      {/* 営業担当者 */}
      <div>
        <label className={labelClass}>
          <User size={12} /> 営業担当者 <span className="text-red-500">*</span>
        </label>
        <select
          name="salesMemberId"
          required
          defaultValue={defaultValues?.salesMemberId ?? ""}
          className={inputClass}
        >
          <option value="">営業担当者を選択...</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}{m.role ? `（${m.role}）` : ""}</option>
          ))}
        </select>
      </div>

      {/* トレーニング担当者 */}
      <div>
        <label className={labelClass}>
          <User size={12} /> トレーニング担当者
        </label>
        <select
          name="trainerMemberId"
          defaultValue={defaultValues?.trainerMemberId ?? ""}
          className={inputClass}
        >
          <option value="">未定</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}{m.role ? `（${m.role}）` : ""}</option>
          ))}
        </select>
      </div>

      {/* 予定日時 */}
      <div>
        <label className={labelClass}>
          <Calendar size={12} /> 予定日時 <span className="text-red-500">*</span>
        </label>
        <input
          name="scheduledAt"
          type="datetime-local"
          required
          defaultValue={defaultScheduledAt}
          className={inputClass}
        />
      </div>

      {/* 場所 */}
      <div>
        <label className={labelClass}>
          <MapPin size={12} /> 場所
        </label>
        <input
          name="location"
          defaultValue={defaultValues?.location}
          placeholder="FIT STAGE 渋谷店 など"
          className={inputClass}
        />
      </div>

      {/* ステータス */}
      <div>
        <label className={labelClass}>ステータス</label>
        <select name="status" defaultValue={defaultValues?.status ?? "scheduled"} className={inputClass}>
          <option value="scheduled">予定</option>
          <option value="completed">完了</option>
          <option value="cancelled">キャンセル</option>
        </select>
      </div>

      {/* 契約結果 */}
      <div>
        <label className={labelClass}>契約結果</label>
        <select
          name="contracted"
          value={contracted}
          onChange={(e) => setContracted(e.target.value)}
          className={inputClass}
        >
          <option value="null">未確定</option>
          <option value="true">契約成功</option>
          <option value="false">不成立</option>
        </select>
      </div>

      {/* 契約プラン（契約成功時のみ） */}
      {contracted === "true" && (
        <div>
          <label className={labelClass}>契約プラン</label>
          <select
            name="contractPlan"
            defaultValue={defaultValues?.contractPlan ?? ""}
            className={inputClass}
          >
            <option value="">未選択</option>
            <option value="monthly">月額制プラン</option>
            <option value="pay_as_you_go">都度払いプラン</option>
          </select>
        </div>
      )}

      {/* 備考 */}
      <div>
        <label className={labelClass}>
          <StickyNote size={12} /> 備考
        </label>
        <textarea
          name="note"
          defaultValue={defaultValues?.note}
          rows={3}
          placeholder="レッスン内容、顧客の様子、次のアクションなど"
          className={cn(inputClass, "resize-none")}
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold transition flex items-center justify-center gap-2"
        >
          {loading && <Spinner size={14} />}
          {loading ? "保存中..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

// ─── テーブル行 ───────────────────────────────────────
function LessonRow({
  lesson, customers, members, isAdmin,
}: {
  lesson: TrialLesson;
  customers: Customer[];
  members: Member[];
  isAdmin: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const boundUpdate = updateTrialLessonAction.bind(null, lesson.id);

  async function handleDelete() {
    if (!confirm(`${lesson.customerName} の体験レッスンを削除しますか？`)) return;
    setDeleting(true);
    await deleteTrialLessonAction(lesson.id);
  }

  const scheduledDate = new Date(lesson.scheduledAt);
  const dateStr = scheduledDate.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", weekday: "short" });
  const timeStr = scheduledDate.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });

  if (editing) {
    return (
      <tr>
        <td colSpan={7} className="px-4 py-3">
          <div className="bg-white rounded-2xl border-2 border-blue-400 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-gray-900">体験レッスンを編集</p>
              <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <TrialLessonForm
              defaultValues={lesson}
              customers={customers}
              members={members}
              onClose={() => setEditing(false)}
              action={boundUpdate}
              submitLabel="保存する"
            />
          </div>
        </td>
      </tr>
    );
  }

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
          : <span className="text-xs text-gray-300">—</span>
        }
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={lesson.status} />
      </td>
      <td className="px-4 py-3">
        <ContractBadge contracted={lesson.contracted} />
        {lesson.contracted && lesson.contractPlan && (
          <p className="text-xs text-gray-400 mt-0.5">
            {lesson.contractPlan === "monthly" ? "月額制" : "都度払い"}
          </p>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 justify-end">
          {isAdmin && (
            <>
              <button
                onClick={() => setEditing(true)}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                aria-label="編集"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                aria-label="削除"
              >
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
function LessonCard({
  lesson, customers, members, isAdmin,
}: {
  lesson: TrialLesson;
  customers: Customer[];
  members: Member[];
  isAdmin: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const boundUpdate = updateTrialLessonAction.bind(null, lesson.id);

  async function handleDelete() {
    if (!confirm(`${lesson.customerName} の体験レッスンを削除しますか？`)) return;
    setDeleting(true);
    await deleteTrialLessonAction(lesson.id);
  }

  const scheduledDate = new Date(lesson.scheduledAt);
  const dateStr = scheduledDate.toLocaleDateString("ja-JP", { year: "numeric", month: "numeric", day: "numeric", weekday: "short" });
  const timeStr = scheduledDate.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });

  if (editing) {
    return (
      <div className="bg-white rounded-2xl border-2 border-blue-400 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-gray-900">体験レッスンを編集</p>
          <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>
        <TrialLessonForm
          defaultValues={lesson}
          customers={customers}
          members={members}
          onClose={() => setEditing(false)}
          action={boundUpdate}
          submitLabel="保存する"
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="text-sm font-bold text-gray-900">{lesson.customerName}</p>
          <p className="text-xs text-gray-500 mt-0.5">営業: {lesson.salesMemberName}</p>
        {lesson.trainerMemberName && (
          <p className="text-xs text-gray-500">TR: {lesson.trainerMemberName}</p>
        )}
        </div>
        <StatusBadge status={lesson.status} />
      </div>
      <div className="space-y-1">
        <p className="text-xs text-gray-600 flex items-center gap-1.5">
          <Calendar size={11} className="text-gray-400" />{dateStr} {timeStr}
        </p>
        {lesson.location && (
          <p className="text-xs text-gray-600 flex items-center gap-1.5">
            <MapPin size={11} className="text-gray-400" />{lesson.location}
          </p>
        )}
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <ContractBadge contracted={lesson.contracted} />
        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1 text-xs text-gray-600 hover:text-blue-600 font-medium bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 px-2.5 py-1.5 rounded-lg transition"
            >
              <Pencil size={11} /> 編集
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 disabled:text-red-400 font-medium bg-red-50 hover:bg-red-100 border border-red-300 px-2.5 py-1.5 rounded-lg transition"
            >
              {deleting ? <><Spinner size={11} /> 削除中...</> : <><Trash2 size={11} /> 削除</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── メインコンポーネント ─────────────────────────────
export function TrialLessonsClient({
  lessons, customers, members, isAdmin,
}: {
  lessons: TrialLesson[];
  customers: Customer[];
  members: Member[];
  isAdmin: boolean;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<TrialLessonStatus | "">("");
  const [filterContracted, setFilterContracted] = useState<"true" | "false" | "null" | "">("");

  const filtered = lessons.filter((l) => {
    const q = search.toLowerCase();
    const matchSearch = !q || l.customerName.toLowerCase().includes(q) || l.salesMemberName.toLowerCase().includes(q) || (l.trainerMemberName ?? "").toLowerCase().includes(q) || (l.location ?? "").toLowerCase().includes(q);
    const matchStatus = !filterStatus || l.status === filterStatus;
    const matchContracted =
      !filterContracted ||
      (filterContracted === "true"  && l.contracted === true)  ||
      (filterContracted === "false" && l.contracted === false) ||
      (filterContracted === "null"  && l.contracted === null);
    return matchSearch && matchStatus && matchContracted;
  });

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* ヘッダー */}
      <div className="mb-4 hidden md:flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">体験レッスン</h1>
          <p className="text-sm text-gray-500 mt-0.5">{lessons.length}件</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition"
          >
            <Plus size={16} /> 体験レッスンを追加
          </button>
        )}
      </div>

      <div className="md:hidden mb-4">
        <h1 className="text-lg font-bold text-gray-900">体験レッスン</h1>
        <p className="text-xs text-gray-500 mt-0.5">{lessons.length}件</p>
      </div>

      {/* 検索・フィルター */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="顧客名・担当者・場所で検索..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as TrialLessonStatus | "")}
          className="px-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">全ステータス</option>
          <option value="scheduled">予定</option>
          <option value="completed">完了</option>
          <option value="cancelled">キャンセル</option>
        </select>
        <select
          value={filterContracted}
          onChange={(e) => setFilterContracted(e.target.value as typeof filterContracted)}
          className="px-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">全契約結果</option>
          <option value="true">契約成功</option>
          <option value="false">不成立</option>
          <option value="null">未確定</option>
        </select>
      </div>

      {/* 追加フォーム（デスクトップ） */}
      {showAdd && (
        <div className="hidden md:block bg-white rounded-2xl border-2 border-blue-400 p-5 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-900">体験レッスンを追加</p>
            <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
          <TrialLessonForm
            customers={customers}
            members={members}
            onClose={() => setShowAdd(false)}
            action={createTrialLessonAction}
            submitLabel="追加する"
          />
        </div>
      )}

      {/* 空状態 */}
      {lessons.length === 0 && !showAdd ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🗓️</p>
          <p className="text-sm font-semibold text-gray-600">体験レッスンが登録されていません</p>
          <p className="text-xs text-gray-400 mt-1">最初の体験レッスンを追加しましょう</p>
          {isAdmin && (
            <button
              onClick={() => setShowAdd(true)}
              className="mt-5 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition"
            >
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
          {/* デスクトップ：テーブル */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">日時</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">顧客</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">営業担当</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">トレーナー</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">場所</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">ステータス</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">契約結果</th>
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

          {/* モバイル：カード */}
          <div className="md:hidden space-y-2">
            {filtered.map((l) => (
              <LessonCard key={l.id} lesson={l} customers={customers} members={members} isAdmin={isAdmin} />
            ))}
          </div>
        </>
      )}

      {/* FAB（モバイル） */}
      {isAdmin && (
        <button
          onClick={() => setShowAdd(true)}
          className="md:hidden fixed bottom-6 right-4 w-14 h-14 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-full shadow-lg shadow-blue-200 flex items-center justify-center transition z-30"
          aria-label="体験レッスンを追加"
        >
          <Plus size={26} />
        </button>
      )}

      {showAdd && (
        <BottomSheet title="体験レッスンを追加" onClose={() => setShowAdd(false)} scrollable>
          <TrialLessonForm
            customers={customers}
            members={members}
            onClose={() => setShowAdd(false)}
            action={createTrialLessonAction}
            submitLabel="追加する"
          />
        </BottomSheet>
      )}
    </div>
  );
}

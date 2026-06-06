"use client";

import { useState, useMemo } from "react";
import {
  Plus, Pencil, Trash2, X, Search, MapPin, Calendar,
  User, StickyNote, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Clock, XCircle,
} from "lucide-react";
import { Lesson, LessonPaymentType, LessonStatus, PAYMENT_LABEL, LESSON_STATUS_LABEL } from "@/lib/lessons-types";
import { Customer } from "@/lib/customers-types";
import { Member } from "@/lib/members";
import { createLessonAction, updateLessonAction, deleteLessonAction } from "./actions";
import { cn } from "@/lib/cn";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Spinner } from "@/components/ui/spinner";

// ─── バッジ類 ─────────────────────────────────────────
function PaymentBadge({ type }: { type?: LessonPaymentType }) {
  if (!type) return null;
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
      type === "monthly"      ? "bg-blue-100 text-blue-700"   :
      type === "session_pass" ? "bg-amber-100 text-amber-700" :
                                "bg-gray-100 text-gray-600"
    )}>
      {PAYMENT_LABEL[type]}
    </span>
  );
}

function StatusBadge({ status }: { status: LessonStatus }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
      status === "scheduled" ? "bg-blue-100 text-blue-700"  :
      status === "completed" ? "bg-green-100 text-green-700" :
                               "bg-gray-100 text-gray-500"
    )}>
      {status === "scheduled" && <Clock size={9} />}
      {status === "completed" && <CheckCircle size={9} />}
      {status === "cancelled" && <XCircle size={9} />}
      {LESSON_STATUS_LABEL[status]}
    </span>
  );
}

// ─── レッスンフォーム ─────────────────────────────────
function LessonForm({
  defaultValues, customers, members, fixedCustomerId, onClose, action, submitLabel,
}: {
  defaultValues?: Partial<Lesson>;
  customers: Customer[];
  members: Member[];
  fixedCustomerId?: string;
  onClose: () => void;
  action: (fd: FormData) => Promise<void>;
  submitLabel: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(fd: FormData) {
    setError(""); setLoading(true);
    try { await action(fd); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : "エラー"); setLoading(false); }
  }

  const inputClass = "w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelClass = "text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5";
  const defaultScheduledAt = defaultValues?.scheduledAt
    ? new Date(defaultValues.scheduledAt).toISOString().slice(0, 16) : "";

  return (
    <form action={handleSubmit} className="space-y-4">
      {/* 顧客（固定の場合は hidden） */}
      {fixedCustomerId ? (
        <input type="hidden" name="customerId" value={fixedCustomerId} />
      ) : (
        <div>
          <label className={labelClass}><User size={12} /> 顧客 <span className="text-red-500">*</span></label>
          <select name="customerId" required defaultValue={defaultValues?.customerId ?? ""} className={inputClass}>
            <option value="">顧客を選択...</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
          </select>
        </div>
      )}

      {/* 担当トレーナー */}
      <div>
        <label className={labelClass}><User size={12} /> 担当トレーナー</label>
        <select name="trainerMemberId" defaultValue={defaultValues?.trainerMemberId ?? ""} className={inputClass}>
          <option value="">未設定</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}{m.role ? `（${m.role}）` : ""}</option>)}
        </select>
      </div>

      {/* 日時 */}
      <div>
        <label className={labelClass}><Calendar size={12} /> 日時 <span className="text-red-500">*</span></label>
        <input name="scheduledAt" type="datetime-local" required defaultValue={defaultScheduledAt} className={inputClass} />
      </div>

      {/* 場所 */}
      <div>
        <label className={labelClass}><MapPin size={12} /> 場所</label>
        <input name="location" defaultValue={defaultValues?.location} placeholder="FIT STAGE 渋谷店 など" className={inputClass} />
      </div>

      {/* コース */}
      <div>
        <label className={labelClass}>コース</label>
        <input name="course" defaultValue={defaultValues?.course} placeholder="パーソナルトレーニング など" className={inputClass} />
      </div>

      {/* 料金区分 */}
      <div>
        <label className={labelClass}>料金区分</label>
        <select name="paymentType" defaultValue={defaultValues?.paymentType ?? ""} className={inputClass}>
          <option value="">未選択</option>
          <option value="monthly">月会費</option>
          <option value="session_pass">回数券</option>
          <option value="single">ショット</option>
        </select>
      </div>

      {/* ステータス（編集時のみ） */}
      {defaultValues?.id && (
        <div>
          <label className={labelClass}>ステータス</label>
          <select name="status" defaultValue={defaultValues?.status ?? "scheduled"} className={inputClass}>
            <option value="scheduled">予定</option>
            <option value="completed">完了</option>
            <option value="cancelled">キャンセル</option>
          </select>
        </div>
      )}

      {/* 備考 */}
      <div>
        <label className={labelClass}><StickyNote size={12} /> 備考</label>
        <textarea name="note" defaultValue={defaultValues?.note} rows={2}
          placeholder="連絡事項など" className={cn(inputClass, "resize-none")} />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
          キャンセル
        </button>
        <button type="submit" disabled={loading}
          className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold transition flex items-center justify-center gap-2">
          {loading && <Spinner size={14} />}{loading ? "保存中..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

// ─── レッスン1件 ──────────────────────────────────────
function LessonItem({ lesson, customers, members, isAdmin }: {
  lesson: Lesson; customers: Customer[]; members: Member[]; isAdmin: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const boundUpdate = updateLessonAction.bind(null, lesson.id);

  const scheduledDate = new Date(lesson.scheduledAt);
  const dateStr = scheduledDate.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", weekday: "short" });
  const timeStr = scheduledDate.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });

  if (editing) return (
    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-gray-700">レッスンを編集</p>
        <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
      </div>
      <LessonForm defaultValues={lesson} customers={customers} members={members}
        fixedCustomerId={lesson.customerId} onClose={() => setEditing(false)}
        action={boundUpdate} submitLabel="保存する" />
    </div>
  );

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      {/* 日時 */}
      <div className="w-16 flex-shrink-0 text-center">
        <p className="text-xs font-semibold text-gray-900">{dateStr}</p>
        <p className="text-xs text-gray-400">{timeStr}</p>
      </div>

      {/* メイン情報 */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          <StatusBadge status={lesson.status} />
          {lesson.paymentType && <PaymentBadge type={lesson.paymentType} />}
          {lesson.course && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{lesson.course}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          {/* 担当トレーナー */}
          <p className={cn(
            "text-xs flex items-center gap-1",
            lesson.trainerMemberId ? "text-gray-600" : "text-amber-600 font-medium"
          )}>
            <User size={10} className="flex-shrink-0" />
            {lesson.trainerMemberName ?? "担当未設定"}
          </p>
          {lesson.location && (
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <MapPin size={10} className="flex-shrink-0" />{lesson.location}
            </p>
          )}
        </div>
        {lesson.note && <p className="text-xs text-gray-400 mt-0.5 truncate">{lesson.note}</p>}
      </div>

      {/* アクション */}
      {isAdmin && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => setEditing(true)}
            className="p-1.5 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
            <Pencil size={12} />
          </button>
          <button onClick={async () => {
            if (!confirm("このレッスンを削除しますか？")) return;
            setDeleting(true);
            await deleteLessonAction(lesson.id);
          }} disabled={deleting}
            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50">
            {deleting ? <Spinner size={12} /> : <Trash2 size={12} />}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── 顧客グループ（アコーディオン） ──────────────────
function CustomerGroup({ customer, lessons, customers, members, isAdmin }: {
  customer: Customer;
  lessons: Lesson[];
  customers: Customer[];
  members: Member[];
  isAdmin: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const hasUnassigned = lessons.some((l) => !l.trainerMemberId);
  const scheduledCount = lessons.filter((l) => l.status === "scheduled").length;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* 顧客ヘッダー */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-gray-900">{customer.fullName}</p>
            {hasUnassigned && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                <AlertTriangle size={10} /> 担当未設定あり
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {lessons.length}件
            {scheduledCount > 0 && `（予定 ${scheduledCount}件）`}
          </p>
        </div>
        <div className="flex-shrink-0 text-gray-400">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* レッスン一覧 */}
      {expanded && (
        <div className="border-t border-gray-100 px-4">
          {lessons.map((l) => (
            <LessonItem key={l.id} lesson={l} customers={customers} members={members} isAdmin={isAdmin} />
          ))}

          {/* 追加フォーム */}
          {showAdd ? (
            <div className="py-3">
              <LessonForm customers={customers} members={members}
                fixedCustomerId={customer.id} onClose={() => setShowAdd(false)}
                action={createLessonAction} submitLabel="追加する" />
            </div>
          ) : (
            isAdmin && (
              <div className="py-3">
                <button
                  onClick={() => setShowAdd(true)}
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Plus size={13} /> レッスンを追加
                </button>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

// ─── メインコンポーネント ─────────────────────────────
export function RegularLessonsClient({ lessons, customers, members, isAdmin }: {
  lessons: Lesson[]; customers: Customer[]; members: Member[]; isAdmin: boolean;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");

  // 顧客ごとにグループ化（レッスンがある顧客のみ）
  const grouped = useMemo(() => {
    const map = new Map<string, { customer: Customer; lessons: Lesson[] }>();
    lessons.forEach((l) => {
      if (!map.has(l.customerId)) {
        const customer = customers.find((c) => c.id === l.customerId);
        if (customer) map.set(l.customerId, { customer, lessons: [] });
      }
      map.get(l.customerId)?.lessons.push(l);
    });
    // スケジュール日時の新しい順にソート
    map.forEach((g) => g.lessons.sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt)));
    return Array.from(map.values());
  }, [lessons, customers]);

  const filtered = grouped.filter(({ customer }) => {
    const q = search.toLowerCase();
    return !q || customer.fullName.toLowerCase().includes(q) || (customer.email ?? "").toLowerCase().includes(q);
  });

  const totalUnassigned = grouped.reduce(
    (acc, { lessons: ls }) => acc + ls.filter((l) => !l.trainerMemberId).length, 0
  );

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-4 hidden md:flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">通常レッスン</h1>
          <div className="flex items-center gap-3 mt-0.5">
            <p className="text-sm text-gray-500">{lessons.length}件</p>
            {totalUnassigned > 0 && (
              <p className="text-xs text-amber-600 flex items-center gap-1 font-medium">
                <AlertTriangle size={11} /> 担当未設定 {totalUnassigned}件
              </p>
            )}
          </div>
        </div>
        {isAdmin && (
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition">
            <Plus size={16} /> レッスンを追加
          </button>
        )}
      </div>

      <div className="md:hidden mb-4">
        <h1 className="text-lg font-bold text-gray-900">通常レッスン</h1>
        {totalUnassigned > 0 && (
          <p className="text-xs text-amber-600 flex items-center gap-1 font-medium mt-0.5">
            <AlertTriangle size={11} /> 担当未設定 {totalUnassigned}件
          </p>
        )}
      </div>

      {/* 検索 */}
      <div className="mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="顧客名で検索..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {/* 追加フォーム（デスクトップ・顧客選択あり） */}
      {showAdd && (
        <div className="hidden md:block bg-white rounded-2xl border-2 border-blue-400 p-5 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-900">レッスンを追加</p>
            <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <LessonForm customers={customers} members={members}
            onClose={() => setShowAdd(false)} action={createLessonAction} submitLabel="追加する" />
        </div>
      )}

      {/* 空状態 */}
      {grouped.length === 0 && !showAdd ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🏋️</p>
          <p className="text-sm font-semibold text-gray-600">レッスンが登録されていません</p>
          {isAdmin && (
            <button onClick={() => setShowAdd(true)}
              className="mt-5 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition">
              <Plus size={15} /> レッスンを追加
            </button>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">該当する顧客が見つかりません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(({ customer, lessons: ls }) => (
            <CustomerGroup
              key={customer.id}
              customer={customer}
              lessons={ls}
              customers={customers}
              members={members}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}

      {/* FAB（モバイル） */}
      {isAdmin && (
        <button onClick={() => setShowAdd(true)}
          className="md:hidden fixed bottom-6 right-4 w-14 h-14 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-full shadow-lg shadow-blue-200 flex items-center justify-center transition z-30"
          aria-label="レッスンを追加">
          <Plus size={26} />
        </button>
      )}

      {showAdd && (
        <BottomSheet title="レッスンを追加" onClose={() => setShowAdd(false)} scrollable>
          <LessonForm customers={customers} members={members}
            onClose={() => setShowAdd(false)} action={createLessonAction} submitLabel="追加する" />
        </BottomSheet>
      )}
    </div>
  );
}

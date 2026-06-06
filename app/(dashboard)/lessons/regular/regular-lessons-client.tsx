"use client";

import { useState, useMemo } from "react";
import {
  Plus, Pencil, Trash2, X, Search, MapPin, Calendar,
  User, StickyNote, ChevronDown, ChevronUp, AlertTriangle,
  CheckCircle, Clock, XCircle, Ticket,
} from "lucide-react";
import { Lesson, LessonStatus, LESSON_STATUS_LABEL, COURSE_OPTIONS } from "@/lib/lessons-types";
import { SessionPass } from "@/lib/session-passes-types";
import { Customer } from "@/lib/customers-types";
import { Member } from "@/lib/members";
import {
  createLessonAction, updateLessonAction, deleteLessonAction,
  createSessionPassAction, deleteSessionPassAction,
} from "./actions";
import { cn } from "@/lib/cn";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Spinner } from "@/components/ui/spinner";

// ─── バッジ ───────────────────────────────────────────
function CourseBadge({ course }: { course?: string }) {
  if (!course) return null;
  const isSessionPass = course.startsWith("回数券");
  const isMonthly = course.startsWith("月");
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
      isSessionPass ? "bg-amber-100 text-amber-700" :
      isMonthly     ? "bg-blue-100 text-blue-700"   :
                      "bg-gray-100 text-gray-600"
    )}>
      {course}
    </span>
  );
}

function StatusBadge({ status }: { status: LessonStatus }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
      status === "scheduled" ? "bg-blue-100 text-blue-700"   :
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

function passLabel(pass: SessionPass) {
  return `${pass.totalCount}回券（残り${pass.remainingCount}回）${pass.expiredAt ? "　期限: " + pass.expiredAt : ""}`;
}

// ─── レッスンフォーム ─────────────────────────────────
function LessonForm({
  defaultValues, customers, members, sessionPasses, fixedCustomerId, onClose, action, submitLabel,
}: {
  defaultValues?: Partial<Lesson>;
  customers: Customer[];
  members: Member[];
  sessionPasses: SessionPass[];
  fixedCustomerId?: string;
  onClose: () => void;
  action: (fd: FormData) => Promise<void>;
  submitLabel: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState(fixedCustomerId ?? defaultValues?.customerId ?? "");
  const [selectedCourse, setSelectedCourse] = useState(defaultValues?.course ?? "");

  async function handleSubmit(fd: FormData) {
    setError(""); setLoading(true);
    try { await action(fd); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : "エラー"); setLoading(false); }
  }

  const inputClass = "w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelClass = "text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5";
  const defaultScheduledAt = defaultValues?.scheduledAt
    ? new Date(defaultValues.scheduledAt).toISOString().slice(0, 16) : "";

  const isSessionPassCourse = selectedCourse.startsWith("回数券");
  const availablePasses = sessionPasses.filter(
    (p) => p.customerId === selectedCustomerId && (p.remainingCount > 0 || p.id === defaultValues?.sessionPassId)
  );

  return (
    <form action={handleSubmit} className="space-y-4">
      {fixedCustomerId ? (
        <input type="hidden" name="customerId" value={fixedCustomerId} />
      ) : (
        <div>
          <label className={labelClass}><User size={12} /> 顧客 <span className="text-red-500">*</span></label>
          <select name="customerId" required defaultValue={defaultValues?.customerId ?? ""}
            onChange={(e) => setSelectedCustomerId(e.target.value)} className={inputClass}>
            <option value="">顧客を選択...</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
          </select>
        </div>
      )}

      <div>
        <label className={labelClass}><User size={12} /> 担当トレーナー</label>
        <select name="trainerMemberId" defaultValue={defaultValues?.trainerMemberId ?? ""} className={inputClass}>
          <option value="">未設定</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}{m.role ? `（${m.role}）` : ""}</option>)}
        </select>
      </div>

      <div>
        <label className={labelClass}><Calendar size={12} /> 日時 <span className="text-red-500">*</span></label>
        <input name="scheduledAt" type="datetime-local" required defaultValue={defaultScheduledAt} className={inputClass} />
      </div>

      <div>
        <label className={labelClass}><MapPin size={12} /> 場所</label>
        <input name="location" defaultValue={defaultValues?.location} placeholder="FIT STAGE 渋谷店" className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>コース</label>
        <select name="course" value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} className={inputClass}>
          <option value="">未選択</option>
          <optgroup label="回数券">
            {COURSE_OPTIONS.filter((o) => o.paymentType === "session_pass").map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </optgroup>
          <optgroup label="月会費">
            {COURSE_OPTIONS.filter((o) => o.paymentType === "monthly").map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </optgroup>
          <optgroup label="都度">
            {COURSE_OPTIONS.filter((o) => o.paymentType === "single").map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* 回数券選択（回数券コースの場合のみ） */}
      {isSessionPassCourse && (
        <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
          <label className={cn(labelClass, "text-amber-700")}>
            <Ticket size={12} /> 使用する回数券 <span className="text-red-500">*</span>
          </label>
          {availablePasses.length === 0 ? (
            <p className="text-xs text-amber-600">この顧客の有効な回数券がありません</p>
          ) : (
            <select name="sessionPassId" required defaultValue={defaultValues?.sessionPassId ?? ""} className={inputClass}>
              <option value="">回数券を選択...</option>
              {availablePasses.map((p) => (
                <option key={p.id} value={p.id}>{passLabel(p)}</option>
              ))}
            </select>
          )}
        </div>
      )}

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

// ─── 回数券追加フォーム ───────────────────────────────
function SessionPassForm({ customerId, onClose }: { customerId: string; onClose: () => void }) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(fd: FormData) {
    setLoading(true);
    try { await createSessionPassAction(fd); onClose(); }
    catch { setLoading(false); }
  }

  const inputClass = "w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500";
  const labelClass = "text-xs font-semibold text-gray-600 mb-1.5";

  return (
    <form action={handleSubmit} className="space-y-3 pt-2">
      <input type="hidden" name="customerId" value={customerId} />
      <div className="flex gap-2">
        <div className="flex-1">
          <label className={labelClass}>回数</label>
          <input name="totalCount" type="number" min="1" required placeholder="10" className={inputClass} />
        </div>
        <div className="flex-1">
          <label className={labelClass}>購入日</label>
          <input name="purchasedAt" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>有効期限（任意）</label>
        <input name="expiredAt" type="date" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>メモ</label>
        <input name="note" placeholder="備考など" className={inputClass} />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onClose}
          className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
          キャンセル
        </button>
        <button type="submit" disabled={loading}
          className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-sm font-semibold transition flex items-center justify-center gap-1.5">
          {loading && <Spinner size={13} />}{loading ? "追加中..." : "追加する"}
        </button>
      </div>
    </form>
  );
}

// ─── 回数券セクション ─────────────────────────────────
function SessionPassSection({ customerId, passes }: { customerId: string; passes: SessionPass[] }) {
  const [showAdd, setShowAdd] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  return (
    <div className="py-3 border-t border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
          <Ticket size={11} /> 回数券
        </p>
        <button onClick={() => setShowAdd(!showAdd)}
          className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1">
          <Plus size={11} /> 追加
        </button>
      </div>

      {showAdd && <SessionPassForm customerId={customerId} onClose={() => setShowAdd(false)} />}

      {passes.length === 0 && !showAdd ? (
        <p className="text-xs text-gray-400">回数券なし</p>
      ) : (
        <div className="space-y-1.5">
          {passes.map((pass) => (
            <div key={pass.id} className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl text-xs border",
              pass.remainingCount === 0
                ? "bg-gray-50 border-gray-200 text-gray-400"
                : pass.remainingCount <= 2
                  ? "bg-red-50 border-red-200"
                  : "bg-amber-50 border-amber-200"
            )}>
              <Ticket size={12} className={pass.remainingCount === 0 ? "text-gray-300" : "text-amber-500"} />
              <div className="flex-1">
                <span className="font-semibold">{pass.totalCount}回券</span>
                <span className={cn(
                  "ml-2 font-bold",
                  pass.remainingCount === 0 ? "text-gray-400" :
                  pass.remainingCount <= 2  ? "text-red-600"  : "text-amber-700"
                )}>
                  残り{pass.remainingCount}回
                </span>
                {pass.remainingCount === 0 && <span className="ml-1 text-gray-400">（使い切り）</span>}
              </div>
              <div className="text-gray-400 text-right">
                <p>{pass.purchasedAt}</p>
                {pass.expiredAt && <p>～{pass.expiredAt}</p>}
              </div>
              <button
                onClick={async () => {
                  if (!confirm("この回数券を削除しますか？")) return;
                  setDeletingId(pass.id);
                  await deleteSessionPassAction(pass.id);
                  setDeletingId(null);
                }}
                disabled={deletingId === pass.id}
                className="p-1 text-gray-300 hover:text-red-400 transition disabled:opacity-50"
              >
                {deletingId === pass.id ? <Spinner size={11} /> : <Trash2 size={11} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── レッスン1件 ──────────────────────────────────────
function LessonItem({ lesson, customers, members, sessionPasses, isAdmin }: {
  lesson: Lesson; customers: Customer[]; members: Member[]; sessionPasses: SessionPass[]; isAdmin: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const boundUpdate = updateLessonAction.bind(null, lesson.id);

  const scheduledDate = new Date(lesson.scheduledAt);
  const dateStr = scheduledDate.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", weekday: "short" });
  const timeStr = scheduledDate.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });

  const linkedPass = lesson.sessionPassId ? sessionPasses.find((p) => p.id === lesson.sessionPassId) : undefined;

  if (editing) return (
    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 my-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-gray-700">レッスンを編集</p>
        <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
      </div>
      <LessonForm defaultValues={lesson} customers={customers} members={members} sessionPasses={sessionPasses}
        fixedCustomerId={lesson.customerId} onClose={() => setEditing(false)}
        action={boundUpdate} submitLabel="保存する" />
    </div>
  );

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="w-16 flex-shrink-0 text-center">
        <p className="text-xs font-semibold text-gray-900">{dateStr}</p>
        <p className="text-xs text-gray-400">{timeStr}</p>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          <StatusBadge status={lesson.status} />
          <CourseBadge course={lesson.course} />
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          <p className={cn("text-xs flex items-center gap-1",
            lesson.trainerMemberId ? "text-gray-600" : "text-amber-600 font-medium")}>
            <User size={10} className="flex-shrink-0" />
            {lesson.trainerMemberName ?? "担当未設定"}
          </p>
          {lesson.location && (
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <MapPin size={10} className="flex-shrink-0" />{lesson.location}
            </p>
          )}
        </div>
        {linkedPass && (
          <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
            <Ticket size={10} /> {linkedPass.totalCount}回券（残り{linkedPass.remainingCount}回）
          </p>
        )}
        {lesson.note && <p className="text-xs text-gray-400 mt-0.5 truncate">{lesson.note}</p>}
      </div>
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

// ─── 顧客グループ ─────────────────────────────────────
function CustomerGroup({ customer, lessons, sessionPasses, customers, members, isAdmin }: {
  customer: Customer;
  lessons: Lesson[];
  sessionPasses: SessionPass[];
  customers: Customer[];
  members: Member[];
  isAdmin: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const hasUnassigned = lessons.some((l) => !l.trainerMemberId);
  const scheduledCount = lessons.filter((l) => l.status === "scheduled").length;
  const customerPasses = sessionPasses.filter((p) => p.customerId === customer.id);
  const lowPassCount = customerPasses.some((p) => p.remainingCount > 0 && p.remainingCount <= 2);
  const exhaustedPass = customerPasses.some((p) => p.remainingCount === 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition text-left">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-gray-900">{customer.fullName}</p>
            {hasUnassigned && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                <AlertTriangle size={10} /> 担当未設定
              </span>
            )}
            {lowPassCount && (
              <span className="inline-flex items-center gap-1 text-xs text-red-500 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full font-medium">
                <Ticket size={10} /> 回数券残りわずか
              </span>
            )}
            {exhaustedPass && !lowPassCount && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full font-medium">
                <Ticket size={10} /> 回数券使い切り
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {lessons.length}件{scheduledCount > 0 && `（予定 ${scheduledCount}件）`}
            {customerPasses.length > 0 && `　回数券: ${customerPasses.reduce((s, p) => s + p.remainingCount, 0)}回残`}
          </p>
        </div>
        <div className="flex-shrink-0 text-gray-400">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4">
          {/* レッスン一覧 */}
          {lessons.map((l) => (
            <LessonItem key={l.id} lesson={l} customers={customers} members={members}
              sessionPasses={sessionPasses} isAdmin={isAdmin} />
          ))}

          {showAdd ? (
            <div className="py-3">
              <LessonForm customers={customers} members={members} sessionPasses={sessionPasses}
                fixedCustomerId={customer.id} onClose={() => setShowAdd(false)}
                action={createLessonAction} submitLabel="追加する" />
            </div>
          ) : (
            isAdmin && (
              <div className="py-2">
                <button onClick={() => setShowAdd(true)}
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium">
                  <Plus size={13} /> レッスンを追加
                </button>
              </div>
            )
          )}

          {/* 回数券セクション */}
          <SessionPassSection customerId={customer.id} passes={customerPasses} />
        </div>
      )}
    </div>
  );
}

// ─── メインコンポーネント ─────────────────────────────
export function RegularLessonsClient({ lessons, customers, members, sessionPasses, isAdmin }: {
  lessons: Lesson[]; customers: Customer[]; members: Member[];
  sessionPasses: SessionPass[]; isAdmin: boolean;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");

  const grouped = useMemo(() => {
    const map = new Map<string, { customer: Customer; lessons: Lesson[] }>();
    lessons.forEach((l) => {
      if (!map.has(l.customerId)) {
        const customer = customers.find((c) => c.id === l.customerId);
        if (customer) map.set(l.customerId, { customer, lessons: [] });
      }
      map.get(l.customerId)?.lessons.push(l);
    });
    map.forEach((g) => g.lessons.sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt)));
    return Array.from(map.values());
  }, [lessons, customers]);

  const filtered = grouped.filter(({ customer }) => {
    const q = search.toLowerCase();
    return !q || customer.fullName.toLowerCase().includes(q);
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

      <div className="mb-4 relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="顧客名で検索..."
          className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {showAdd && (
        <div className="hidden md:block bg-white rounded-2xl border-2 border-blue-400 p-5 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-900">レッスンを追加</p>
            <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <LessonForm customers={customers} members={members} sessionPasses={sessionPasses}
            onClose={() => setShowAdd(false)} action={createLessonAction} submitLabel="追加する" />
        </div>
      )}

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
            <CustomerGroup key={customer.id} customer={customer} lessons={ls}
              sessionPasses={sessionPasses} customers={customers} members={members} isAdmin={isAdmin} />
          ))}
        </div>
      )}

      {isAdmin && (
        <button onClick={() => setShowAdd(true)}
          className="md:hidden fixed bottom-6 right-4 w-14 h-14 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-full shadow-lg shadow-blue-200 flex items-center justify-center transition z-30"
          aria-label="レッスンを追加">
          <Plus size={26} />
        </button>
      )}

      {showAdd && (
        <BottomSheet title="レッスンを追加" onClose={() => setShowAdd(false)} scrollable>
          <LessonForm customers={customers} members={members} sessionPasses={sessionPasses}
            onClose={() => setShowAdd(false)} action={createLessonAction} submitLabel="追加する" />
        </BottomSheet>
      )}
    </div>
  );
}

"use client";

import { useState, useRef } from "react";
import { Plus, Check, Trash2, Pencil, X, ChevronLeft } from "lucide-react";
import { Todo, Priority } from "@/lib/todos";
import { Member } from "@/lib/members";
import { createTodo, toggleTodoAction, deleteTodoAction, updateTodoAction } from "./actions";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Spinner } from "@/components/ui/spinner";

type StatusFilter   = "all" | "pending" | "completed";
type PriorityFilter = "all" | Priority;

const priorityConfig = {
  high:   { label: "高", border: "border-l-red-400",   badge: "bg-red-50 text-red-600" },
  medium: { label: "中", border: "border-l-amber-400", badge: "bg-amber-50 text-amber-600" },
  low:    { label: "低", border: "border-l-slate-300", badge: "bg-slate-100 text-slate-500" },
} as const;

// ─── 担当者セレクト ───────────────────────────────────
function AssigneeSelect({
  members,
  value,
  onChange,
}: {
  members: Member[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
    >
      <option value="">未割り当て</option>
      {members.map((m) => (
        <option key={m.id} value={m.id}>{m.name}</option>
      ))}
    </select>
  );
}

// ─── 追加フォーム ─────────────────────────────────────
function AddForm({ members, onClose }: { members: Member[]; onClose: () => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading]       = useState(false);
  const [priority, setPriority]     = useState<Priority>("medium");
  const [assignedToId, setAssignee] = useState("");

  async function handleSubmit(formData: FormData) {
    formData.set("priority",     priority);
    formData.set("assignedToId", assignedToId);
    setLoading(true);
    await createTodo(formData);
    formRef.current?.reset();
    setPriority("medium");
    setAssignee("");
    setLoading(false);
    onClose();
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-3">
      <input
        name="title"
        type="text"
        required
        autoFocus
        placeholder="タスク名を入力..."
        className="w-full px-3.5 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <textarea
        name="description"
        placeholder="詳細・メモ（任意）"
        rows={3}
        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      />
      <div>
        <p className="text-xs font-medium text-gray-500 mb-1.5">担当者</p>
        <AssigneeSelect members={members} value={assignedToId} onChange={setAssignee} />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 mb-1.5">優先度</p>
        <div className="flex gap-2">
          {(["high", "medium", "low"] as Priority[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={cn(
                "flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition",
                priority === p
                  ? `${priorityConfig[p].badge} border-current`
                  : "bg-white border-gray-200 text-gray-400 hover:border-gray-300"
              )}
            >
              {priorityConfig[p].label}
            </button>
          ))}
        </div>
      </div>
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
          {loading ? "追加中..." : "追加する"}
        </button>
      </div>
    </form>
  );
}

// ─── 編集フォーム ─────────────────────────────────────
function EditForm({
  todo,
  members,
  onClose,
}: {
  todo: Todo;
  members: Member[];
  onClose: () => void;
}) {
  const [saving, setSaving]         = useState(false);
  const [title, setTitle]           = useState(todo.title);
  const [desc, setDesc]             = useState(todo.description ?? "");
  const [priority, setPriority]     = useState<Priority>(todo.priority);
  const [assignedToId, setAssignee] = useState(todo.assignedTo?.id ?? "");

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    await updateTodoAction(todo.id, {
      title:        title.trim(),
      description:  desc.trim(),
      priority,
      assignedToId: assignedToId || null,
    });
    onClose();
  }

  return (
    <div className="space-y-3">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="タスク名"
      />
      <textarea
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        rows={3}
        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        placeholder="詳細・メモ（任意）"
      />
      <div>
        <p className="text-xs font-medium text-gray-500 mb-1.5">担当者</p>
        <AssigneeSelect members={members} value={assignedToId} onChange={setAssignee} />
      </div>
      <div className="flex gap-2">
        {(["high", "medium", "low"] as Priority[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPriority(p)}
            className={cn(
              "flex-1 py-1.5 rounded-lg text-xs font-semibold border-2 transition",
              priority === p
                ? `${priorityConfig[p].badge} border-current`
                : "bg-white border-gray-200 text-gray-400"
            )}
          >
            {priorityConfig[p].label}
          </button>
        ))}
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
        >
          キャンセル
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold transition flex items-center justify-center gap-2"
        >
          {saving && <Spinner size={14} />}
          {saving ? "保存中..." : "保存する"}
        </button>
      </div>
    </div>
  );
}

// ─── タスク詳細モーダル ───────────────────────────────
function TodoDetailModal({
  todo,
  members,
  onClose,
}: {
  todo: Todo;
  members: Member[];
  onClose: () => void;
}) {
  const [completing, setCompleting] = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [editing, setEditing]       = useState(false);
  const pc = priorityConfig[todo.priority];

  async function handleComplete() {
    setCompleting(true);
    await toggleTodoAction(todo.id);
    onClose();
  }

  async function handleDelete() {
    if (!confirm("このタスクを削除しますか？")) return;
    setDeleting(true);
    await deleteTodoAction(todo.id);
    onClose();
  }

  const metaRow = (label: string, content: React.ReactNode) => (
    <div className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-400 w-14 flex-shrink-0">{label}</span>
      <div className="text-sm text-gray-700">{content}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto">
        {/* モバイル ハンドル */}
        <div className="sm:hidden w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 mb-1" />

        <div className="p-5">
          {/* ヘッダー */}
          <div className="flex items-start justify-between gap-3 mb-4">
            {editing ? (
              <button
                onClick={() => setEditing(false)}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition"
              >
                <ChevronLeft size={16} /> 戻る
              </button>
            ) : (
              <span className={cn("text-xs px-2.5 py-1 rounded-full font-semibold", pc.badge)}>
                {pc.label}
              </span>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition flex-shrink-0"
            >
              <X size={18} />
            </button>
          </div>

          {editing ? (
            <>
              <p className="text-sm font-bold text-gray-900 mb-4">タスクを編集</p>
              <EditForm todo={todo} members={members} onClose={() => setEditing(false)} />
            </>
          ) : (
            <>
              {/* タイトル */}
              <h2 className="text-base font-bold text-gray-900 leading-snug mb-4">
                {todo.title}
              </h2>

              {/* 詳細 */}
              {todo.description && (
                <div className="bg-gray-50 rounded-xl p-3.5 mb-4">
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                    {todo.description}
                  </p>
                </div>
              )}

              {/* メタ情報 */}
              <div className="mb-5">
                {metaRow("担当者",
                  todo.assignedTo ? (
                    <span className="flex items-center gap-1.5">
                      <Avatar name={todo.assignedTo.name} src={todo.assignedTo.avatarUrl} size="sm" />
                      {todo.assignedTo.name}
                    </span>
                  ) : (
                    <span className="text-gray-400">未割り当て</span>
                  )
                )}
                {todo.createdBy && metaRow("作成者",
                  <span className="flex items-center gap-1.5">
                    <Avatar name={todo.createdBy.name} src={todo.createdBy.avatarUrl} size="sm" />
                    {todo.createdBy.name}
                  </span>
                )}
                {metaRow("作成日",
                  <span className="text-gray-500">
                    {new Date(todo.createdAt).toLocaleDateString("ja-JP", {
                      year: "numeric", month: "long", day: "numeric",
                    })}
                  </span>
                )}
                {todo.completed && todo.completedAt && metaRow("完了日",
                  <span className="text-green-600">
                    {new Date(todo.completedAt).toLocaleDateString("ja-JP", {
                      year: "numeric", month: "long", day: "numeric",
                    })}
                  </span>
                )}
                {todo.completedBy && metaRow("完了者",
                  <span className="flex items-center gap-1.5 text-green-600">
                    <Avatar name={todo.completedBy.name} src={todo.completedBy.avatarUrl} size="sm" />
                    {todo.completedBy.name}
                  </span>
                )}
              </div>

              {/* アクション */}
              <div className="space-y-2">
                <button
                  onClick={handleComplete}
                  disabled={completing || deleting}
                  className={cn(
                    "w-full py-3 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2 disabled:opacity-60",
                    todo.completed
                      ? "bg-gray-100 hover:bg-gray-200 text-gray-600"
                      : "bg-green-500 hover:bg-green-600 active:scale-[0.98] text-white shadow-sm shadow-green-200"
                  )}
                >
                  {completing
                    ? <><Spinner size={15} /> 処理中...</>
                    : todo.completed ? "未対応に戻す" : <><Check size={16} strokeWidth={2.5} /> 完了にする</>}
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditing(true)}
                    disabled={completing || deleting}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition flex items-center justify-center gap-1.5 disabled:opacity-60"
                  >
                    <Pencil size={13} /> 編集
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting || completing}
                    className="flex-1 py-2.5 rounded-xl border border-red-100 text-sm font-medium text-red-500 hover:bg-red-50 transition flex items-center justify-center gap-1.5 disabled:opacity-60"
                  >
                    {deleting ? <><Spinner size={13} /> 削除中...</> : <><Trash2 size={13} /> 削除</>}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── タスクカード ─────────────────────────────────────
function TodoCard({ todo, onOpen }: { todo: Todo; onOpen: () => void }) {
  const pc = priorityConfig[todo.priority];

  return (
    <button
      onClick={onOpen}
      className={cn(
        "w-full text-left bg-white rounded-2xl border border-gray-200 border-l-4 overflow-hidden transition-all hover:shadow-sm active:scale-[0.99]",
        pc.border
      )}
    >
      <div className="flex items-start gap-3 px-4 py-3.5">
        {/* 完了インジケーター */}
        <div className={cn(
          "mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center",
          todo.completed
            ? "bg-green-500 border-green-500"
            : "border-gray-300"
        )}>
          {todo.completed && <Check size={10} className="text-white" strokeWidth={3.5} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold leading-snug text-gray-900">
              {todo.title}
            </p>
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0", pc.badge)}>
              {pc.label}
            </span>
          </div>

          {todo.description && (
            <p className="text-xs mt-1 leading-relaxed line-clamp-1 text-gray-500">
              {todo.description}
            </p>
          )}

          <div className="flex items-center gap-x-3 mt-2 flex-wrap">
            {todo.assignedTo ? (
              <span className="flex items-center gap-1 text-xs text-gray-600">
                <span className="text-gray-400">担当:</span>
                <Avatar name={todo.assignedTo.name} src={todo.assignedTo.avatarUrl} size="sm" />
                {todo.assignedTo.name}
              </span>
            ) : (
              <span className="text-xs text-gray-300">担当: 未割り当て</span>
            )}
            {todo.completed && todo.completedBy && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <Avatar name={todo.completedBy.name} src={todo.completedBy.avatarUrl} size="sm" />
                {todo.completedBy.name}が完了
              </span>
            )}
            <span className="text-xs text-gray-400 ml-auto">
              {todo.completed && todo.completedAt
                ? new Date(todo.completedAt).toLocaleDateString("ja-JP", { month: "short", day: "numeric" }) + "完了"
                : new Date(todo.createdAt).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── メインコンポーネント ─────────────────────────────
export function TodoClient({ todos, members }: { todos: Todo[]; members: Member[] }) {
  const [statusFilter,   setStatusFilter]   = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [showAdd,        setShowAdd]        = useState(false);
  const [selectedId,     setSelectedId]     = useState<string | null>(null);

  // todos が再取得されると最新データを自動反映
  const selectedTodo = selectedId ? todos.find((t) => t.id === selectedId) ?? null : null;

  const isFiltered = statusFilter !== "all" || priorityFilter !== "all" || assigneeFilter !== "all";

  const filtered = todos
    .filter((t) => statusFilter === "all" ? true : statusFilter === "pending" ? !t.completed : t.completed)
    .filter((t) => priorityFilter === "all" ? true : t.priority === priorityFilter)
    .filter((t) => {
      if (assigneeFilter === "all")        return true;
      if (assigneeFilter === "unassigned") return !t.assignedTo;
      return t.assignedTo?.id === assigneeFilter;
    });

  const pending      = filtered.filter((t) => !t.completed);
  const completed    = filtered.filter((t) => t.completed);
  const totalAll     = todos.length;
  const completedAll = todos.filter((t) => t.completed).length;
  const percent      = totalAll > 0 ? Math.round((completedAll / totalAll) * 100) : 0;

  const statusTabs: { key: StatusFilter; label: string; count: number }[] = [
    { key: "all",       label: "すべて",   count: todos.length },
    { key: "pending",   label: "未対応",   count: todos.filter((t) => !t.completed).length },
    { key: "completed", label: "完了済み", count: todos.filter((t) => t.completed).length },
  ];

  const priorityFilters: { key: PriorityFilter; label: string }[] = [
    { key: "all",    label: "全て" },
    { key: "high",   label: "高" },
    { key: "medium", label: "中" },
    { key: "low",    label: "低" },
  ];

  function renderList(items: Todo[]) {
    return (
      <div className="space-y-2">
        {items.map((t) => (
          <TodoCard key={t.id} todo={t} onOpen={() => setSelectedId(t.id)} />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* PC ヘッダー */}
      <div className="mb-4 hidden md:flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">タスク</h1>
          <p className="text-sm text-gray-500 mt-0.5">タスク管理</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition"
        >
          <Plus size={16} /> タスクを追加
        </button>
      </div>

      {/* 進捗バー */}
      {totalAll > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">進捗</span>
            <span className="text-sm font-bold text-gray-900">
              {completedAll} <span className="text-gray-400 font-normal">/ {totalAll} 完了</span>
            </span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-500", percent === 100 ? "bg-green-500" : "bg-blue-500")}
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-gray-400">{totalAll - completedAll}件残り</span>
            <span className={cn("text-xs font-semibold", percent === 100 ? "text-green-600" : "text-blue-600")}>{percent}%</span>
          </div>
        </div>
      )}

      {/* ステータスタブ */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-3 gap-1">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all",
              statusFilter === tab.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.label.slice(0, 2)}</span>
            <span className={cn(
              "text-xs min-w-[1.25rem] h-5 flex items-center justify-center px-1.5 rounded-full font-bold",
              statusFilter === tab.key ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-500"
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* フィルター行 */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex gap-1">
          {priorityFilters.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPriorityFilter(key)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition",
                priorityFilter === key
                  ? "bg-gray-800 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <select
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          className="ml-auto px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">全担当者</option>
          <option value="unassigned">未割り当て</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      {/* PC インライン追加フォーム */}
      {showAdd && (
        <div className="hidden md:block bg-white rounded-2xl border-2 border-blue-400 p-5 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-900">新しいタスク</p>
            <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
          <AddForm members={members} onClose={() => setShowAdd(false)} />
        </div>
      )}

      {/* タスクリスト */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          {todos.length === 0 ? (
            <>
              <p className="text-4xl mb-3">📋</p>
              <p className="text-sm font-semibold text-gray-600">タスクがありません</p>
              <p className="text-xs text-gray-400 mt-1">最初のタスクを追加しましょう</p>
              <button
                onClick={() => setShowAdd(true)}
                className="mt-5 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition"
              >
                <Plus size={15} /> タスクを追加
              </button>
            </>
          ) : (
            <>
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-sm font-semibold text-gray-600">条件に合うタスクがありません</p>
              <p className="text-xs text-gray-400 mt-1">フィルタを変更してみてください</p>
            </>
          )}
        </div>
      ) : statusFilter === "all" && !isFiltered ? (
        <div className="space-y-5">
          {pending.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1 mb-2">
                未対応 — {pending.length}
              </p>
              {renderList(pending)}
            </div>
          )}
          {completed.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1 mb-2">
                完了済み — {completed.length}
              </p>
              {renderList(completed)}
            </div>
          )}
        </div>
      ) : (
        renderList(filtered)
      )}

      {/* モバイル FAB */}
      <button
        onClick={() => setShowAdd(true)}
        className="md:hidden fixed bottom-6 right-4 w-14 h-14 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-full shadow-lg shadow-blue-200 flex items-center justify-center transition z-30"
        aria-label="タスクを追加"
      >
        <Plus size={26} />
      </button>

      {/* モバイル 追加ボトムシート */}
      {showAdd && (
        <BottomSheet title="新しいタスク" onClose={() => setShowAdd(false)} scrollable>
          <AddForm members={members} onClose={() => setShowAdd(false)} />
        </BottomSheet>
      )}

      {/* タスク詳細モーダル */}
      {selectedTodo && (
        <TodoDetailModal
          todo={selectedTodo}
          members={members}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

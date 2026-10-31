"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { ListChecks, ChevronDown, ChevronUp, Plus, X, Trash2, CalendarClock, CalendarCheck, UserRound, Pencil, Check } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { MemberLabel } from "@/components/ui/member-label";
import { useSubmitLock } from "@/lib/use-submit-lock";
import { assertActionOk, type ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/cn";
import {
  TASK_CATEGORIES, TASK_STATUSES, TASK_STATUS_CLASS, TASK_CATEGORY_CLASS, isTaskDone, isTaskOverdue,
  type Task,
} from "@/lib/tasks-types";
import { createTaskAction, updateTaskAction, updateTaskStatusAction, deleteTaskAction } from "./actions";

type MemberLite = { id: string; name: string; avatarUrl?: string };

function pad(n: number) { return String(n).padStart(2, "0"); }

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];

/** 「11/13(金)」 */
function dueLabel(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const w = new Date(y, m - 1, d).getDay();
  return `${m}/${d}(${WEEK[w]})`;
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

/** フォーム送信 → サーバーアクション。revalidatePath で最新の画面が同じ往復で返るので router.refresh() はしない */
function useActionForm(action: (fd: FormData) => Promise<ActionResult>, onDone?: () => void) {
  const { locked, run } = useSubmitLock();
  const [error, setError] = useState("");
  async function submit(fd: FormData) {
    setError("");
    await run(async () => {
      try { assertActionOk(await action(fd)); onDone?.(); }
      catch (e) { setError(e instanceof Error ? e.message : "保存に失敗しました"); }
    });
  }
  return { locked, error, submit };
}

function Badge({ text, className }: { text: string; className?: string }) {
  return <span className={cn("text-[11px] font-semibold rounded-full px-2.5 py-0.5 whitespace-nowrap", className)}>{text}</span>;
}

// ─── 入力欄（追加・編集で共通） ─────────────────────────
function TaskFields({ task, members, idPrefix }: { task?: Task; members: MemberLite[]; idPrefix: string }) {
  return (
    <>
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-title`}>やること<span className="text-red-500"> *</span></label>
        <input id={`${idPrefix}-title`} name="title" defaultValue={task?.title} required placeholder="例: 企画書を作る" className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass} htmlFor={`${idPrefix}-category`}>ジャンル</label>
          <select id={`${idPrefix}-category`} name="category" defaultValue={task?.category ?? "その他"} className={inputClass}>
            {TASK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor={`${idPrefix}-assignee`}>担当</label>
          <select id={`${idPrefix}-assignee`} name="assigneeId" defaultValue={task?.assigneeId ?? ""} className={inputClass}>
            <option value="">未割当</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-due`}>期限（任意）</label>
        <input id={`${idPrefix}-due`} name="dueOn" type="date" defaultValue={task?.dueOn} className={inputClass} />
        <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1"><CalendarCheck size={11} />期限と担当があれば、担当者のスケジュールに入ります（担当者にLINEでもお知らせ）</p>
      </div>
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-memo`}>メモ（任意）</label>
        <textarea id={`${idPrefix}-memo`} name="memo" rows={3} defaultValue={task?.memo} placeholder="決まっていること・気をつけること" className={inputClass} />
      </div>
    </>
  );
}

// ─── 1件 ─────────────────────────────────────────────
function TaskCard({ task, members, meId, isAdmin, today }: { task: Task; members: MemberLite[]; meId?: string; isAdmin: boolean; today: string }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [, startTransition] = useTransition();
  const [status, setOptimisticStatus] = useOptimistic(task.status);
  const del = useSubmitLock();
  const form = useActionForm(updateTaskAction.bind(null, task.id), () => setEditing(false));
  const assignee = members.find((m) => m.id === task.assigneeId);
  const done = status === "完了";
  const overdue = !done && isTaskOverdue(task, today);
  const canDelete = isAdmin || (!!meId && task.createdById === meId);

  function changeStatus(value: string) {
    if (value === status) return;
    startTransition(async () => {
      setOptimisticStatus(value);
      try { assertActionOk(await updateTaskStatusAction(task.id, value)); }
      catch (e) { alert(e instanceof Error ? e.message : "変更に失敗しました"); }
    });
  }

  function handleDelete() {
    if (!confirm("このやることを削除しますか？")) return;
    del.run(async () => {
      try { assertActionOk(await deleteTaskAction(task.id)); }
      catch (e) { alert(e instanceof Error ? e.message : "削除に失敗しました"); }
    });
  }

  return (
    <div className={cn("bg-white rounded-2xl border", overdue ? "border-red-300" : "border-gray-200", done && "opacity-70")}>
      <div className="flex items-start gap-3 p-4">
        {/* 完了チェック。押した瞬間に見た目を変え、保存は裏で行う */}
        <button
          type="button" onClick={() => changeStatus(done ? "未着手" : "完了")}
          aria-label={done ? "未着手に戻す" : "完了にする"}
          className={cn("mt-0.5 w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition",
            done ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-300 text-transparent hover:border-emerald-400")}
        ><Check size={14} strokeWidth={3} /></button>

        <button onClick={() => setOpen(!open)} className="flex-1 min-w-0 text-left" aria-expanded={open}>
          <p className={cn("text-[15px] font-bold leading-snug", done ? "text-gray-400 line-through" : "text-gray-900")}>{task.title}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs text-gray-500">
            <Badge text={task.category} className={TASK_CATEGORY_CLASS[task.category] ?? TASK_CATEGORY_CLASS["その他"]} />
            {status === "進行中" && <Badge text="進行中" className={TASK_STATUS_CLASS["進行中"]} />}
            {assignee
              ? <MemberLabel name={assignee.name} avatarUrl={assignee.avatarUrl} textClassName="text-xs text-gray-600" />
              : !done && <span className="inline-flex items-center gap-1 text-amber-600"><UserRound size={12} />未割当</span>}
            {task.dueOn && (
              <span className={cn("inline-flex items-center gap-1 tabular-nums", overdue ? "text-red-600 font-semibold" : "")}>
                <CalendarClock size={12} />{dueLabel(task.dueOn)}{overdue ? "（期限切れ）" : ""}
              </span>
            )}
          </div>
        </button>
        <button onClick={() => setOpen(!open)} aria-label={open ? "閉じる" : "開く"} className="flex-shrink-0 mt-0.5 text-gray-400">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          <div className="flex gap-1.5">
            {TASK_STATUSES.map((s) => (
              <button key={s} type="button" onClick={() => changeStatus(s)}
                className={cn("px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap transition",
                  status === s ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-500 border-gray-200")}
              >{s}</button>
            ))}
          </div>

          {editing ? (
            <form action={form.submit} className="border-2 border-blue-300 rounded-xl p-3 space-y-3">
              <TaskFields task={task} members={members} idPrefix={`e-${task.id}`} />
              {form.error && <p className="text-xs text-red-500">{form.error}</p>}
              <SubmitButtons locked={form.locked} label="保存する" onCancel={() => setEditing(false)} />
            </form>
          ) : (
            <>
              {task.memo && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">{task.memo}</p>
                </div>
              )}
              <div className="flex items-center gap-3">
                <button onClick={() => setEditing(true)} className="text-xs text-blue-600 font-semibold inline-flex items-center gap-1"><Pencil size={12} />編集</button>
                {task.eventId && <span className="text-[11px] text-emerald-600 inline-flex items-center gap-1"><CalendarCheck size={11} />スケジュールに登録済み</span>}
                {canDelete && (
                  <button onClick={handleDelete} disabled={del.locked} aria-label="削除" className="ml-auto p-1 text-gray-300 hover:text-red-500 transition"><Trash2 size={14} /></button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 追加 ─────────────────────────────────────────────
function AddTaskForm({ members, onClose }: { members: MemberLite[]; onClose: () => void }) {
  const form = useActionForm(createTaskAction, onClose);
  return (
    <div className="bg-white rounded-2xl border-2 border-blue-400 p-5 mb-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold text-gray-900">やることを追加</p>
        <button onClick={onClose} aria-label="閉じる" className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
      </div>
      <form action={form.submit} className="space-y-3">
        <TaskFields members={members} idPrefix="new" />
        {form.error && <p className="text-xs text-red-500">{form.error}</p>}
        <SubmitButtons locked={form.locked} label="追加する" onCancel={onClose} />
      </form>
    </div>
  );
}

// ─── 一覧 ─────────────────────────────────────────────
export function TasksClient({ tasks, members, meId, isAdmin }: { tasks: Task[]; members: MemberLite[]; meId?: string; isAdmin: boolean }) {
  const [view, setView] = useState<"open" | "done">("open");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);
  const today = useMemo(() => todayStr(), []);

  const openTasks = tasks.filter((t) => !isTaskDone(t));
  const doneTasks = tasks.filter(isTaskDone).sort((a, b) => (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt));
  const base = view === "open" ? openTasks : doneTasks;

  const byAssignee = base.filter((t) => {
    if (assigneeFilter === "me") return t.assigneeId === meId;
    if (assigneeFilter === "none") return !t.assigneeId;
    if (assigneeFilter !== "all") return t.assigneeId === assigneeFilter;
    return true;
  });
  const filtered = categoryFilter === "all" ? byAssignee : byAssignee.filter((t) => t.category === categoryFilter);
  const overdueCount = openTasks.filter((t) => isTaskOverdue(t, today)).length;
  const unassigned = openTasks.filter((t) => !t.assigneeId).length;
  const assignedMembers = members.filter((m) => m.id !== meId && tasks.some((t) => t.assigneeId === m.id));
  const categories = [...TASK_CATEGORIES, ...Array.from(new Set(tasks.map((t) => t.category))).filter((c) => !(TASK_CATEGORIES as readonly string[]).includes(c))];

  const chip = (active: boolean) => cn(
    "px-3 py-1.5 rounded-full text-xs font-semibold border transition whitespace-nowrap",
    active ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50",
  );

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto pb-10">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ListChecks size={20} className="text-slate-600" />
            <h1 className="text-xl font-bold text-gray-900">やること</h1>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">会社のやること 残り{openTasks.length}件{overdueCount > 0 && <span className="text-red-600 font-semibold">・期限切れ{overdueCount}件</span>}</p>
        </div>
        {!showAdd && (
          <button onClick={() => setShowAdd(true)} className="flex-shrink-0 inline-flex items-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold px-3 py-2 rounded-xl transition">
            <Plus size={15} /> 追加
          </button>
        )}
      </div>

      {showAdd && <AddTaskForm members={members} onClose={() => setShowAdd(false)} />}

      <div className="flex border-b border-gray-200 mb-3">
        {([["open", `やること（${openTasks.length}）`], ["done", `完了済み（${doneTasks.length}）`]] as const).map(([v, label]) => (
          <button key={v} onClick={() => setView(v)}
            className={cn("flex-1 pb-2 text-sm font-semibold border-b-2 -mb-px transition",
              view === v ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500")}>
            {label}
          </button>
        ))}
      </div>

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
          <button className={chip(categoryFilter === "all")} onClick={() => setCategoryFilter("all")}>すべて <span className="opacity-60 tabular-nums">{byAssignee.length}</span></button>
          {categories.map((c) => {
            const n = byAssignee.filter((t) => t.category === c).length;
            if (n === 0 && categoryFilter !== c) return null;
            return <button key={c} className={chip(categoryFilter === c)} onClick={() => setCategoryFilter(c)}>{c} <span className="opacity-60 tabular-nums">{n}</span></button>;
          })}
        </div>
      </div>

      {tasks.length === 0 ? (
        <p className="text-center text-sm text-gray-500 py-16">やることがまだありません</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-gray-500 py-12">{view === "done" ? "完了したものはまだありません" : "条件に合うやることはありません"}</p>
      ) : view === "done" ? (
        <div className="space-y-2">
          {filtered.map((t) => <TaskCard key={t.id} task={t} members={members} meId={meId} isAdmin={isAdmin} today={today} />)}
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map((c) => {
            const rows = filtered.filter((t) => t.category === c);
            if (rows.length === 0) return null;
            return (
              <section key={c}>
                <h2 className="text-sm font-bold text-gray-900 mb-2">
                  {c}<span className="ml-1.5 text-xs font-normal text-gray-400">{rows.length}件</span>
                </h2>
                <div className="space-y-2">
                  {rows.map((t) => <TaskCard key={t.id} task={t} members={members} meId={meId} isAdmin={isAdmin} today={today} />)}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

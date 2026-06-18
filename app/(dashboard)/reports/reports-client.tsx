"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ClipboardList, Search, ChevronRight, ChevronDown, ArrowLeft, MapPin, User, StickyNote,
  Dumbbell, Check, CloudOff, Clock, CheckCircle2, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { Lesson } from "@/lib/lessons-types";
import type { Exercise } from "@/lib/exercise-types";
import { ExerciseEditor } from "@/components/exercise-editor";
import { ExerciseList } from "@/components/exercise-list";
import { Spinner } from "@/components/ui/spinner";
import { autosaveLessonReportAction } from "../lessons/regular/actions";

function hasReport(l: Lesson): boolean {
  return !!((l.exercises && l.exercises.length > 0) || l.customerImpression || l.note);
}
function dateTime(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function isPast(iso: string) {
  return new Date(iso).getTime() <= Date.now();
}

// ─── レポート記入（自動保存） ─────────────────────────────
function ReportEditor({ lesson, pastExerciseNames }: { lesson: Lesson; pastExerciseNames: string[] }) {
  const [exercises, setExercises] = useState<Exercise[]>(lesson.exercises ?? []);
  const [impression, setImpression] = useState(lesson.customerImpression ?? "");
  const [note, setNote] = useState(lesson.note ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const latest = useRef({ exercises, impression, note });
  latest.current = { exercises, impression, note };
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  async function save() {
    const v = latest.current;
    const fd = new FormData();
    fd.set("exercises", JSON.stringify(v.exercises));
    fd.set("customerImpression", v.impression);
    fd.set("note", v.note);
    try {
      const res = await autosaveLessonReportAction(lesson.id, fd);
      if (res.ok) { dirty.current = false; setState("saved"); }
      else { setState("error"); setErrorMsg(res.error ?? "保存に失敗しました"); }
    } catch (e) {
      setState("error"); setErrorMsg(e instanceof Error ? e.message : "保存に失敗しました");
    }
  }

  function scheduleSave() {
    dirty.current = true;
    setState("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(save, 900);
  }

  // アンマウント時：保留中の変更を保存して取りこぼしを防ぐ
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (dirty.current) save();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const labelClass = "text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5";
  const inputClass = "w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-4">
      <div>
        <label className={labelClass}><Dumbbell size={12} /> 種目（セットごとに記録）</label>
        <ExerciseEditor
          name={`exercises-${lesson.id}`}
          defaultValue={lesson.exercises}
          pastNames={pastExerciseNames}
          onChange={(next) => { setExercises(next); scheduleSave(); }}
        />
      </div>
      <div>
        <label className={labelClass}><User size={12} /> お客さんの様子</label>
        <textarea
          value={impression}
          onChange={(e) => { setImpression(e.target.value); scheduleSave(); }}
          rows={3}
          placeholder="レッスン中の様子、反応、感想など..."
          className={cn(inputClass, "resize-none")}
        />
      </div>
      <div>
        <label className={labelClass}><StickyNote size={12} /> 備考</label>
        <textarea
          value={note}
          onChange={(e) => { setNote(e.target.value); scheduleSave(); }}
          rows={2}
          placeholder="次回アクション、申し送りなど..."
          className={cn(inputClass, "resize-none")}
        />
      </div>

      <div className="flex items-center gap-1.5 text-xs h-5">
        {state === "saving" && <><Spinner size={12} /><span className="text-gray-400">保存中…</span></>}
        {state === "saved" && <><Check size={13} className="text-green-600" /><span className="text-green-600 font-medium">保存しました</span></>}
        {state === "error" && <><CloudOff size={13} className="text-red-500" /><span className="text-red-500 font-medium">{errorMsg}</span></>}
        {state === "idle" && <span className="text-gray-300">入力すると自動保存されます</span>}
      </div>
    </div>
  );
}

// ─── レッスン1件のカード（アコーディオン） ────────────────
function LessonCard({ lesson, canEdit, pastExerciseNames, defaultOpen = false }: {
  lesson: Lesson; canEdit: boolean; pastExerciseNames: string[]; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const done = hasReport(lesson);
  const past = isPast(lesson.scheduledAt);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50/80 transition text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-gray-800">{dateTime(lesson.scheduledAt)}</span>
            {lesson.course && <span className="text-xs text-gray-500">{lesson.course}</span>}
            {done
              ? <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full"><CheckCircle2 size={10} />記入済み</span>
              : <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full"><Clock size={10} />未記入</span>}
            {!past && <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-full">予定</span>}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
            {lesson.trainerMemberName && <span className="flex items-center gap-0.5"><User size={10} />{lesson.trainerMemberName}</span>}
            {lesson.location && <span className="flex items-center gap-0.5 min-w-0"><MapPin size={10} className="flex-shrink-0" /><span className="truncate">{lesson.location}</span></span>}
          </div>
        </div>
        <ChevronDown
          size={18}
          className={cn("text-gray-400 flex-shrink-0 mt-0.5 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="p-4 border-t border-gray-100">
          {canEdit ? (
            <ReportEditor lesson={lesson} pastExerciseNames={pastExerciseNames} />
          ) : done ? (
            <div className="space-y-2">
              {lesson.exercises && lesson.exercises.length > 0 && <ExerciseList exercises={lesson.exercises} />}
              {lesson.customerImpression && (
                <p className="text-xs text-gray-600 whitespace-pre-wrap"><span className="text-green-700 font-semibold">様子: </span>{lesson.customerImpression}</p>
              )}
              {lesson.note && (
                <p className="text-xs text-gray-500 whitespace-pre-wrap"><span className="font-semibold">備考: </span>{lesson.note}</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-400">まだレポートは記入されていません</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 顧客の詳細（過去レポート閲覧＋記入） ────────────────
function CustomerDetail({ name, lessons, canEditLesson, pastExerciseNames, onBack }: {
  name: string; lessons: Lesson[];
  canEditLesson: (l: Lesson) => boolean; pastExerciseNames: string[]; onBack: () => void;
}) {
  const sorted = useMemo(
    () => [...lessons].sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt)),
    [lessons]
  );

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition mb-3">
        <ArrowLeft size={15} /> 顧客一覧
      </button>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <User size={17} className="text-green-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 leading-tight">{name}</h2>
          <p className="text-xs text-gray-400">{lessons.length}件のレッスン</p>
        </div>
      </div>

      <div className="space-y-3">
        {sorted.map((l) => (
          <LessonCard key={l.id} lesson={l} canEdit={canEditLesson(l)} pastExerciseNames={pastExerciseNames} />
        ))}
      </div>
    </div>
  );
}

// ─── 顧客一覧 ─────────────────────────────────────────────
type CustomerEntry = { id: string; name: string; lessons: Lesson[] };

function CustomerList({ groups, onSelect }: { groups: CustomerEntry[]; onSelect: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const filtered = groups.filter((g) => !search || g.name.includes(search.trim()));

  return (
    <div>
      <div className="mb-4 relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="顧客名で検索..."
          className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🗂️</p>
          <p className="text-sm font-semibold text-gray-600">該当する顧客がいません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((g) => {
            const pending = g.lessons.filter((l) => isPast(l.scheduledAt) && !hasReport(l)).length;
            return (
              <button
                key={g.id}
                onClick={() => onSelect(g.id)}
                className="w-full flex items-center gap-3 bg-white rounded-2xl border border-gray-200 p-4 hover:border-green-300 hover:shadow-sm transition text-left group"
              >
                <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <User size={17} className="text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{g.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {g.lessons.length}件
                    {pending > 0 && <span className="text-amber-600 font-medium"> ・ 未記入 {pending}件</span>}
                  </p>
                </div>
                {pending > 0 && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex-shrink-0">未記入 {pending}</span>
                )}
                <ChevronRight size={16} className="text-gray-300 group-hover:text-green-500 transition flex-shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ReportsClient({ lessons, currentMemberId, isAdmin, initialCustomerId, pastExerciseNames }: {
  lessons: Lesson[];
  currentMemberId?: string;
  isAdmin: boolean;
  initialCustomerId?: string;
  pastExerciseNames: string[];
}) {
  const [selectedId, setSelectedId] = useState<string | undefined>(initialCustomerId);

  const groups = useMemo<CustomerEntry[]>(() => {
    const map = new Map<string, CustomerEntry>();
    for (const l of lessons) {
      if (!map.has(l.customerId)) map.set(l.customerId, { id: l.customerId, name: l.customerName, lessons: [] });
      map.get(l.customerId)!.lessons.push(l);
    }
    const arr = Array.from(map.values());
    arr.sort((a, b) => {
      const pa = a.lessons.filter((l) => isPast(l.scheduledAt) && !hasReport(l)).length;
      const pb = b.lessons.filter((l) => isPast(l.scheduledAt) && !hasReport(l)).length;
      if (pa !== pb) return pb - pa;
      return a.name.localeCompare(b.name, "ja");
    });
    return arr;
  }, [lessons]);

  const selected = groups.find((g) => g.id === selectedId);

  const canEditLesson = (l: Lesson) =>
    isAdmin || (!!l.trainerMemberId && !!currentMemberId && l.trainerMemberId === currentMemberId);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto pb-10">
      <div className="mb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardList size={20} className="text-green-600" />
            <h1 className="text-xl font-bold text-gray-900">レポート管理</h1>
          </div>
          <Link href="/reports/monthly"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-gray-900 hover:bg-gray-800 px-3 py-2 rounded-xl transition flex-shrink-0">
            <Sparkles size={14} /> 月次レポートを送る
          </Link>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">
          顧客ごとに過去のレポートを見ながら、当日のレポートを記入できます（自動保存）
        </p>
      </div>

      {selected ? (
        <CustomerDetail
          name={selected.name}
          lessons={selected.lessons}
          canEditLesson={canEditLesson}
          pastExerciseNames={pastExerciseNames}
          onBack={() => setSelectedId(undefined)}
        />
      ) : (
        <CustomerList groups={groups} onSelect={setSelectedId} />
      )}
    </div>
  );
}

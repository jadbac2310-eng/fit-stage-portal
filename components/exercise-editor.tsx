"use client";

import { useState } from "react";
import { Plus, Trash2, Dumbbell } from "lucide-react";
import { type Exercise } from "@/lib/exercise-types";
import { cn } from "@/lib/cn";

const emptySet = () => ({ weight: "", reps: "" });
const emptyExercise = (): Exercise => ({ name: "", sets: [emptySet()] });

/**
 * 種目ログの入力UI（最大5種目・各セットに重量/回数）。
 * 入力値は hidden input[name] に JSON 文字列として出力され、サーバーアクションで読み取る。
 * 種目名は datalist で過去の種目から選択 or 直接入力できる。
 */
export function ExerciseEditor({
  name, defaultValue, pastNames,
}: {
  name: string;
  defaultValue?: Exercise[];
  pastNames: string[];
}) {
  const [exercises, setExercises] = useState<Exercise[]>(
    defaultValue && defaultValue.length > 0 ? defaultValue : [emptyExercise()]
  );

  function update(next: Exercise[]) {
    setExercises(next);
  }
  function setName(i: number, value: string) {
    update(exercises.map((e, idx) => (idx === i ? { ...e, name: value } : e)));
  }
  function setSet(i: number, j: number, field: "weight" | "reps", value: string) {
    update(exercises.map((e, idx) =>
      idx === i ? { ...e, sets: e.sets.map((s, k) => (k === j ? { ...s, [field]: value } : s)) } : e
    ));
  }
  function addSet(i: number) {
    update(exercises.map((e, idx) => (idx === i ? { ...e, sets: [...e.sets, emptySet()] } : e)));
  }
  function removeSet(i: number, j: number) {
    update(exercises.map((e, idx) =>
      idx === i ? { ...e, sets: e.sets.length > 1 ? e.sets.filter((_, k) => k !== j) : e.sets } : e
    ));
  }
  function addExercise() {
    update([...exercises, emptyExercise()]);
  }
  function removeExercise(i: number) {
    update(exercises.length > 1 ? exercises.filter((_, idx) => idx !== i) : [emptyExercise()]);
  }

  const inputClass = "w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const listId = `exnames-${name}`;

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(exercises)} />
      <datalist id={listId}>
        {pastNames.map((n) => <option key={n} value={n} />)}
      </datalist>

      {exercises.map((ex, i) => (
        <div key={i} className="rounded-xl border border-gray-200 p-3 bg-gray-50/50 space-y-2">
          <div className="flex items-center gap-2">
            <Dumbbell size={13} className="text-green-600 flex-shrink-0" />
            <input
              list={listId}
              value={ex.name}
              onChange={(e) => setName(i, e.target.value)}
              placeholder={`種目${i + 1}（選択 or 入力）`}
              className={cn(inputClass, "flex-1")}
            />
            <button type="button" onClick={() => removeExercise(i)}
              className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition flex-shrink-0">
              <Trash2 size={13} />
            </button>
          </div>

          <div className="space-y-1.5 pl-5">
            {ex.sets.map((s, j) => (
              <div key={j} className="flex items-center gap-2">
                <span className="text-[11px] text-gray-400 w-9 flex-shrink-0">{j + 1}set</span>
                <input value={s.weight} onChange={(e) => setSet(i, j, "weight", e.target.value)}
                  placeholder="重量" className={cn(inputClass, "flex-1")} />
                <span className="text-xs text-gray-400">×</span>
                <input value={s.reps} onChange={(e) => setSet(i, j, "reps", e.target.value)}
                  placeholder="回数" className={cn(inputClass, "flex-1")} />
                <button type="button" onClick={() => removeSet(i, j)}
                  className="p-1 text-gray-300 hover:text-red-500 rounded transition flex-shrink-0">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => addSet(i)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
              <Plus size={12} /> セット追加
            </button>
          </div>
        </div>
      ))}

      <button type="button" onClick={addExercise}
        className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 font-medium">
        <Plus size={14} /> 種目を追加
      </button>
    </div>
  );
}

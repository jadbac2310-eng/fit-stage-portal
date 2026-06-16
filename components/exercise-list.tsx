import { Dumbbell } from "lucide-react";
import { type Exercise, EXERCISE_TYPE_LABEL, formatSet } from "@/lib/exercise-types";

/** レポートの種目ログを読み取り表示する（種目名・種別 + セットごとの記録） */
export function ExerciseList({ exercises, compact = false }: { exercises?: Exercise[]; compact?: boolean }) {
  if (!exercises || exercises.length === 0) return null;
  return (
    <div className={compact ? "space-y-1" : "space-y-1.5"}>
      {exercises.map((ex, i) => (
        <div key={i} className="text-xs text-gray-700">
          <span className="font-semibold flex items-center gap-1">
            <Dumbbell size={10} className="text-green-600 flex-shrink-0" />
            {ex.name}
            <span className="text-[10px] font-normal text-gray-400">{EXERCISE_TYPE_LABEL[ex.type]}</span>
          </span>
          {ex.sets.length > 0 && (
            <span className="text-gray-500 ml-4">
              {ex.sets.map((s) => formatSet(s) || "-").join(" / ")}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

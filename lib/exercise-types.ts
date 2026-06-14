// レポートの種目ログ（種目数は無制限・各セットに重量/回数）
export interface ExerciseSet {
  weight: string; // 重量（例: 20kg / 自重）。自由入力
  reps: string;   // 回数
}

export interface Exercise {
  name: string;
  sets: ExerciseSet[];
}

/** jsonb 等の不定値を安全に Exercise[] へ変換する */
export function parseExercises(raw: unknown): Exercise[] {
  if (!Array.isArray(raw)) return [];
  const out: Exercise[] = [];
  for (const e of raw) {
    if (!e || typeof e !== "object") continue;
    const name = typeof (e as { name?: unknown }).name === "string" ? (e as { name: string }).name : "";
    const setsRaw = (e as { sets?: unknown }).sets;
    const sets: ExerciseSet[] = Array.isArray(setsRaw)
      ? setsRaw
          .filter((s) => s && typeof s === "object")
          .map((s) => ({
            weight: typeof (s as { weight?: unknown }).weight === "string" ? (s as { weight: string }).weight : "",
            reps: typeof (s as { reps?: unknown }).reps === "string" ? (s as { reps: string }).reps : "",
          }))
      : [];
    out.push({ name, sets });
  }
  return out;
}

/** 入力済みの有効な種目だけ残す（種目名が空 / セットが全て空のものを除外） */
export function cleanExercises(list: Exercise[]): Exercise[] {
  return list
    .map((e) => ({
      name: e.name.trim(),
      sets: e.sets.filter((s) => s.weight.trim() !== "" || s.reps.trim() !== "")
        .map((s) => ({ weight: s.weight.trim(), reps: s.reps.trim() })),
    }))
    .filter((e) => e.name !== "");
}

/** 過去のレポートから種目名の候補（重複なし）を集める */
export function collectExerciseNames(lists: (Exercise[] | undefined)[]): string[] {
  const set = new Set<string>();
  for (const l of lists) for (const e of l ?? []) if (e.name) set.add(e.name);
  return Array.from(set).sort((a, b) => a.localeCompare(b, "ja"));
}

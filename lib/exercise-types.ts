// レポートの種目ログ。種目ごとに種別（ウェイト/自重/ストレッチ/有酸素/その他）を持ち、
// 種別に応じて記録する項目（重量・回数・時間・距離・メモ）を柔軟に切り替える。
export type ExerciseType = "weight" | "bodyweight" | "stretch" | "cardio" | "other";

export type SetFieldKey = "weight" | "reps" | "time" | "distance" | "note";

// 各セット（実施1回分）。種別により使う項目が異なるため全て任意。
export interface ExerciseSet {
  weight?: string;   // 重量（例: 40kg / 自重）
  reps?: string;     // 回数
  time?: string;     // 時間（例: 30秒 / 20分）
  distance?: string; // 距離（例: 3km）
  note?: string;     // メモ・補足（例: 左右各 / 部位 / フォーム）
}

export interface Exercise {
  name: string;
  type: ExerciseType;
  sets: ExerciseSet[];
}

export const EXERCISE_TYPES: ExerciseType[] = ["weight", "bodyweight", "stretch", "cardio", "other"];

export const EXERCISE_TYPE_LABEL: Record<ExerciseType, string> = {
  weight:     "ウェイト",
  bodyweight: "自重",
  stretch:    "ストレッチ",
  cardio:     "有酸素",
  other:      "その他",
};

// 種別ごとの入力フィールド構成（セット1行に並べる項目）
export const EXERCISE_FIELDS: Record<ExerciseType, { key: SetFieldKey; label: string; placeholder: string }[]> = {
  weight:     [{ key: "weight", label: "重量", placeholder: "重量" }, { key: "reps", label: "回数", placeholder: "回数" }],
  bodyweight: [{ key: "reps", label: "回数", placeholder: "回数" }, { key: "time", label: "時間", placeholder: "時間（任意）" }],
  stretch:    [{ key: "time", label: "時間", placeholder: "例: 30秒" }, { key: "note", label: "メモ", placeholder: "左右各 / 部位など" }],
  cardio:     [{ key: "time", label: "時間", placeholder: "例: 20分" }, { key: "distance", label: "距離", placeholder: "距離（任意）" }],
  other:      [{ key: "note", label: "内容", placeholder: "実施内容" }],
};

const SET_KEYS: SetFieldKey[] = ["weight", "reps", "time", "distance", "note"];

function asStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function normType(v: unknown): ExerciseType {
  return (EXERCISE_TYPES as string[]).includes(v as string) ? (v as ExerciseType) : "weight";
}

/** jsonb 等の不定値を安全に Exercise[] へ変換する（旧データ＝type無し/weight×reps とも互換） */
export function parseExercises(raw: unknown): Exercise[] {
  if (!Array.isArray(raw)) return [];
  const out: Exercise[] = [];
  for (const e of raw) {
    if (!e || typeof e !== "object") continue;
    const obj = e as Record<string, unknown>;
    const name = asStr(obj.name);
    const type = normType(obj.type);
    const setsRaw = obj.sets;
    const sets: ExerciseSet[] = Array.isArray(setsRaw)
      ? setsRaw
          .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
          .map((s) => {
            const set: ExerciseSet = {};
            for (const k of SET_KEYS) {
              const v = asStr(s[k]);
              if (v) set[k] = v;
            }
            return set;
          })
      : [];
    out.push({ name, type, sets });
  }
  return out;
}

/** 入力済みの有効な種目だけ残す（種目名が空 / 全項目が空のセットを除外） */
export function cleanExercises(list: Exercise[]): Exercise[] {
  return list
    .map((e) => ({
      name: e.name.trim(),
      type: e.type,
      sets: e.sets
        .map((s) => {
          const set: ExerciseSet = {};
          for (const k of SET_KEYS) {
            const v = (s[k] ?? "").trim();
            if (v) set[k] = v;
          }
          return set;
        })
        .filter((s) => Object.keys(s).length > 0),
    }))
    .filter((e) => e.name !== "");
}

/** 1セットの表示用文字列（種別に依存せず、入力済みの項目から組み立てる） */
export function formatSet(s: ExerciseSet): string {
  if (s.weight && s.reps) return `${s.weight}×${s.reps}`;
  const parts: string[] = [];
  if (s.weight)   parts.push(s.weight);
  if (s.reps)     parts.push(`${s.reps}回`);
  if (s.time)     parts.push(s.time);
  if (s.distance) parts.push(s.distance);
  if (s.note)     parts.push(s.note);
  return parts.join(" ");
}

/** 過去のレポートから種目名の候補（重複なし）を集める */
export function collectExerciseNames(lists: (Exercise[] | undefined)[]): string[] {
  const set = new Set<string>();
  for (const l of lists) for (const e of l ?? []) if (e.name) set.add(e.name);
  return Array.from(set).sort((a, b) => a.localeCompare(b, "ja"));
}

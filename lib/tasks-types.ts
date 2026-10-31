// やること（会社のタスク）の型と、DBに触らない定数・判定だけ。
// クライアントコンポーネントからも読むので、ここでは supabase を import しない。

export interface Task {
  id:           string;
  title:        string;
  category:     string;
  assigneeId?:  string;
  dueOn?:       string;    // YYYY-MM-DD
  status:       string;    // 未着手 / 進行中 / 完了
  memo?:        string;
  sortOrder:    number;
  eventId?:     string;    // スケジュールに入れた予定
  completedAt?: string;
  createdById?: string;
  createdAt:    string;
  updatedAt:    string;
}

/** ジャンル。この順に並べる */
export const TASK_CATEGORIES = ["ホテル営業", "サイト・SEO", "経理", "採用", "法人", "新店舗", "その他"] as const;

export const TASK_STATUSES = ["未着手", "進行中", "完了"] as const;

export const TASK_STATUS_CLASS: Record<string, string> = {
  "未着手": "bg-gray-100 text-gray-500",
  "進行中": "bg-sky-50 text-sky-700",
  "完了":   "bg-emerald-50 text-emerald-700",
};

export const TASK_CATEGORY_CLASS: Record<string, string> = {
  "ホテル営業": "bg-amber-50 text-amber-700",
  "サイト・SEO": "bg-violet-50 text-violet-700",
  "経理":       "bg-rose-50 text-rose-700",
  "採用":       "bg-sky-50 text-sky-700",
  "法人":       "bg-teal-50 text-teal-700",
  "新店舗":     "bg-orange-50 text-orange-700",
  "その他":     "bg-gray-100 text-gray-600",
};

export function isTaskDone(t: Task): boolean {
  return t.status === "完了";
}

/** 期限を過ぎていて、まだ終わっていない */
export function isTaskOverdue(t: Task, today: string): boolean {
  return !!t.dueOn && !isTaskDone(t) && t.dueOn < today;
}

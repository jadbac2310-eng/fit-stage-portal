// 営業先リストの型と、DBに触らない定数・判定だけ。
// クライアントコンポーネントからも読むので、ここでは supabase を import しない。

export interface SalesTarget {
  id:            string;
  kind:          string;
  priority:      string;   // 高 / 中 / 低
  sortOrder:     number;
  name:          string;
  area?:         string;
  contactPoint?: string;   // 窓口の目安
  pitch?:        string;   // 提案のポイント
  hotelInfo?:    string;   // ホテル情報メモ（種別・クラス・パーソナルの有無・料金など）
  url?:          string;   // 公式サイト
  assigneeId?:   string;
  status:        string;
  nextAction?:   string;
  nextActionOn?: string;   // YYYY-MM-DD
  contactPerson?: string;  // 先方の担当者
  contactInfo?:  string;   // 先方の連絡先
  memo?:         string;   // 引き継ぎメモ（今の状況のまとめ）
  updatedAt:     string;
}

export interface SalesTargetLog {
  id:           string;
  targetId:     string;
  kind:         string;     // 電話 / 訪問 / メモ
  occurredAt?:  string;     // ISO。電話した日時・訪問の日時
  person?:      string;     // 先方の担当者
  body:         string;
  companionIds: string[];   // 訪問の付き添い
  eventId?:     string;     // スケジュールに入れた個人予定
  createdById?: string;
  createdAt:    string;
}

export const SALES_PRIORITIES = ["高", "中", "低"] as const;

/** 営業の流れ。この順に進む */
export const SALES_STEPS = ["テレアポ", "企画書作成", "訪問"] as const;

/** 流れの外にある状況（結果・止めているもの） */
export const SALES_END_STATUSES = ["提携", "見送り", "保留"] as const;

export const SALES_STATUSES = ["未着手", ...SALES_STEPS, ...SALES_END_STATUSES] as const;

/** 流れの何段目まで進んだか（未着手=0、テレアポ=1 … 訪問=3、それ以外=-1） */
export function stepIndex(status: string): number {
  if (status === "未着手") return 0;
  const i = (SALES_STEPS as readonly string[]).indexOf(status);
  return i >= 0 ? i + 1 : -1;
}

export const END_STATUS_CLASS: Record<string, string> = {
  "提携":  "bg-emerald-50 text-emerald-700",
  "見送り": "bg-gray-100 text-gray-500",
  "保留":  "bg-gray-100 text-gray-500",
};

/** 記録の種類。schedule=true は日時を入れるとスケジュールにも入る */
export const LOG_KINDS = [
  { value: "電話", schedule: true,  hint: "電話した日時" },
  { value: "訪問", schedule: true,  hint: "訪問の日時（これからの予定もここに）" },
  { value: "メモ", schedule: false, hint: "日時（任意）" },
] as const;

export const LOG_KIND_CLASS: Record<string, string> = {
  "電話": "bg-sky-50 text-sky-700",
  "訪問": "bg-amber-50 text-amber-700",
  "メモ": "bg-gray-100 text-gray-500",
};

/** 記録の種類から、状況を自動で進める先（今より手前の段階のときだけ進める） */
export function statusAfterLog(current: string, kind: string): string | null {
  const target = kind === "訪問" ? "訪問" : kind === "電話" ? "テレアポ" : null;
  if (!target) return null;
  const ci = stepIndex(current);
  if (ci < 0) return null; // 提携・見送り・保留は手で決めたものなので触らない
  return ci < stepIndex(target) ? target : null;
}

/** 次にやることの期日を過ぎていて、まだ終わっていない */
export function isOverdue(t: SalesTarget, today: string): boolean {
  if (!t.nextActionOn) return false;
  if (t.status === "提携" || t.status === "見送り") return false;
  return t.nextActionOn < today;
}

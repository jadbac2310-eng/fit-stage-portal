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
  id:          string;
  targetId:    string;
  kind:        string;     // 電話 / アポ / 訪問 / メール / メモ
  occurredAt?: string;     // ISO。電話した日時・アポの日時など
  person?:     string;     // 先方の担当者
  body:        string;
  eventId?:    string;     // スケジュールに入れた個人予定
  createdById?: string;
  createdAt:   string;
}

export const SALES_PRIORITIES = ["高", "中", "低"] as const;

export type StatusTone = "todo" | "doing" | "won" | "off";

/** 状況の選択肢（おおよそ進む順）。tone は色分け用 */
export const SALES_STATUSES: { value: string; tone: StatusTone }[] = [
  { value: "未着手",       tone: "todo" },
  { value: "電話済",       tone: "doing" },
  { value: "アポ確定",     tone: "doing" },
  { value: "企画書準備中", tone: "doing" },
  { value: "面談済",       tone: "doing" },
  { value: "提案済",       tone: "doing" },
  { value: "トライアル中", tone: "doing" },
  { value: "提携",         tone: "won" },
  { value: "見送り",       tone: "off" },
  { value: "保留",         tone: "off" },
];

export function statusTone(status: string): StatusTone {
  return SALES_STATUSES.find((s) => s.value === status)?.tone ?? "todo";
}

export const STATUS_TONE_CLASS: Record<StatusTone, string> = {
  todo:  "bg-gray-100 text-gray-600",
  doing: "bg-blue-50 text-blue-700",
  won:   "bg-emerald-50 text-emerald-700",
  off:   "bg-gray-50 text-gray-400",
};

/** やりとりの種類。schedule=true はスケジュールにも入れる */
export const LOG_KINDS: { value: string; schedule: boolean; hint: string }[] = [
  { value: "電話", schedule: true,  hint: "電話した日時" },
  { value: "アポ", schedule: true,  hint: "アポの日時" },
  { value: "訪問", schedule: true,  hint: "訪問した日時" },
  { value: "メール", schedule: false, hint: "送った日時" },
  { value: "メモ", schedule: false, hint: "日時（任意）" },
];

export const LOG_KIND_CLASS: Record<string, string> = {
  "電話":  "bg-sky-50 text-sky-700",
  "アポ":  "bg-amber-50 text-amber-700",
  "訪問":  "bg-purple-50 text-purple-700",
  "メール": "bg-gray-100 text-gray-600",
  "メモ":  "bg-gray-100 text-gray-500",
};

/** 記録の種類から、状況を自動で進める先（今より手前の段階のときだけ進める） */
export function statusAfterLog(current: string, kind: string): string | null {
  const order = SALES_STATUSES.map((s) => s.value);
  const target = kind === "アポ" ? "アポ確定" : kind === "電話" ? "電話済" : null;
  if (!target) return null;
  const ci = order.indexOf(current);
  const ti = order.indexOf(target);
  // 提携・見送り・保留は手で決めたものなので触らない
  if (ci < 0 || statusTone(current) === "won" || statusTone(current) === "off") return null;
  return ci < ti ? target : null;
}

/** 次にやることの期日を過ぎていて、まだ終わっていない */
export function isOverdue(t: SalesTarget, today: string): boolean {
  if (!t.nextActionOn) return false;
  if (t.status === "提携" || t.status === "見送り") return false;
  return t.nextActionOn < today;
}

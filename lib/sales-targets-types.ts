// 営業先リストの型と、DBに触らない定数・判定だけ。
// クライアントコンポーネントからも読むので、ここでは supabase を import しない。

export interface SalesTarget {
  id:            string;
  kind:          string;
  priority:      string;
  sortOrder:     number;
  name:          string;
  area?:         string;
  contactPoint?: string;
  pitch?:        string;
  hasPt?:        string;
  singleSession?: string;
  english?:      string;
  researchNote?: string;
  researchUrl?:  string;
  assigneeId?:   string;
  status:        string;
  nextAction?:   string;
  nextActionOn?: string;   // YYYY-MM-DD
  contactPerson?: string;
  contactInfo?:  string;
  memo?:         string;
  updatedAt:     string;
}

export interface SalesTargetLog {
  id:          string;
  targetId:    string;
  body:        string;
  createdById?: string;
  createdAt:   string;
}

/** 並び順もこの順。上から当たる */
export const SALES_PRIORITIES = ["本命", "次点", "国内系", "京都", "後回し"] as const;

export const PRIORITY_NOTES: Record<string, string> = {
  "本命":   "梅田・中之島・本町。海外客が多く江坂から近い",
  "次点":   "心斎橋・なんば",
  "国内系": "日本人の長期滞在・シニア客向け",
  "京都":   "出張範囲。移動時間を含めた料金で",
  "後回し": "館内に専属トレーナーがいる",
};

export type StatusTone = "todo" | "doing" | "won" | "off";

/** 状況の選択肢。tone は色分け用 */
export const SALES_STATUSES: { value: string; tone: StatusTone }[] = [
  { value: "未着手",       tone: "todo" },
  { value: "アポ打診中",   tone: "doing" },
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

/** 下調べの値（あり／可 など）の色分け */
export function factToneClass(value?: string): string {
  if (!value) return "border border-gray-200 text-gray-500";
  if (/^(あり|可)$/.test(value)) return "bg-emerald-50 text-emerald-700";
  if (/^(なし|不可|記載なし|—)$/.test(value)) return "bg-gray-100 text-gray-400";
  if (/一部|予約のみ/.test(value)) return "bg-blue-50 text-blue-700";
  return "border border-gray-200 text-gray-500";
}

/** 次にやることの期日を過ぎていて、まだ終わっていない */
export function isOverdue(t: SalesTarget, today: string): boolean {
  if (!t.nextActionOn) return false;
  if (t.status === "提携" || t.status === "見送り") return false;
  return t.nextActionOn < today;
}

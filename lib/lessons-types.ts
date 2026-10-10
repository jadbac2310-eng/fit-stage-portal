import type { Exercise } from "./exercise-types";

export type LessonPaymentType = "monthly" | "session_pass" | "single";
export type LessonStatus = "scheduled" | "completed" | "cancelled" | "cancelled_same_day";

/** 実施形態。どこでレッスンを行ったか（支払い方法とは別の軸） */
export type DeliveryMode = "store" | "onsite" | "online";

export const DELIVERY_MODE_LABEL: Record<DeliveryMode, string> = {
  store:  "店舗",
  onsite: "出張",
  online: "オンライン",
};

export const DELIVERY_MODE_OPTIONS: { value: DeliveryMode; label: string }[] = [
  { value: "store",  label: "店舗" },
  { value: "onsite", label: "出張" },
  { value: "online", label: "オンライン" },
];

/** 不明な値が入っていても落ちないように、既定（店舗）へ寄せる */
export function toDeliveryMode(value?: string | null): DeliveryMode {
  return value === "onsite" || value === "online" ? value : "store";
}

export interface Lesson {
  id: string;
  customerId: string;
  customerName: string;
  trainerMemberId?: string;
  trainerMemberName?: string;
  scheduledAt: string;
  endAt?: string;
  location?: string;
  course?: string;
  paymentType?: LessonPaymentType;
  status: LessonStatus;
  deliveryMode: DeliveryMode;  // 実施形態（店舗／出張／オンライン）
  sessionPassId?: string;
  amount?: number;          // 都度払いの金額（円）。未設定はコース単価を使用
  trainingContent?: string;    // 旧レポート自由記述（互換用・現在は未使用）
  exercises?: Exercise[];      // レポート: 種目ログ（種目名・重量・回数）
  customerImpression?: string; // レポート: お客さんの様子
  note?: string;
  rentalGymId?: string;        // 利用レンタルジム（rental_gyms.id）
  rentalGymFee?: number;       // この回のレンタルジム代（マスタ値がデフォルト・変更可）
  storeId?: string;            // 利用店舗（stores.id）。レンタルジムとは別概念で利用料は無い
  fctStoreId?: string;         // 利用FCT店舗（fct_stores.id）
  fctStoreFee?: number;        // この回のFCT店舗利用料（マスタ値がデフォルト・変更可）
  createdById?: string;        // レッスンを追加したメンバー
  createdByName?: string;
  updatedById?: string;        // 最後に編集したメンバー
  createdAt: string;
  updatedAt: string;
}

export const LESSON_STATUS_LABEL: Record<LessonStatus, string> = {
  scheduled: "予定",
  completed: "完了",
  cancelled: "キャンセル",
  cancelled_same_day: "当日キャンセル",
};

/** 売上・歩合の計算対象に含めるステータスか（当日キャンセルは実施扱いで売上・歩合が発生する） */
export function isBillableLessonStatus(status: LessonStatus): boolean {
  return status === "completed" || status === "cancelled_same_day";
}

export const COURSE_OPTIONS: { value: string; label: string; paymentType: LessonPaymentType }[] = [
  { value: "回数券", label: "回数券", paymentType: "session_pass" },
  { value: "月2回",  label: "月2回",  paymentType: "monthly"      },
  { value: "月4回",  label: "月4回",  paymentType: "monthly"      },
  { value: "月8回",  label: "月8回",  paymentType: "monthly"      },
  { value: "都度",   label: "都度",   paymentType: "single"       },
  { value: "オンラインパーソナル", label: "オンラインパーソナル", paymentType: "single" },
];

export function courseToPaymentType(course: string | undefined): LessonPaymentType | null {
  return COURSE_OPTIONS.find((o) => o.value === course)?.paymentType ?? null;
}

/**
 * 単発（都度・オンライン等）レッスン1回の計上額を決める。
 * レッスン個別金額 → 顧客の都度単価 の順に見て、どちらも未設定なら null
 * （呼び出し側でプランマスタの既定単価などにフォールバックする）。
 *
 * 0円は「未設定」ではなく「0円と決めた」として扱う。金額の判定に真偽値
 * （`amount &&` や `amount > 0`）を使うと0円が未設定と同じ扱いになり、
 * 顧客の単価が勝手に使われてしまうので必ずこの関数を通すこと。
 */
export function resolveSingleLessonAmount(
  lessonAmount: number | null | undefined,
  customerSinglePrice: number | null | undefined,
): number | null {
  if (lessonAmount != null) return lessonAmount;
  if (customerSinglePrice != null) return customerSinglePrice;
  return null;
}

// ─── 会場の種類（入力画面用） ──────────────────────────
// 店舗・レンタルジム・FCT店舗は同じ回に2つ使うことがない。
// 全部を1つのプルダウンに並べると数十件になって選びにくいので、
// まず種類を選び、その種類のぶんだけ出す。
export type VenueKind = "none" | "store" | "gym" | "fct";

export function venueKindOf(
  v?: { storeId?: string; rentalGymId?: string; fctStoreId?: string } | null,
): VenueKind {
  if (v?.rentalGymId) return "gym";
  if (v?.fctStoreId)  return "fct";
  if (v?.storeId)     return "store";
  return "none";
}

/** マスタが1件も無い種類はボタンを出さない */
export function venueKindOptions(
  storeCount: number, gymCount: number, fctCount: number,
): { value: VenueKind; label: string }[] {
  return ([
    { value: "none"  as const, label: "なし",         show: true },
    { value: "store" as const, label: "店舗",         show: storeCount > 0 },
    { value: "gym"   as const, label: "レンタルジム", show: gymCount   > 0 },
    { value: "fct"   as const, label: "FCT店舗",      show: fctCount   > 0 },
  ]).filter((o) => o.show).map(({ value, label }) => ({ value, label }));
}

export interface VenueRef { kind: VenueKind; id: string; name: string }

/** 会場のid（種類ごとに別のマスタなので、種類とセットで1つの鍵にする） */
export function venueKey(kind: VenueKind, id: string): string {
  return `${kind}:${id}`;
}

export function venueIdOf(
  v: { storeId?: string; rentalGymId?: string; fctStoreId?: string }, kind: VenueKind,
): string {
  return kind === "gym" ? v.rentalGymId! : kind === "fct" ? v.fctStoreId! : v.storeId!;
}

/**
 * その顧客が前に使った会場を、直近に使った順で返す。
 *
 * 会場は顧客ごとにだいたい決まっているので、これをタップできるようにしておけば
 * 種類を選んで一覧から探す手間がいらない。
 * マスタから消えた会場は名前が引けないので出さない。
 */
export function recentVenues(
  lessons: {
    customerId: string; scheduledAt: string;
    storeId?: string; rentalGymId?: string; fctStoreId?: string;
  }[],
  customerId: string,
  masters: {
    stores:     { id: string; name: string }[];
    rentalGyms: { id: string; name: string }[];
    fctStores:  { id: string; name: string }[];
  },
  limit = 4,
): VenueRef[] {
  if (!customerId) return [];
  const found = new Map<string, VenueRef>();
  const mine = lessons
    .filter((l) => l.customerId === customerId)
    .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
  for (const l of mine) {
    const kind = venueKindOf(l);
    if (kind === "none") continue;
    const id = venueIdOf(l, kind);
    const key = venueKey(kind, id);
    if (found.has(key)) continue;
    const list = kind === "gym" ? masters.rentalGyms : kind === "fct" ? masters.fctStores : masters.stores;
    const name = list.find((m) => m.id === id)?.name;
    if (!name) continue;
    found.set(key, { kind, id, name });
    if (found.size >= limit) break;
  }
  return Array.from(found.values());
}

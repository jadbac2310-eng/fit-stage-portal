import { cache } from "react";
import { createAdminClient, fetchAllRows } from "./supabase";
export type { LessonPaymentType, LessonStatus, Lesson } from "./lessons-types";
export { LESSON_STATUS_LABEL, COURSE_OPTIONS, courseToPaymentType } from "./lessons-types";
import type { LessonPaymentType, LessonStatus, Lesson, DeliveryMode } from "./lessons-types";
import { toDeliveryMode } from "./lessons-types";
import { parseExercises, type Exercise } from "./exercise-types";
import { currentMemberId } from "./audit";

type DbRow = {
  id: string;
  customer_id: string;
  trainer_member_id: string | null;
  scheduled_at: string;
  end_at: string | null;
  location: string | null;
  course: string | null;
  payment_type: LessonPaymentType | null;
  status: LessonStatus;
  delivery_mode?: string | null;
  session_pass_id: string | null;
  amount: number | null;
  training_content: string | null;
  customer_impression: string | null;
  exercises: unknown;
  note: string | null;
  rental_gym_id: string | null;
  rental_gym_fee: number | null;
  fct_store_id: string | null;
  fct_store_fee: number | null;
  avenir_store_id?: string | null;
  avenir_store_fee?: number | null;
  store_fee?: number | null;
  store_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  customers: { full_name: string } | null;
  trainer_member: { name: string } | null;
  created_by_member: { name: string } | null;
};

function fromDb(row: DbRow): Lesson {
  return {
    id:                row.id,
    customerId:        row.customer_id,
    customerName:      row.customers?.full_name ?? "",
    trainerMemberId:   row.trainer_member_id ?? undefined,
    trainerMemberName: row.trainer_member?.name ?? undefined,
    scheduledAt:       row.scheduled_at,
    endAt:             row.end_at ?? undefined,
    location:          row.location ?? undefined,
    course:            row.course ?? undefined,
    paymentType:       row.payment_type ?? undefined,
    status:            row.status,
    deliveryMode:      toDeliveryMode(row.delivery_mode),
    sessionPassId:     row.session_pass_id ?? undefined,
    amount:            row.amount ?? undefined,
    trainingContent:   row.training_content ?? undefined,
    customerImpression: row.customer_impression ?? undefined,
    exercises:         parseExercises(row.exercises),
    note:              row.note ?? undefined,
    rentalGymId:       row.rental_gym_id ?? undefined,
    rentalGymFee:      row.rental_gym_fee ?? undefined,
    fctStoreId:        row.fct_store_id ?? undefined,
    fctStoreFee:       row.fct_store_fee ?? undefined,
    avenirStoreId:     row.avenir_store_id ?? undefined,
    avenirStoreFee:    row.avenir_store_fee ?? undefined,
    storeId:           row.store_id ?? undefined,
    storeFee:          row.store_fee ?? undefined,
    createdById:       row.created_by ?? undefined,
    createdByName:     row.created_by_member?.name ?? undefined,
    updatedById:       row.updated_by ?? undefined,
    createdAt:         row.created_at,
    updatedAt:         row.updated_at,
  };
}

// JOIN 段階を順に落としていく SELECT のカスケード。
// members/customers への JOIN 関連がスキーマキャッシュで解決できない(PGRST200)本番でも、
// 最終的に JOIN 無し("*")まで退避して「絶対に描画は落とさない」ことを保証する（名前は空になる）。
const SELECTS = [
  "*, customers(full_name), trainer_member:members!trainer_member_id(name), created_by_member:members!created_by(name)",
  "*, customers(full_name), trainer_member:members!trainer_member_id(name)",
  "*, customers(full_name)",
  "*",
];

// JOIN 関連/列欠落に由来するエラーか（次段の SELECT へ退避してよいか）の判定。
// 関連エラー(PGRST200)等はメッセージに列名が出ないことがあるためコードでも判定する。
// ※ 書き込み(addLesson/updateLesson)は JOIN を含めないため、この判定で列を落とすことはない。
function isMissingOptionalColumn(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return /created_by|updated_by|rental_gym|store|amount|end_at|delivery_mode/i.test(err.message ?? "")
    || err.code === "PGRST200" || err.code === "42703" || err.code === "PGRST204";
}

async function getLessonsUncached(): Promise<Lesson[]> {
  const client = createAdminClient();
  for (let i = 0; i < SELECTS.length; i++) {
    // 1000行ずつ全件読む。id を並び順の最後に足して、ページの境目で行がぶれないようにする
    const { data, error } = await fetchAllRows((from, to) =>
      client.from("lessons").select(SELECTS[i])
        .order("scheduled_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to),
    );
    if (!error) return (data as unknown as DbRow[]).map(fromDb);
    // JOIN/列に由来しないエラーで、まだ後段が残っていないなら投げる
    if (!isMissingOptionalColumn(error) || i === SELECTS.length - 1) throw error;
  }
  return [];
}

/**
 * そのお客さまの、指定日時より前のレッスン（新しい順）。
 *
 * 引き継ぎのため。同じお客さまを複数のトレーナーで見るとき、
 * 次に入る人が「前回なにをしたか」を読めるようにする。
 * 担当が誰かは問わない（他のトレーナーのぶんも読めないと引き継ぎにならない）。
 */
export async function getCustomerLessonHistory(
  customerId: string,
  beforeIso: string,
  limit = 3,
): Promise<Lesson[]> {
  if (!customerId) return [];
  const client = createAdminClient();
  for (let i = 0; i < SELECTS.length; i++) {
    const { data, error } = await client.from("lessons").select(SELECTS[i])
      .eq("customer_id", customerId)
      .lt("scheduled_at", beforeIso)
      .order("scheduled_at", { ascending: false })
      .limit(limit);
    if (!error) return (data as unknown as DbRow[]).map(fromDb);
    if (!isMissingOptionalColumn(error) || i === SELECTS.length - 1) return [];
  }
  return [];
}

export async function getLesson(id: string): Promise<Lesson | null> {
  const client = createAdminClient();
  for (let i = 0; i < SELECTS.length; i++) {
    const { data, error } = await client.from("lessons").select(SELECTS[i]).eq("id", id).single();
    if (!error && data) return fromDb(data as unknown as DbRow);
    if (error && (!isMissingOptionalColumn(error) || i === SELECTS.length - 1)) return null;
    if (!error) return null; // data が無い（該当なし）
  }
  return null;
}

export async function addLesson(input: {
  customerId: string;
  trainerMemberId?: string;
  scheduledAt: string;
  endAt?: string | null;
  location?: string;
  course?: string;
  paymentType?: LessonPaymentType;
  sessionPassId?: string;
  amount?: number | null;
  note?: string;
  createdBy?: string;
  rentalGymId?: string | null;
  rentalGymFee?: number | null;
  fctStoreId?: string | null;
  fctStoreFee?: number | null;
  avenirStoreId?: string | null;
  avenirStoreFee?: number | null;
  storeFee?: number | null;
  storeId?: string | null;
  deliveryMode?: DeliveryMode;
}): Promise<Lesson> {
  const client = createAdminClient();
  const row = {
    customer_id:       input.customerId,
    trainer_member_id: input.trainerMemberId ?? null,
    scheduled_at:      input.scheduledAt,
    end_at:            input.endAt ?? null,
    location:          input.location ?? null,
    course:            input.course ?? null,
    payment_type:      input.paymentType ?? null,
    session_pass_id:   input.sessionPassId ?? null,
    amount:            input.amount ?? null,
    note:              input.note ?? null,
    created_by:        input.createdBy ?? null,
    rental_gym_id:     input.rentalGymId ?? null,
    rental_gym_fee:    input.rentalGymFee ?? null,
    store_id:          input.storeId ?? null,
  };
  // あとから足した列（FCT店舗 20260922000001・実施形態 20261010000001・アヴニール店舗 20261011000002）。
  // 未適用の環境では列ごと落として再試行する。
  // 列が無いだけでレッスンの登録自体が失敗すると、業務が止まってしまうため。
  const fctRow = {
    fct_store_id:      input.fctStoreId ?? null,
    fct_store_fee:     input.fctStoreFee ?? null,
    avenir_store_id:   input.avenirStoreId ?? null,
    avenir_store_fee:  input.avenirStoreFee ?? null,
    store_fee:         input.storeFee ?? null,
    delivery_mode:     input.deliveryMode ?? "store",
  };
  // 書き込みは JOIN を含めず id だけ返す（members への関連取得が壊れても end_at 等を落とさないため）。
  // 表示用のJOIN済みデータは getLesson で別途取得する。
  let { data, error } = await client.from("lessons").insert({ ...row, ...fctRow }).select("id").single();
  if (error && isMissingOptionalColumn(error)) {
    ({ data, error } = await client.from("lessons").insert(row).select("id").single());
  }
  if (error) throw error;
  const created = await getLesson((data as { id: string }).id);
  if (!created) throw new Error("作成したレッスンの取得に失敗しました");
  return created;
}

export async function updateLesson(
  id: string,
  input: Partial<{
    customerId: string;
    trainerMemberId: string | null;
    scheduledAt: string;
    endAt: string | null;
    location: string | null;
    course: string | null;
    paymentType: LessonPaymentType | null;
    status: LessonStatus;
    sessionPassId: string | null;
    amount: number | null;
    trainingContent: string | null;
    customerImpression: string | null;
    exercises: Exercise[];
    note: string | null;
    rentalGymId: string | null;
    rentalGymFee: number | null;
    fctStoreId: string | null;
    fctStoreFee: number | null;
    avenirStoreId: string | null;
    avenirStoreFee: number | null;
    storeFee: number | null;
    storeId: string | null;
    deliveryMode: DeliveryMode;
  }>
): Promise<Lesson | null> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.customerId         !== undefined) patch.customer_id          = input.customerId;
  if (input.trainerMemberId    !== undefined) patch.trainer_member_id    = input.trainerMemberId;
  if (input.scheduledAt        !== undefined) patch.scheduled_at         = input.scheduledAt;
  if (input.endAt              !== undefined) patch.end_at               = input.endAt;
  if (input.location           !== undefined) patch.location             = input.location;
  if (input.course             !== undefined) patch.course               = input.course;
  if (input.paymentType        !== undefined) patch.payment_type         = input.paymentType;
  if (input.status             !== undefined) patch.status               = input.status;
  if (input.sessionPassId      !== undefined) patch.session_pass_id      = input.sessionPassId;
  if (input.amount             !== undefined) patch.amount               = input.amount;
  if (input.trainingContent    !== undefined) patch.training_content     = input.trainingContent;
  if (input.customerImpression !== undefined) patch.customer_impression  = input.customerImpression;
  if (input.exercises          !== undefined) patch.exercises            = input.exercises;
  if (input.note               !== undefined) patch.note                 = input.note;
  if (input.rentalGymId        !== undefined) patch.rental_gym_id        = input.rentalGymId;
  if (input.rentalGymFee       !== undefined) patch.rental_gym_fee       = input.rentalGymFee;
  if (input.storeId            !== undefined) patch.store_id             = input.storeId;
  patch.updated_by = (await currentMemberId()) ?? null;

  // FCT店舗の列（マイグレーション 20260922000001）。未適用の環境では列ごと落として再試行する。
  const fctKeys: string[] = [];
  if (input.fctStoreId  !== undefined) { patch.fct_store_id  = input.fctStoreId;  fctKeys.push("fct_store_id"); }
  if (input.fctStoreFee !== undefined) { patch.fct_store_fee = input.fctStoreFee; fctKeys.push("fct_store_fee"); }
  if (input.avenirStoreId  !== undefined) { patch.avenir_store_id  = input.avenirStoreId;  fctKeys.push("avenir_store_id"); }
  if (input.avenirStoreFee !== undefined) { patch.avenir_store_fee = input.avenirStoreFee; fctKeys.push("avenir_store_fee"); }
  if (input.storeFee       !== undefined) { patch.store_fee        = input.storeFee;        fctKeys.push("store_fee"); }
  if (input.deliveryMode !== undefined) { patch.delivery_mode = input.deliveryMode; fctKeys.push("delivery_mode"); }

  const client = createAdminClient();
  // 書き込みは JOIN を含めず実行する（members への関連取得が壊れても end_at 等の列を落とさないため）。
  // 以前はここで JOIN 付き select に失敗すると end_at/amount 等を patch から外して再試行しており、
  // 終了時刻が無言で保存されない不具合の原因になっていた。表示用の再取得は getLesson に委ねる。
  let { error } = await client.from("lessons").update(patch).eq("id", id);
  if (error && fctKeys.length > 0 && isMissingOptionalColumn(error)) {
    const rest = { ...patch };
    for (const k of fctKeys) delete rest[k];
    ({ error } = await client.from("lessons").update(rest).eq("id", id));
  }
  if (error) throw error;
  return getLesson(id);
}

export async function deleteLesson(id: string): Promise<void> {
  const { error } = await createAdminClient()
    .from("lessons")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

/**
 * 同じリクエストの中では1回だけ読む（React の cache）。
 *
 * 1ページ表示するのに、レイアウト・ページ・サーバーアクションが
 * それぞれ同じ表を取りに行っていた。中身は同じなので、最初の1回を使い回す。
 * 次のリクエストでは必ず読み直すので、画面が古くなることはない。
 */
export const getLessons = cache(getLessonsUncached);

import { cache } from "react";
import { createAdminClient, fetchAllRows } from "./supabase";
import type { CustomerPlan } from "./customers-types";
export type { TrialLessonStatus, TrialLesson } from "./trial-lessons-types";
export { STATUS_LABEL, CONTRACT_LABEL } from "./trial-lessons-types";
import type { TrialLessonStatus, TrialLesson } from "./trial-lessons-types";
import { toDeliveryMode, type DeliveryMode } from "./lessons-types";
import { parseExercises, type Exercise } from "./exercise-types";
import { currentMemberId, isMissingAuthorColumn } from "./audit";

type DbRow = {
  id: string;
  customer_id: string;
  sales_member_id: string | null;
  trainer_member_id: string | null;
  scheduled_at: string;
  location: string | null;
  rental_gym_id: string | null;
  rental_gym_fee: number | null;
  store_id: string | null;
  fct_store_id: string | null;
  fct_store_fee: number | null;
  avenir_store_id?: string | null;
  avenir_store_fee?: number | null;
  store_fee?: number | null;
  course: string | null;
  amount: number | null;
  status: TrialLessonStatus;
  delivery_mode?: string | null;
  contracted: boolean | null;
  contract_plan: CustomerPlan | null;
  training_content: string | null;
  customer_impression: string | null;
  exercises: unknown;
  note: string | null;
  handover_note?: string | null;
  pair_customer_id?: string | null;
  pair_handover_note?: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  customers: { full_name: string } | null;
  sales_member: { name: string } | null;
  trainer_member: { name: string } | null;
};

function fromDb(row: DbRow): TrialLesson {
  return {
    id:                  row.id,
    customerId:          row.customer_id,
    customerName:        row.customers?.full_name ?? "",
    salesMemberId:       row.sales_member_id ?? undefined,
    salesMemberName:     row.sales_member?.name ?? "",
    trainerMemberId:     row.trainer_member_id ?? undefined,
    trainerMemberName:   row.trainer_member?.name ?? undefined,
    scheduledAt:         row.scheduled_at,
    location:            row.location ?? undefined,
    rentalGymId:         row.rental_gym_id ?? undefined,
    rentalGymFee:        row.rental_gym_fee ?? undefined,
    storeId:             row.store_id ?? undefined,
    fctStoreId:          row.fct_store_id ?? undefined,
    fctStoreFee:         row.fct_store_fee ?? undefined,
    storeFee:            row.store_fee ?? undefined,
    avenirStoreId:       row.avenir_store_id ?? undefined,
    avenirStoreFee:      row.avenir_store_fee ?? undefined,
    course:              row.course ?? undefined,
    amount:              row.amount ?? undefined,
    status:              row.status,
    deliveryMode:        toDeliveryMode(row.delivery_mode),
    contracted:          row.contracted,
    contractPlan:        row.contract_plan ?? undefined,
    trainingContent:     row.training_content ?? undefined,
    customerImpression:  row.customer_impression ?? undefined,
    exercises:           parseExercises(row.exercises),
    note:                row.note ?? undefined,
    handoverNote:        row.handover_note ?? undefined,
    pairCustomerId:      row.pair_customer_id ?? undefined,
    pairHandoverNote:    row.pair_handover_note ?? undefined,
    createdById:         row.created_by ?? undefined,
    updatedById:         row.updated_by ?? undefined,
    createdAt:           row.created_at,
    updatedAt:           row.updated_at,
  };
}

const JOINS = "customers(full_name), sales_member:members!sales_member_id(name), trainer_member:members!trainer_member_id(name)";
const SELECT = `*, ${JOINS}`;
// members への JOIN 関連がスキーマキャッシュで解決できない(PGRST200)場合の退避（担当者名は空になるが描画は継続）
const SELECT_LEGACY = "*, customers(full_name)";

/**
 * 一覧で読む列。
 *
 * レポート系（exercises＝種目ログ・training_content・customer_impression）は外してある。
 * 1件に何種目も入るJSONで、全件ぶん運ぶと重いわりに、どの画面でも読んでいない。
 * 1件取得（getTrialLesson）は今までどおり全部の列を読む。
 */
const LIST_COLUMNS =
  "id, customer_id, sales_member_id, trainer_member_id, scheduled_at, location, rental_gym_id, rental_gym_fee,"
  + " store_id, store_fee, fct_store_id, fct_store_fee, avenir_store_id, avenir_store_fee, course, amount,"
  + " status, delivery_mode, contracted, contract_plan, note, created_by, updated_by, created_at, updated_at";

// 列を名指しした段を前に、"*" の段をうしろに置く。
// 名指しした列が未作成の環境では前半が落ちるので、そのときは "*" の段が拾う。
const LIST_SELECTS = [
  `${LIST_COLUMNS}, handover_note, pair_customer_id, pair_handover_note, ${JOINS}`,   // 2名の体験の2人目（20261123000001）。未適用なら次の段へ
  `${LIST_COLUMNS}, handover_note, ${JOINS}`,   // 引き継ぎ（20261115000001）。未適用なら次の段へ
  `${LIST_COLUMNS}, ${JOINS}`,
  `${LIST_COLUMNS}, customers(full_name)`,
  LIST_COLUMNS,
  SELECT,
  SELECT_LEGACY,
];

/** fromDate（YYYY-MM-DD）を渡すと、その日以降のぶんだけ読む */
async function getTrialLessonsUncached(fromDate?: string): Promise<TrialLesson[]> {
  const client = createAdminClient();
  // 1000行ずつ全件読む。id を並び順の最後に足して、ページの境目で行がぶれないようにする
  // 日本時間のその日の0時から。UTCで切ると前日の夜ぶんが落ちる
  const since = fromDate ? `${fromDate}T00:00:00+09:00` : null;
  const read = (select: string) => fetchAllRows((from, to) => {
    let q = client.from("trial_lessons").select(select);
    if (since) q = q.gte("scheduled_at", since);
    return q
      .order("scheduled_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, to);
  });
  type ReadResult = { data: unknown[] | null; error: { code?: string; message?: string } | null };
  let data: ReadResult["data"] = null;
  let error: ReadResult["error"] = null;
  for (const select of LIST_SELECTS) {
    ({ data, error } = await read(select) as ReadResult);
    if (!error) break;
    if (!isMissingAuthorColumn(error)) break;
  }
  if (error) {
    if (error.code === "42P01" || /does not exist|could not find the table/i.test(error.message ?? "")) return [];
    throw error;
  }
  return (data as unknown as DbRow[]).map(fromDb);
}

/**
 * そのお客さまの最初の体験レッスン。
 *
 * カウンセリング申込フォームの「目的・お悩み」などがこの備考に入るので、
 * 引き継ぎのときに「そもそも何に困って来た人か」を読むのに使う。
 */
export async function getFirstTrialLesson(customerId: string): Promise<TrialLesson | null> {
  if (!customerId) return null;
  const client = createAdminClient();
  const read = (select: string, col: "customer_id" | "pair_customer_id") =>
    client.from("trial_lessons").select(select)
      .eq(col, customerId)
      .order("scheduled_at", { ascending: true })
      .limit(1);
  let { data, error } = await read(SELECT, "customer_id");
  if (error && isMissingAuthorColumn(error)) ({ data, error } = await read(SELECT_LEGACY, "customer_id"));
  const own = !error && data && data.length > 0 ? fromDb(data[0] as unknown as DbRow) : null;
  // 2名で受けた体験の2人目として受けていないか（2026-11-23〜。列が無ければ探さない）。
  // 2人目として見つかったら、引き継ぎ（handoverNote）を2人目の分に差し替えて返す
  const pr = await read(SELECT, "pair_customer_id");
  const asPair = !pr.error && pr.data && pr.data.length > 0 ? fromDb(pr.data[0] as unknown as DbRow) : null;
  if (asPair && (!own || asPair.scheduledAt < own.scheduledAt)) return { ...asPair, handoverNote: asPair.pairHandoverNote };
  return own;
}

export async function getTrialLesson(id: string): Promise<TrialLesson | null> {
  const client = createAdminClient();
  let { data, error } = await client.from("trial_lessons").select(SELECT).eq("id", id).single();
  if (error && isMissingAuthorColumn(error)) {
    ({ data, error } = await client.from("trial_lessons").select(SELECT_LEGACY).eq("id", id).single());
  }
  if (error || !data) return null;
  return fromDb(data as DbRow);
}

export async function addTrialLesson(input: {
  customerId: string;
  salesMemberId?: string;
  trainerMemberId?: string;
  scheduledAt: string;
  location?: string;
  rentalGymId?: string | null;
  rentalGymFee?: number | null;
  storeId?: string | null;
  fctStoreId?: string | null;
  avenirStoreId?: string | null;
  deliveryMode?: DeliveryMode;
  fctStoreFee?: number | null;
  avenirStoreFee?: number | null;
  storeFee?: number | null;
  course?: string | null;
  amount?: number | null;
  note?: string;
  pairCustomerId?: string | null;
}): Promise<TrialLesson> {
  const client = createAdminClient();
  const base = {
    customer_id:       input.customerId,
    sales_member_id:   input.salesMemberId ?? null,
    trainer_member_id: input.trainerMemberId ?? null,
    scheduled_at:      input.scheduledAt,
    location:          input.location ?? null,
    status:            "scheduled" as const,
    contracted:        null,
    note:              input.note ?? null,
  };
  // 場所・料金区分の列（マイグレーション 20260920000002）。未適用の環境では落として再試行する。
  const extra = {
    rental_gym_id:  input.rentalGymId ?? null,
    rental_gym_fee: input.rentalGymFee ?? null,
    store_id:       input.storeId ?? null,
    fct_store_id:   input.fctStoreId ?? null,
    avenir_store_id:  input.avenirStoreId ?? null,
    delivery_mode:  input.deliveryMode ?? "store",
    fct_store_fee:  input.fctStoreFee ?? null,
    avenir_store_fee: input.avenirStoreFee ?? null,
    store_fee:        input.storeFee ?? null,
    course:         input.course ?? null,
    amount:         input.amount ?? null,
  };
  const creator = (await currentMemberId()) ?? null;
  // 2人目（20261123000001）。列が無い環境では付けずに作る（2人目は入らない）
  if (input.pairCustomerId) {
    const r = await client.from("trial_lessons").insert({ ...base, ...extra, pair_customer_id: input.pairCustomerId, created_by: creator, updated_by: creator }).select(SELECT).single();
    if (!r.error) return fromDb(r.data as DbRow);
    if (!isMissingAuthorColumn(r.error)) throw r.error;
  }
  let { data, error } = await client.from("trial_lessons").insert({ ...base, ...extra, created_by: creator, updated_by: creator }).select(SELECT).single();
  if (error && isMissingAuthorColumn(error)) {
    ({ data, error } = await client.from("trial_lessons").insert({ ...base, ...extra }).select(SELECT).single());
  }
  if (error && isMissingAuthorColumn(error)) {
    ({ data, error } = await client.from("trial_lessons").insert(base).select(SELECT).single());
  }
  if (error) throw error;
  return fromDb(data as DbRow);
}

export async function updateTrialLesson(
  id: string,
  input: Partial<{
    customerId: string;
    salesMemberId: string;
    trainerMemberId: string | null;
    scheduledAt: string;
    location: string | null;
    rentalGymId: string | null;
    rentalGymFee: number | null;
    storeId: string | null;
    fctStoreId: string | null;
    avenirStoreId: string | null;
    deliveryMode: DeliveryMode;
    fctStoreFee: number | null;
    avenirStoreFee: number | null;
    storeFee: number | null;
    course: string | null;
    amount: number | null;
    status: TrialLessonStatus;
    contracted: boolean | null;
    contractPlan: CustomerPlan | null;
    trainingContent: string | null;
    customerImpression: string | null;
    exercises: Exercise[];
    note: string | null;
    pairCustomerId: string | null;
  }>
): Promise<TrialLesson | null> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.customerId          !== undefined) patch.customer_id          = input.customerId;
  if (input.salesMemberId       !== undefined) patch.sales_member_id      = input.salesMemberId;
  if (input.trainerMemberId     !== undefined) patch.trainer_member_id    = input.trainerMemberId;
  if (input.scheduledAt         !== undefined) patch.scheduled_at         = input.scheduledAt;
  if (input.location            !== undefined) patch.location             = input.location;
  if (input.status              !== undefined) patch.status               = input.status;
  // 場所・料金区分の列（マイグレーション 20260920000002）。未適用の環境では落として再試行する。
  const extraKeys: string[] = [];
  const setExtra = (key: string, value: unknown) => { patch[key] = value; extraKeys.push(key); };
  if (input.rentalGymId         !== undefined) setExtra("rental_gym_id",  input.rentalGymId);
  if (input.rentalGymFee        !== undefined) setExtra("rental_gym_fee", input.rentalGymFee);
  if (input.storeId             !== undefined) setExtra("store_id",       input.storeId);
  if (input.fctStoreId          !== undefined) setExtra("fct_store_id",   input.fctStoreId);
  if (input.fctStoreFee         !== undefined) setExtra("fct_store_fee",  input.fctStoreFee);
  if (input.avenirStoreId       !== undefined) setExtra("avenir_store_id",  input.avenirStoreId);
  if (input.avenirStoreFee      !== undefined) setExtra("avenir_store_fee", input.avenirStoreFee);
  if (input.storeFee            !== undefined) setExtra("store_fee",        input.storeFee);
  if (input.deliveryMode        !== undefined) setExtra("delivery_mode",  input.deliveryMode);
  if (input.course              !== undefined) setExtra("course",         input.course);
  if (input.amount              !== undefined) setExtra("amount",         input.amount);
  if (input.pairCustomerId      !== undefined) setExtra("pair_customer_id", input.pairCustomerId);
  if (input.contracted          !== undefined) patch.contracted           = input.contracted;
  if (input.contractPlan        !== undefined) patch.contract_plan        = input.contractPlan;
  if (input.trainingContent     !== undefined) patch.training_content     = input.trainingContent;
  if (input.exercises           !== undefined) patch.exercises            = input.exercises;
  if (input.customerImpression  !== undefined) patch.customer_impression  = input.customerImpression;
  if (input.note                !== undefined) patch.note                 = input.note;
  patch.updated_by = (await currentMemberId()) ?? null;

  const client = createAdminClient();
  let { data, error } = await client.from("trial_lessons").update(patch).eq("id", id).select(SELECT).single();
  // 2人目の列（20261123000001）が無い環境では、それだけ外して保存し直す（ほかの変更は残す）
  if (error && isMissingAuthorColumn(error) && "pair_customer_id" in patch) {
    delete patch.pair_customer_id;
    extraKeys.splice(extraKeys.indexOf("pair_customer_id"), 1);
    ({ data, error } = await client.from("trial_lessons").update(patch).eq("id", id).select(SELECT).single());
  }
  if (error && isMissingAuthorColumn(error)) {
    const { updated_by, ...rest } = patch;
    void updated_by;
    ({ data, error } = await client.from("trial_lessons").update(rest).eq("id", id).select(SELECT).single());
  }
  if (error && isMissingAuthorColumn(error) && extraKeys.length > 0) {
    const rest = { ...patch };
    delete rest.updated_by;
    for (const k of extraKeys) delete rest[k];
    ({ data, error } = await client.from("trial_lessons").update(rest).eq("id", id).select(SELECT).single());
  }
  if (error) throw error;
  return fromDb(data as DbRow);
}

/**
 * 体験の「次の人への引き継ぎ」だけを書き換える（2026-11-15〜）。
 * 列（20261115000001_trial_handover_note.sql）がまだ無いDBでは "missing" を返す。
 */
export async function saveTrialHandoverNote(id: string, note: string | null, who: "main" | "pair" = "main"): Promise<"ok" | "missing"> {
  const client = createAdminClient();
  const col = who === "pair" ? "pair_handover_note" : "handover_note";
  const patch: Record<string, unknown> = { [col]: note, updated_at: new Date().toISOString(), updated_by: (await currentMemberId()) ?? null };
  let { error } = await client.from("trial_lessons").update(patch).eq("id", id);
  if (error && /updated_by/i.test(error.message ?? "")) {
    delete patch.updated_by;
    ({ error } = await client.from("trial_lessons").update(patch).eq("id", id));
  }
  if (error && (/handover_note/i.test(error.message ?? "") || ["42703", "PGRST204"].includes(error.code ?? ""))) return "missing";
  if (error) throw error;
  return "ok";
}

export async function deleteTrialLesson(id: string): Promise<void> {
  const { error } = await createAdminClient()
    .from("trial_lessons")
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
export const getTrialLessons = cache(getTrialLessonsUncached);

/** 開始日時が [fromIso, toIso) の体験だけ読む（数分おきのリマインド用。2026-11-16） */
export async function getTrialLessonsInRange(fromIso: string, toIso: string): Promise<TrialLesson[]> {
  const client = createAdminClient();
  let last: { code?: string; message?: string } | null = null;
  for (const select of LIST_SELECTS) {
    const { data, error } = await client.from("trial_lessons").select(select)
      .gte("scheduled_at", fromIso).lt("scheduled_at", toIso)
      .order("scheduled_at", { ascending: true }).limit(1000);
    if (!error) return (data as unknown as DbRow[]).map(fromDb);
    last = error;
    if (!isMissingAuthorColumn(error)) break;
  }
  if (last && (last.code === "42P01" || /does not exist|could not find the table/i.test(last.message ?? ""))) return [];
  throw last;
}

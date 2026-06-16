import { createAdminClient } from "./supabase";
export type { LessonPaymentType, LessonStatus, Lesson } from "./lessons-types";
export { LESSON_STATUS_LABEL, COURSE_OPTIONS, courseToPaymentType } from "./lessons-types";
import type { LessonPaymentType, LessonStatus, Lesson } from "./lessons-types";
import { parseExercises, type Exercise } from "./exercise-types";

type DbRow = {
  id: string;
  customer_id: string;
  trainer_member_id: string | null;
  scheduled_at: string;
  location: string | null;
  course: string | null;
  payment_type: LessonPaymentType | null;
  status: LessonStatus;
  session_pass_id: string | null;
  training_content: string | null;
  customer_impression: string | null;
  exercises: unknown;
  note: string | null;
  rental_gym_id: string | null;
  rental_gym_fee: number | null;
  created_by: string | null;
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
    location:          row.location ?? undefined,
    course:            row.course ?? undefined,
    paymentType:       row.payment_type ?? undefined,
    status:            row.status,
    sessionPassId:     row.session_pass_id ?? undefined,
    trainingContent:   row.training_content ?? undefined,
    customerImpression: row.customer_impression ?? undefined,
    exercises:         parseExercises(row.exercises),
    note:              row.note ?? undefined,
    rentalGymId:       row.rental_gym_id ?? undefined,
    rentalGymFee:      row.rental_gym_fee ?? undefined,
    createdById:       row.created_by ?? undefined,
    createdByName:     row.created_by_member?.name ?? undefined,
    createdAt:         row.created_at,
    updatedAt:         row.updated_at,
  };
}

const SELECT = "*, customers(full_name), trainer_member:members!trainer_member_id(name), created_by_member:members!created_by(name)";
// created_by 列が未追加（マイグレーション未適用）の環境でも動くフォールバック
const SELECT_LEGACY = "*, customers(full_name), trainer_member:members!trainer_member_id(name)";

// 後から追加した任意列（created_by / rental_gym_*）が未適用のときのエラーか
function isMissingOptionalColumn(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return /created_by|rental_gym/i.test(err.message ?? "") || err.code === "PGRST200" || err.code === "42703" || err.code === "PGRST204";
}

export async function getLessons(): Promise<Lesson[]> {
  const client = createAdminClient();
  let { data, error } = await client.from("lessons").select(SELECT).order("scheduled_at", { ascending: false });
  if (error && isMissingOptionalColumn(error)) {
    ({ data, error } = await client.from("lessons").select(SELECT_LEGACY).order("scheduled_at", { ascending: false }));
  }
  if (error) throw error;
  return (data as DbRow[]).map(fromDb);
}

export async function getLesson(id: string): Promise<Lesson | null> {
  const client = createAdminClient();
  let { data, error } = await client.from("lessons").select(SELECT).eq("id", id).single();
  if (error && isMissingOptionalColumn(error)) {
    ({ data, error } = await client.from("lessons").select(SELECT_LEGACY).eq("id", id).single());
  }
  if (error || !data) return null;
  return fromDb(data as DbRow);
}

export async function addLesson(input: {
  customerId: string;
  trainerMemberId?: string;
  scheduledAt: string;
  location?: string;
  course?: string;
  paymentType?: LessonPaymentType;
  sessionPassId?: string;
  note?: string;
  createdBy?: string;
  rentalGymId?: string | null;
  rentalGymFee?: number | null;
}): Promise<Lesson> {
  const client = createAdminClient();
  const base = {
    customer_id:       input.customerId,
    trainer_member_id: input.trainerMemberId ?? null,
    scheduled_at:      input.scheduledAt,
    location:          input.location ?? null,
    course:            input.course ?? null,
    payment_type:      input.paymentType ?? null,
    session_pass_id:   input.sessionPassId ?? null,
    note:              input.note ?? null,
  };
  const optional = {
    created_by:     input.createdBy ?? null,
    rental_gym_id:  input.rentalGymId ?? null,
    rental_gym_fee: input.rentalGymFee ?? null,
  };
  let { data, error } = await client
    .from("lessons")
    .insert({ ...base, ...optional })
    .select(SELECT)
    .single();
  if (error && isMissingOptionalColumn(error)) {
    ({ data, error } = await client.from("lessons").insert(base).select(SELECT_LEGACY).single());
  }
  if (error) throw error;
  return fromDb(data as DbRow);
}

export async function updateLesson(
  id: string,
  input: Partial<{
    customerId: string;
    trainerMemberId: string | null;
    scheduledAt: string;
    location: string | null;
    course: string | null;
    paymentType: LessonPaymentType | null;
    status: LessonStatus;
    sessionPassId: string | null;
    trainingContent: string | null;
    customerImpression: string | null;
    exercises: Exercise[];
    note: string | null;
    rentalGymId: string | null;
    rentalGymFee: number | null;
  }>
): Promise<Lesson | null> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.customerId         !== undefined) patch.customer_id          = input.customerId;
  if (input.trainerMemberId    !== undefined) patch.trainer_member_id    = input.trainerMemberId;
  if (input.scheduledAt        !== undefined) patch.scheduled_at         = input.scheduledAt;
  if (input.location           !== undefined) patch.location             = input.location;
  if (input.course             !== undefined) patch.course               = input.course;
  if (input.paymentType        !== undefined) patch.payment_type         = input.paymentType;
  if (input.status             !== undefined) patch.status               = input.status;
  if (input.sessionPassId      !== undefined) patch.session_pass_id      = input.sessionPassId;
  if (input.trainingContent    !== undefined) patch.training_content     = input.trainingContent;
  if (input.customerImpression !== undefined) patch.customer_impression  = input.customerImpression;
  if (input.exercises          !== undefined) patch.exercises            = input.exercises;
  if (input.note               !== undefined) patch.note                 = input.note;
  if (input.rentalGymId        !== undefined) patch.rental_gym_id        = input.rentalGymId;
  if (input.rentalGymFee       !== undefined) patch.rental_gym_fee       = input.rentalGymFee;

  const client = createAdminClient();
  let { data, error } = await client.from("lessons").update(patch).eq("id", id).select(SELECT).single();
  // rental_gym_* 列が未適用の環境では、それらを外して再試行
  if (error && isMissingOptionalColumn(error)) {
    const { rental_gym_id, rental_gym_fee, ...rest } = patch;
    void rental_gym_id; void rental_gym_fee;
    ({ data, error } = await client.from("lessons").update(rest).eq("id", id).select(SELECT_LEGACY).single());
  }
  if (error) throw error;
  return fromDb(data as DbRow);
}

export async function deleteLesson(id: string): Promise<void> {
  const { error } = await createAdminClient()
    .from("lessons")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

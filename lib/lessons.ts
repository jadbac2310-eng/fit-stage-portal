import { createAdminClient } from "./supabase";
export type { LessonPaymentType, LessonStatus, Lesson } from "./lessons-types";
export { LESSON_STATUS_LABEL, COURSE_OPTIONS, courseToPaymentType } from "./lessons-types";
import type { LessonPaymentType, LessonStatus, Lesson } from "./lessons-types";

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
  note: string | null;
  created_at: string;
  updated_at: string;
  customers: { full_name: string } | null;
  trainer_member: { name: string } | null;
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
    note:              row.note ?? undefined,
    createdAt:         row.created_at,
    updatedAt:         row.updated_at,
  };
}

const SELECT = "*, customers(full_name), trainer_member:members!trainer_member_id(name)";

export async function getLessons(): Promise<Lesson[]> {
  const { data, error } = await createAdminClient()
    .from("lessons")
    .select(SELECT)
    .order("scheduled_at", { ascending: false });
  if (error) throw error;
  return (data as DbRow[]).map(fromDb);
}

export async function getLesson(id: string): Promise<Lesson | null> {
  const { data, error } = await createAdminClient()
    .from("lessons")
    .select(SELECT)
    .eq("id", id)
    .single();
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
}): Promise<Lesson> {
  const { data, error } = await createAdminClient()
    .from("lessons")
    .insert({
      customer_id:       input.customerId,
      trainer_member_id: input.trainerMemberId ?? null,
      scheduled_at:      input.scheduledAt,
      location:          input.location ?? null,
      course:            input.course ?? null,
      payment_type:      input.paymentType ?? null,
      session_pass_id:   input.sessionPassId ?? null,
      note:              input.note ?? null,
    })
    .select(SELECT)
    .single();
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
    note: string | null;
  }>
): Promise<Lesson | null> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.customerId      !== undefined) patch.customer_id       = input.customerId;
  if (input.trainerMemberId !== undefined) patch.trainer_member_id = input.trainerMemberId;
  if (input.scheduledAt     !== undefined) patch.scheduled_at      = input.scheduledAt;
  if (input.location        !== undefined) patch.location          = input.location;
  if (input.course          !== undefined) patch.course            = input.course;
  if (input.paymentType     !== undefined) patch.payment_type      = input.paymentType;
  if (input.status          !== undefined) patch.status            = input.status;
  if (input.sessionPassId   !== undefined) patch.session_pass_id   = input.sessionPassId;
  if (input.note            !== undefined) patch.note              = input.note;

  const { data, error } = await createAdminClient()
    .from("lessons")
    .update(patch)
    .eq("id", id)
    .select(SELECT)
    .single();
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

import { createAdminClient } from "./supabase";
import type { CustomerPlan } from "./customers-types";
export type { TrialLessonStatus, TrialLesson } from "./trial-lessons-types";
export { STATUS_LABEL, CONTRACT_LABEL } from "./trial-lessons-types";
import type { TrialLessonStatus, TrialLesson } from "./trial-lessons-types";
import { parseExercises, type Exercise } from "./exercise-types";
import { currentMemberId, isMissingAuthorColumn } from "./audit";

type DbRow = {
  id: string;
  customer_id: string;
  sales_member_id: string | null;
  trainer_member_id: string | null;
  scheduled_at: string;
  location: string | null;
  status: TrialLessonStatus;
  contracted: boolean | null;
  contract_plan: CustomerPlan | null;
  training_content: string | null;
  customer_impression: string | null;
  exercises: unknown;
  note: string | null;
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
    status:              row.status,
    contracted:          row.contracted,
    contractPlan:        row.contract_plan ?? undefined,
    trainingContent:     row.training_content ?? undefined,
    customerImpression:  row.customer_impression ?? undefined,
    exercises:           parseExercises(row.exercises),
    note:                row.note ?? undefined,
    createdById:         row.created_by ?? undefined,
    updatedById:         row.updated_by ?? undefined,
    createdAt:           row.created_at,
    updatedAt:           row.updated_at,
  };
}

const SELECT = "*, customers(full_name), sales_member:members!sales_member_id(name), trainer_member:members!trainer_member_id(name)";
// members への JOIN 関連がスキーマキャッシュで解決できない(PGRST200)場合の退避（担当者名は空になるが描画は継続）
const SELECT_LEGACY = "*, customers(full_name)";

export async function getTrialLessons(): Promise<TrialLesson[]> {
  const client = createAdminClient();
  let { data, error } = await client.from("trial_lessons").select(SELECT).order("scheduled_at", { ascending: false });
  if (error && isMissingAuthorColumn(error)) {
    ({ data, error } = await client.from("trial_lessons").select(SELECT_LEGACY).order("scheduled_at", { ascending: false }));
  }
  if (error) {
    if (error.code === "42P01" || /does not exist|could not find the table/i.test(error.message)) return [];
    throw error;
  }
  return (data as DbRow[]).map(fromDb);
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
  note?: string;
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
  const creator = (await currentMemberId()) ?? null;
  let { data, error } = await client.from("trial_lessons").insert({ ...base, created_by: creator, updated_by: creator }).select(SELECT).single();
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
    status: TrialLessonStatus;
    contracted: boolean | null;
    contractPlan: CustomerPlan | null;
    trainingContent: string | null;
    customerImpression: string | null;
    exercises: Exercise[];
    note: string | null;
  }>
): Promise<TrialLesson | null> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.customerId          !== undefined) patch.customer_id          = input.customerId;
  if (input.salesMemberId       !== undefined) patch.sales_member_id      = input.salesMemberId;
  if (input.trainerMemberId     !== undefined) patch.trainer_member_id    = input.trainerMemberId;
  if (input.scheduledAt         !== undefined) patch.scheduled_at         = input.scheduledAt;
  if (input.location            !== undefined) patch.location             = input.location;
  if (input.status              !== undefined) patch.status               = input.status;
  if (input.contracted          !== undefined) patch.contracted           = input.contracted;
  if (input.contractPlan        !== undefined) patch.contract_plan        = input.contractPlan;
  if (input.trainingContent     !== undefined) patch.training_content     = input.trainingContent;
  if (input.exercises           !== undefined) patch.exercises            = input.exercises;
  if (input.customerImpression  !== undefined) patch.customer_impression  = input.customerImpression;
  if (input.note                !== undefined) patch.note                 = input.note;
  patch.updated_by = (await currentMemberId()) ?? null;

  const client = createAdminClient();
  let { data, error } = await client.from("trial_lessons").update(patch).eq("id", id).select(SELECT).single();
  if (error && isMissingAuthorColumn(error)) {
    const { updated_by, ...rest } = patch;
    void updated_by;
    ({ data, error } = await client.from("trial_lessons").update(rest).eq("id", id).select(SELECT).single());
  }
  if (error) throw error;
  return fromDb(data as DbRow);
}

export async function deleteTrialLesson(id: string): Promise<void> {
  const { error } = await createAdminClient()
    .from("trial_lessons")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

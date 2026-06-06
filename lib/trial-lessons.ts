import { createAdminClient } from "./supabase";
import type { CustomerPlan } from "./customers-types";
export type { TrialLessonStatus, TrialLesson } from "./trial-lessons-types";
export { STATUS_LABEL, CONTRACT_LABEL } from "./trial-lessons-types";
import type { TrialLessonStatus, TrialLesson } from "./trial-lessons-types";

type DbRow = {
  id: string;
  customer_id: string;
  member_id: string;
  scheduled_at: string;
  location: string | null;
  status: TrialLessonStatus;
  contracted: boolean | null;
  contract_plan: CustomerPlan | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  customers: { full_name: string } | null;
  members: { name: string } | null;
};

function fromDb(row: DbRow): TrialLesson {
  return {
    id:            row.id,
    customerId:    row.customer_id,
    customerName:  row.customers?.full_name ?? "",
    memberId:      row.member_id,
    memberName:    row.members?.name ?? "",
    scheduledAt:   row.scheduled_at,
    location:      row.location ?? undefined,
    status:        row.status,
    contracted:    row.contracted,
    contractPlan:  row.contract_plan ?? undefined,
    note:          row.note ?? undefined,
    createdAt:     row.created_at,
    updatedAt:     row.updated_at,
  };
}

export async function getTrialLessons(): Promise<TrialLesson[]> {
  const { data, error } = await createAdminClient()
    .from("trial_lessons")
    .select("*, customers(full_name), members(name)")
    .order("scheduled_at", { ascending: false });
  if (error) throw error;
  return (data as DbRow[]).map(fromDb);
}

export async function getTrialLesson(id: string): Promise<TrialLesson | null> {
  const { data, error } = await createAdminClient()
    .from("trial_lessons")
    .select("*, customers(full_name), members(name)")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return fromDb(data as DbRow);
}

export async function addTrialLesson(input: {
  customerId: string;
  memberId: string;
  scheduledAt: string;
  location?: string;
  status?: TrialLessonStatus;
  contracted?: boolean | null;
  contractPlan?: CustomerPlan;
  note?: string;
}): Promise<TrialLesson> {
  const { data, error } = await createAdminClient()
    .from("trial_lessons")
    .insert({
      customer_id:   input.customerId,
      member_id:     input.memberId,
      scheduled_at:  input.scheduledAt,
      location:      input.location ?? null,
      status:        input.status ?? "scheduled",
      contracted:    input.contracted ?? null,
      contract_plan: input.contractPlan ?? null,
      note:          input.note ?? null,
    })
    .select("*, customers(full_name), members(name)")
    .single();
  if (error) throw error;
  return fromDb(data as DbRow);
}

export async function updateTrialLesson(
  id: string,
  input: Partial<{
    customerId: string;
    memberId: string;
    scheduledAt: string;
    location: string | null;
    status: TrialLessonStatus;
    contracted: boolean | null;
    contractPlan: CustomerPlan | null;
    note: string | null;
  }>
): Promise<TrialLesson | null> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.customerId   !== undefined) patch.customer_id   = input.customerId;
  if (input.memberId     !== undefined) patch.member_id     = input.memberId;
  if (input.scheduledAt  !== undefined) patch.scheduled_at  = input.scheduledAt;
  if (input.location     !== undefined) patch.location      = input.location;
  if (input.status       !== undefined) patch.status        = input.status;
  if (input.contracted   !== undefined) patch.contracted    = input.contracted;
  if (input.contractPlan !== undefined) patch.contract_plan = input.contractPlan;
  if (input.note         !== undefined) patch.note          = input.note;

  const { data, error } = await createAdminClient()
    .from("trial_lessons")
    .update(patch)
    .eq("id", id)
    .select("*, customers(full_name), members(name)")
    .single();
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


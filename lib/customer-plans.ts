import { createAdminClient } from "./supabase";
export type { CustomerPlanRecord, CustomerPlan } from "./customer-plans-types";
export { PLAN_LABEL, plansOverlap } from "./customer-plans-types";
import type { CustomerPlanRecord, CustomerPlan } from "./customer-plans-types";

type DbRow = {
  id: string;
  customer_id: string;
  plan: CustomerPlan;
  started_at: string;
  ended_at: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

function fromDb(row: DbRow): CustomerPlanRecord {
  return {
    id:         row.id,
    customerId: row.customer_id,
    plan:       row.plan,
    startedAt:  row.started_at,
    endedAt:    row.ended_at ?? undefined,
    note:       row.note ?? undefined,
    createdAt:  row.created_at,
    updatedAt:  row.updated_at,
  };
}

export async function getAllCustomerPlans(): Promise<CustomerPlanRecord[]> {
  const { data, error } = await createAdminClient()
    .from("customer_plans")
    .select("*")
    .order("started_at", { ascending: false });
  if (error) throw error;
  return (data as DbRow[]).map(fromDb);
}

export async function getCustomerPlans(customerId: string): Promise<CustomerPlanRecord[]> {
  const { data, error } = await createAdminClient()
    .from("customer_plans")
    .select("*")
    .eq("customer_id", customerId)
    .order("started_at", { ascending: false });
  if (error) throw error;
  return (data as DbRow[]).map(fromDb);
}

export async function addCustomerPlan(input: {
  customerId: string;
  plan: CustomerPlan;
  startedAt: string;
  endedAt?: string;
  note?: string;
}): Promise<CustomerPlanRecord> {
  const { data, error } = await createAdminClient()
    .from("customer_plans")
    .insert({
      customer_id: input.customerId,
      plan:        input.plan,
      started_at:  input.startedAt,
      ended_at:    input.endedAt ?? null,
      note:        input.note ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return fromDb(data as DbRow);
}

export async function updateCustomerPlan(
  id: string,
  input: Partial<{
    plan: CustomerPlan;
    startedAt: string;
    endedAt: string | null;
    note: string | null;
  }>
): Promise<CustomerPlanRecord | null> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.plan      !== undefined) patch.plan       = input.plan;
  if (input.startedAt !== undefined) patch.started_at = input.startedAt;
  if (input.endedAt   !== undefined) patch.ended_at   = input.endedAt;
  if (input.note      !== undefined) patch.note       = input.note;

  const { data, error } = await createAdminClient()
    .from("customer_plans")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return fromDb(data as DbRow);
}

export async function deleteCustomerPlan(id: string): Promise<void> {
  const { error } = await createAdminClient()
    .from("customer_plans")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

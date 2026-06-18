import { createAdminClient } from "./supabase";
export type { ContractPlan, CustomerPlanRecord } from "./customer-plans-types";
export { CONTRACT_PLAN_LABEL, plansOverlap } from "./customer-plans-types";
import type { ContractPlan, CustomerPlanRecord } from "./customer-plans-types";
import { currentMemberId, isMissingAuthorColumn } from "./audit";

type DbRow = {
  id: string;
  customer_id: string;
  plan: ContractPlan;
  price: number | null;
  purchased_at: string | null;
  started_at: string;
  ended_at: string | null;
  note: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

function fromDb(row: DbRow): CustomerPlanRecord {
  return {
    id:         row.id,
    customerId: row.customer_id,
    plan:       row.plan,
    price:      row.price ?? undefined,
    purchasedAt: row.purchased_at ?? row.started_at,
    startedAt:  row.started_at,
    endedAt:    row.ended_at ?? undefined,
    note:       row.note ?? undefined,
    createdById: row.created_by ?? undefined,
    updatedById: row.updated_by ?? undefined,
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
  plan: ContractPlan;
  price?: number;
  purchasedAt?: string;
  startedAt: string;
  endedAt?: string;
  note?: string;
}): Promise<CustomerPlanRecord> {
  const client = createAdminClient();
  const base = {
    customer_id:  input.customerId,
    plan:         input.plan,
    price:        input.price ?? null,
    purchased_at: input.purchasedAt ?? input.startedAt,
    started_at:   input.startedAt,
    ended_at:     input.endedAt ?? null,
    note:         input.note ?? null,
  };
  const creator = (await currentMemberId()) ?? null;
  let { data, error } = await client.from("customer_plans").insert({ ...base, created_by: creator, updated_by: creator }).select().single();
  if (error && isMissingAuthorColumn(error)) {
    ({ data, error } = await client.from("customer_plans").insert(base).select().single());
  }
  if (error) throw error;
  return fromDb(data as DbRow);
}

export async function updateCustomerPlan(
  id: string,
  input: Partial<{
    plan: ContractPlan;
    price: number | null;
    purchasedAt: string | null;
    startedAt: string;
    endedAt: string | null;
    note: string | null;
  }>
): Promise<CustomerPlanRecord | null> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.plan        !== undefined) patch.plan         = input.plan;
  if (input.price       !== undefined) patch.price        = input.price;
  if (input.purchasedAt !== undefined) patch.purchased_at = input.purchasedAt;
  if (input.startedAt   !== undefined) patch.started_at   = input.startedAt;
  if (input.endedAt     !== undefined) patch.ended_at     = input.endedAt;
  if (input.note        !== undefined) patch.note         = input.note;
  patch.updated_by = (await currentMemberId()) ?? null;

  const client = createAdminClient();
  let { data, error } = await client.from("customer_plans").update(patch).eq("id", id).select().single();
  if (error && isMissingAuthorColumn(error)) {
    const { updated_by, ...rest } = patch;
    void updated_by;
    ({ data, error } = await client.from("customer_plans").update(rest).eq("id", id).select().single());
  }
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

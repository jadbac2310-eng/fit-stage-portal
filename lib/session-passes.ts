import { createAdminClient } from "./supabase";
export type { SessionPass } from "./session-passes-types";
import type { SessionPass } from "./session-passes-types";

type DbRow = {
  id: string;
  customer_id: string;
  total_count: number;
  remaining_count: number;
  person_count: number;
  price: number | null;
  purchased_at: string;
  expired_at: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

function fromDb(row: DbRow): SessionPass {
  return {
    id:             row.id,
    customerId:     row.customer_id,
    totalCount:     row.total_count,
    remainingCount: row.remaining_count,
    personCount:    row.person_count,
    price:          row.price ?? undefined,
    purchasedAt:    row.purchased_at,
    expiredAt:      row.expired_at ?? undefined,
    note:           row.note ?? undefined,
    createdAt:      row.created_at,
    updatedAt:      row.updated_at,
  };
}

export async function getAllSessionPasses(): Promise<SessionPass[]> {
  const { data, error } = await createAdminClient()
    .from("session_passes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as DbRow[]).map(fromDb);
}

export async function addSessionPass(input: {
  customerId: string;
  totalCount: number;
  personCount?: number;
  price?: number;
  purchasedAt: string;
  expiredAt?: string;
  note?: string;
}): Promise<SessionPass> {
  const { data, error } = await createAdminClient()
    .from("session_passes")
    .insert({
      customer_id:     input.customerId,
      total_count:     input.totalCount,
      remaining_count: input.totalCount,
      person_count:    input.personCount ?? 1,
      price:           input.price ?? null,
      purchased_at:    input.purchasedAt,
      expired_at:      input.expiredAt ?? null,
      note:            input.note ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return fromDb(data as DbRow);
}

export async function deleteSessionPass(id: string): Promise<void> {
  const { error } = await createAdminClient()
    .from("session_passes")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function decrementSessionPass(id: string): Promise<void> {
  const { error } = await createAdminClient().rpc("decrement_session_pass", { pass_id: id });
  if (error) throw error;
}

export async function incrementSessionPass(id: string): Promise<void> {
  const { error } = await createAdminClient().rpc("increment_session_pass", { pass_id: id });
  if (error) throw error;
}

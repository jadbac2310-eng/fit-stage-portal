import { createAdminClient } from "./supabase";
export type { MonthlyReport } from "./monthly-reports-types";
import type { MonthlyReport } from "./monthly-reports-types";

type DbRow = {
  id: string;
  customer_id: string;
  trainer_member_id: string | null;
  year_month: string;
  content: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  trainer_member: { name: string } | null;
};

const SELECT = "*, trainer_member:members!trainer_member_id(name)";

function fromDb(row: DbRow): MonthlyReport {
  return {
    id:                row.id,
    customerId:        row.customer_id,
    trainerMemberId:   row.trainer_member_id ?? undefined,
    trainerMemberName: row.trainer_member?.name ?? undefined,
    yearMonth:         row.year_month,
    content:           row.content ?? undefined,
    note:              row.note ?? undefined,
    createdAt:         row.created_at,
    updatedAt:         row.updated_at,
  };
}

export async function getAllMonthlyReports(): Promise<MonthlyReport[]> {
  const { data, error } = await createAdminClient()
    .from("monthly_reports")
    .select(SELECT)
    .order("year_month", { ascending: false });
  if (error) throw error;
  return (data as DbRow[]).map(fromDb);
}

export async function upsertMonthlyReport(input: {
  customerId: string;
  trainerMemberId?: string | null;
  yearMonth: string;
  content?: string | null;
  note?: string | null;
}): Promise<MonthlyReport> {
  const { data, error } = await createAdminClient()
    .from("monthly_reports")
    .upsert(
      {
        customer_id:       input.customerId,
        trainer_member_id: input.trainerMemberId ?? null,
        year_month:        input.yearMonth,
        content:           input.content ?? null,
        note:              input.note ?? null,
        updated_at:        new Date().toISOString(),
      },
      { onConflict: "customer_id,year_month" }
    )
    .select(SELECT)
    .single();
  if (error) throw error;
  return fromDb(data as DbRow);
}

export async function deleteMonthlyReport(id: string): Promise<void> {
  const { error } = await createAdminClient()
    .from("monthly_reports")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

import { createAdminClient } from "./supabase";
export type { CustomerPlan, CustomerStatus, Customer } from "./customers-types";
export { STATUS_LABEL } from "./customers-types";
import type { Customer, CustomerStatus } from "./customers-types";

type DbRow = {
  id: string;
  email: string;
  full_name: string;
  date_of_birth: string;
  address: string | null;
  phone_number: string | null;
  desired_start_date: string | null;
  agreed_to_terms: boolean;
  electronic_signature: string | null;
  status: CustomerStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
};

function fromDb(row: DbRow): Customer {
  return {
    id:               row.id,
    email:            row.email,
    fullName:         row.full_name,
    dateOfBirth:      row.date_of_birth,
    address:          row.address          ?? undefined,
    phoneNumber:      row.phone_number      ?? undefined,
    desiredStartDate: row.desired_start_date ?? undefined,
    agreedToTerms:    row.agreed_to_terms,
    status:           row.status,
    note:             row.note ?? undefined,
    createdAt:        row.created_at,
    updatedAt:        row.updated_at,
  };
}

export async function getCustomers(): Promise<Customer[]> {
  const { data, error } = await createAdminClient()
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as DbRow[]).map(fromDb);
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const { data, error } = await createAdminClient()
    .from("customers")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return fromDb(data as DbRow);
}

export async function addCustomer(
  input: Omit<Customer, "id" | "createdAt" | "updatedAt">
): Promise<Customer> {
  const { data, error } = await createAdminClient()
    .from("customers")
    .insert({
      email:              input.email,
      full_name:          input.fullName,
      date_of_birth:      input.dateOfBirth,
      address:            input.address            ?? null,
      phone_number:       input.phoneNumber         ?? null,
      desired_start_date: input.desiredStartDate    ?? null,
      agreed_to_terms:    input.agreedToTerms,
      status:             input.status,
      note:               input.note ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return fromDb(data as DbRow);
}

export async function updateCustomer(
  id: string,
  input: Partial<Omit<Customer, "id" | "createdAt" | "updatedAt">>
): Promise<Customer | null> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.email            !== undefined) patch.email              = input.email;
  if (input.fullName         !== undefined) patch.full_name          = input.fullName;
  if (input.dateOfBirth      !== undefined) patch.date_of_birth      = input.dateOfBirth;
  if (input.address          !== undefined) patch.address            = input.address;
  if (input.phoneNumber      !== undefined) patch.phone_number       = input.phoneNumber;
  if (input.desiredStartDate !== undefined) patch.desired_start_date = input.desiredStartDate;
  if (input.agreedToTerms    !== undefined) patch.agreed_to_terms    = input.agreedToTerms;
  if (input.status           !== undefined) patch.status             = input.status;
  if (input.note             !== undefined) patch.note               = input.note ?? null;

  const { data, error } = await createAdminClient()
    .from("customers")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return fromDb(data as DbRow);
}

export async function deleteCustomer(id: string): Promise<void> {
  const { error } = await createAdminClient()
    .from("customers")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function getCustomersCount(): Promise<number> {
  const { count, error } = await createAdminClient()
    .from("customers")
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

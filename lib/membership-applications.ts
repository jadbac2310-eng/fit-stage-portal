import { createAdminClient, fetchAllRows } from "./supabase";
export type { ApplicationStatus, MembershipApplication } from "./membership-applications-types";
export { APPLICATION_STATUS_LABEL, hasHealthFlag } from "./membership-applications-types";
import type { ApplicationStatus, MembershipApplication } from "./membership-applications-types";

type DbRow = {
  id: string;
  customer_id: string | null;
  store_id: string | null;
  store_name: string | null;
  full_name: string;
  full_name_kana: string | null;
  date_of_birth: string | null;
  phone_number: string | null;
  email: string | null;
  postal_code: string | null;
  address: string | null;
  emergency_name: string | null;
  emergency_relation: string | null;
  emergency_phone: string | null;
  plan: string | null;
  payment_method: string | null;
  health_condition: string | null;
  health_medicine: string | null;
  health_injury: string | null;
  health_maternity: boolean;
  health_note: string | null;
  guardian_name: string | null;
  guardian_relation: string | null;
  guardian_consent: boolean;
  photo_consent: string | null;
  request_note: string | null;
  agreed_to_terms: boolean;
  agreed_to_privacy: boolean;
  agreed_at: string | null;
  signature_name: string | null;
  status: ApplicationStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
};

const COLUMNS = "*";

function fromDb(row: DbRow): MembershipApplication {
  return {
    id:                row.id,
    customerId:        row.customer_id ?? undefined,
    storeId:           row.store_id ?? undefined,
    storeName:         row.store_name ?? undefined,
    fullName:          row.full_name,
    fullNameKana:      row.full_name_kana ?? undefined,
    dateOfBirth:       row.date_of_birth ?? undefined,
    phoneNumber:       row.phone_number ?? undefined,
    email:             row.email ?? undefined,
    postalCode:        row.postal_code ?? undefined,
    address:           row.address ?? undefined,
    emergencyName:     row.emergency_name ?? undefined,
    emergencyRelation: row.emergency_relation ?? undefined,
    emergencyPhone:    row.emergency_phone ?? undefined,
    plan:              row.plan ?? undefined,
    paymentMethod:     row.payment_method ?? undefined,
    healthCondition:   row.health_condition ?? undefined,
    healthMedicine:    row.health_medicine ?? undefined,
    healthInjury:      row.health_injury ?? undefined,
    healthMaternity:   row.health_maternity,
    healthNote:        row.health_note ?? undefined,
    guardianName:      row.guardian_name ?? undefined,
    guardianRelation:  row.guardian_relation ?? undefined,
    guardianConsent:   row.guardian_consent,
    photoConsent:      row.photo_consent ?? undefined,
    requestNote:       row.request_note ?? undefined,
    agreedToTerms:     row.agreed_to_terms,
    agreedToPrivacy:   row.agreed_to_privacy,
    agreedAt:          row.agreed_at ?? undefined,
    signatureName:     row.signature_name ?? undefined,
    status:            row.status,
    note:              row.note ?? undefined,
    createdAt:         row.created_at,
    updatedAt:         row.updated_at,
  };
}

/** 新しい順にすべて返す */
export async function getMembershipApplications(): Promise<MembershipApplication[]> {
  const client = createAdminClient();
  const { data, error } = await fetchAllRows((from, to) => client
    .from("membership_applications")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(from, to));
  if (error) throw error;
  return (data as DbRow[]).map(fromDb);
}

export async function getMembershipApplicationsCount(): Promise<number> {
  const client = createAdminClient();
  const { count, error } = await client
    .from("membership_applications")
    .select("id", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/**
 * 未対応の件数。マスタ一覧のバッジに使う。
 * バッジのためだけなので、テーブル未作成などで取れないときは 0 を返して
 * マスタ一覧そのものが開けなくならないようにする。
 */
export async function getNewMembershipApplicationsCount(): Promise<number> {
  try {
    const client = createAdminClient();
    const { count, error } = await client
      .from("membership_applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "new");
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export type NewMembershipApplication = Omit<
  MembershipApplication,
  "id" | "status" | "createdAt" | "updatedAt" | "healthMaternity" | "guardianConsent"
> & Partial<{ healthMaternity: boolean; guardianConsent: boolean; status: ApplicationStatus }>;

export async function addMembershipApplication(
  input: NewMembershipApplication
): Promise<MembershipApplication> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("membership_applications")
    .insert({
      customer_id:        input.customerId ?? null,
      store_id:           input.storeId ?? null,
      store_name:         input.storeName ?? null,
      full_name:          input.fullName,
      full_name_kana:     input.fullNameKana ?? null,
      date_of_birth:      input.dateOfBirth ?? null,
      phone_number:       input.phoneNumber ?? null,
      email:              input.email ?? null,
      postal_code:        input.postalCode ?? null,
      address:            input.address ?? null,
      emergency_name:     input.emergencyName ?? null,
      emergency_relation: input.emergencyRelation ?? null,
      emergency_phone:    input.emergencyPhone ?? null,
      plan:               input.plan ?? null,
      payment_method:     input.paymentMethod ?? null,
      health_condition:   input.healthCondition ?? null,
      health_medicine:    input.healthMedicine ?? null,
      health_injury:      input.healthInjury ?? null,
      health_maternity:   input.healthMaternity ?? false,
      health_note:        input.healthNote ?? null,
      guardian_name:      input.guardianName ?? null,
      guardian_relation:  input.guardianRelation ?? null,
      guardian_consent:   input.guardianConsent ?? false,
      photo_consent:      input.photoConsent ?? null,
      request_note:       input.requestNote ?? null,
      agreed_to_terms:    input.agreedToTerms,
      agreed_to_privacy:  input.agreedToPrivacy,
      agreed_at:          input.agreedAt ?? null,
      signature_name:     input.signatureName ?? null,
      note:               input.note ?? null,
      ...(input.status ? { status: input.status } : {}),
    })
    .select(COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return fromDb(data as DbRow);
}

export async function setMembershipApplicationStatus(
  id: string,
  status: ApplicationStatus
): Promise<void> {
  const client = createAdminClient();
  const { error } = await client
    .from("membership_applications")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteMembershipApplication(id: string): Promise<void> {
  const client = createAdminClient();
  const { error } = await client.from("membership_applications").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

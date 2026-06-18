"use server";

import { revalidatePath } from "next/cache";
import { addCustomer, updateCustomer, deleteCustomer } from "@/lib/customers";
import { requireAdmin } from "@/lib/members";
import { logActivity } from "@/lib/activity-logs";
import { STATUS_LABEL, type CustomerStatus, type CustomerType } from "@/lib/customers-types";

export async function createCustomerAction(formData: FormData) {
  await requireAdmin();
  const fullName         = (formData.get("fullName")         as string)?.trim();
  const email            = (formData.get("email")            as string)?.trim();
  const dateOfBirth      = (formData.get("dateOfBirth")      as string)?.trim();
  const address          = (formData.get("address")          as string)?.trim();
  const phoneNumber      = (formData.get("phoneNumber")      as string)?.trim();
  const desiredStartDate = (formData.get("desiredStartDate") as string)?.trim();
  const customerType     = ((formData.get("customerType") as string)?.trim() || "individual") as CustomerType;
  const note             = (formData.get("note")             as string)?.trim() || undefined;
  const sspRaw           = (formData.get("singleSessionPrice") as string)?.trim();
  const singleSessionPrice = sspRaw ? parseInt(sspRaw, 10) : undefined;
  const salesMemberId    = (formData.get("salesMemberId")   as string)?.trim() || undefined;

  if (!fullName || !email || !dateOfBirth) return;

  const created = await addCustomer({ fullName, email, dateOfBirth, address, phoneNumber, desiredStartDate, singleSessionPrice, salesMemberId, agreedToTerms: false, status: "trial", customerType, note });
  await logActivity({ action: "create", entityType: "customer", entityId: created.id, summary: `顧客を追加: ${fullName}` });
  revalidatePath("/master/customers");
}

export async function updateCustomerAction(id: string, formData: FormData) {
  await requireAdmin();
  const fullName         = (formData.get("fullName")         as string)?.trim();
  const email            = (formData.get("email")            as string)?.trim();
  const dateOfBirth      = (formData.get("dateOfBirth")      as string)?.trim();
  const address          = (formData.get("address")          as string)?.trim();
  const phoneNumber      = (formData.get("phoneNumber")      as string)?.trim();
  const desiredStartDate = (formData.get("desiredStartDate") as string)?.trim();
  const customerType     = ((formData.get("customerType") as string)?.trim() || "individual") as CustomerType;
  const note             = (formData.get("note")             as string)?.trim() || undefined;
  const sspRaw           = (formData.get("singleSessionPrice") as string)?.trim();
  const singleSessionPrice = sspRaw ? parseInt(sspRaw, 10) : null;
  const salesMemberId    = (formData.get("salesMemberId")   as string)?.trim() || null;
  const billingName      = (formData.get("billingName")    as string)?.trim() || null;
  const billingToCustomerId = (formData.get("billingToCustomerId") as string)?.trim() || null;

  if (!fullName || !email || !dateOfBirth) return;

  await updateCustomer(id, { fullName, email, dateOfBirth, address, phoneNumber, desiredStartDate, customerType, note, singleSessionPrice, salesMemberId, billingName, billingToCustomerId });
  await logActivity({ action: "update", entityType: "customer", entityId: id, summary: `顧客を編集: ${fullName}` });
  revalidatePath("/master/customers");
  revalidatePath("/invoices");
}

export async function updateCustomerStatusAction(id: string, status: CustomerStatus) {
  await requireAdmin();
  await updateCustomer(id, { status });
  await logActivity({ action: "update", entityType: "customer", entityId: id, summary: `顧客ステータスを変更: ${STATUS_LABEL[status]}` });
  revalidatePath("/master/customers");
}

export async function deleteCustomerAction(id: string) {
  await requireAdmin();
  await deleteCustomer(id);
  await logActivity({ action: "delete", entityType: "customer", entityId: id, summary: "顧客を削除" });
  revalidatePath("/master/customers");
}

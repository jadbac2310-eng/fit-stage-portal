"use server";

import { revalidatePath } from "next/cache";
import { addCustomer, updateCustomer, deleteCustomer } from "@/lib/customers";
import { requireAdmin } from "@/lib/members";
import type { CustomerStatus, CustomerType } from "@/lib/customers-types";

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

  if (!fullName || !email || !dateOfBirth) return;

  await addCustomer({ fullName, email, dateOfBirth, address, phoneNumber, desiredStartDate, agreedToTerms: false, status: "trial", customerType, note });
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

  if (!fullName || !email || !dateOfBirth) return;

  await updateCustomer(id, { fullName, email, dateOfBirth, address, phoneNumber, desiredStartDate, customerType, note });
  revalidatePath("/master/customers");
}

export async function updateCustomerStatusAction(id: string, status: CustomerStatus) {
  await requireAdmin();
  await updateCustomer(id, { status });
  revalidatePath("/master/customers");
}

export async function deleteCustomerAction(id: string) {
  await requireAdmin();
  await deleteCustomer(id);
  revalidatePath("/master/customers");
}

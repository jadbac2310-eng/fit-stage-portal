"use server";

import { revalidatePath } from "next/cache";
import { addCustomer, updateCustomer, deleteCustomer } from "@/lib/customers";
import { addSessionPass, deleteSessionPass } from "@/lib/session-passes";
import type { CustomerStatus, CustomerType } from "@/lib/customers-types";

export async function createCustomerAction(formData: FormData) {
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
  await updateCustomer(id, { status });
  revalidatePath("/master/customers");
}

export async function deleteCustomerAction(id: string) {
  await deleteCustomer(id);
  revalidatePath("/master/customers");
}

export async function createSessionPassAction(formData: FormData) {
  const customerId  = (formData.get("customerId")  as string)?.trim();
  const totalCount  = parseInt((formData.get("totalCount") as string)?.trim(), 10);
  const purchasedAt = (formData.get("purchasedAt") as string)?.trim();
  const expiredAt   = (formData.get("expiredAt")   as string)?.trim() || undefined;
  const note        = (formData.get("note")        as string)?.trim() || undefined;

  if (!customerId || !totalCount || !purchasedAt) return;

  await addSessionPass({ customerId, totalCount, purchasedAt, expiredAt, note });
  revalidatePath("/master/customers");
  revalidatePath("/lessons/regular");
}

export async function deleteSessionPassAction(id: string) {
  await deleteSessionPass(id);
  revalidatePath("/master/customers");
  revalidatePath("/lessons/regular");
}

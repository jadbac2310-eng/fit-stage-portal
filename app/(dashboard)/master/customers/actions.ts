"use server";

import { revalidatePath } from "next/cache";
import { addCustomer, updateCustomer, deleteCustomer } from "@/lib/customers";
import type { CustomerPlan, CustomerStatus } from "@/lib/customers-types";

export async function createCustomerAction(formData: FormData) {
  const fullName         = (formData.get("fullName")         as string)?.trim();
  const email            = (formData.get("email")            as string)?.trim();
  const dateOfBirth      = (formData.get("dateOfBirth")      as string)?.trim();
  const address          = (formData.get("address")          as string)?.trim();
  const phoneNumber      = (formData.get("phoneNumber")      as string)?.trim();
  const planRaw          = (formData.get("plan")             as string)?.trim();
  const desiredStartDate = (formData.get("desiredStartDate") as string)?.trim();
  const note             = (formData.get("note")             as string)?.trim() || undefined;
  const agreedToTerms    = formData.get("agreedToTerms") === "on";
  const status           = ((formData.get("status") as string)?.trim() || "trial") as CustomerStatus;
  const plan             = planRaw ? planRaw as CustomerPlan : undefined;

  if (!fullName || !email || !dateOfBirth || !address || !phoneNumber || !desiredStartDate) return;

  await addCustomer({ fullName, email, dateOfBirth, address, phoneNumber, plan, desiredStartDate, agreedToTerms, status, note });
  revalidatePath("/master/customers");
}

export async function updateCustomerAction(id: string, formData: FormData) {
  const fullName         = (formData.get("fullName")         as string)?.trim();
  const email            = (formData.get("email")            as string)?.trim();
  const dateOfBirth      = (formData.get("dateOfBirth")      as string)?.trim();
  const address          = (formData.get("address")          as string)?.trim();
  const phoneNumber      = (formData.get("phoneNumber")      as string)?.trim();
  const planRaw          = (formData.get("plan")             as string)?.trim();
  const desiredStartDate = (formData.get("desiredStartDate") as string)?.trim();
  const status           = (formData.get("status")           as string)?.trim() as CustomerStatus;
  const note             = (formData.get("note")             as string)?.trim() || undefined;
  const agreedToTerms    = formData.get("agreedToTerms") === "on";
  const plan             = planRaw ? planRaw as CustomerPlan : undefined;

  if (!fullName || !email || !dateOfBirth || !address || !phoneNumber || !desiredStartDate) return;

  await updateCustomer(id, { fullName, email, dateOfBirth, address, phoneNumber, plan, desiredStartDate, agreedToTerms, status, note });
  revalidatePath("/master/customers");
}

export async function deleteCustomerAction(id: string) {
  await deleteCustomer(id);
  revalidatePath("/master/customers");
}

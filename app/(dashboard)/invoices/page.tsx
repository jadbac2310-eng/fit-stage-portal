import { getCustomers } from "@/lib/customers";
import { getAllCustomerPlans } from "@/lib/customer-plans";
import { getAllSessionPasses } from "@/lib/session-passes";
import { getLessons } from "@/lib/lessons";
import { getAllPlans, planUnitPrice } from "@/lib/plans-master";
import { getCurrentMember } from "@/lib/members";
import { billingGroups, buildGroupInvoice } from "@/lib/invoices";
import { InvoicesClient } from "./invoices-client";

export const dynamic = "force-dynamic";

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const member = await getCurrentMember();
  if (!member?.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-6 text-center">
        <p className="text-4xl">🧾</p>
        <p className="text-sm font-semibold text-gray-600">権限がありません</p>
        <p className="text-xs text-gray-400">請求書の発行は管理者のみ可能です</p>
      </div>
    );
  }

  const { month: monthParam } = await searchParams;
  const month = monthParam || currentMonth();

  const [customers, plans, passes, lessons, plansMaster] = await Promise.all([
    getCustomers(),
    getAllCustomerPlans(),
    getAllSessionPasses(),
    getLessons(),
    getAllPlans(),
  ]);

  const singleMaster = plansMaster.find((p) => p.paymentType === "single");
  const singleFee = singleMaster ? planUnitPrice(singleMaster) : 0;

  const invoices = billingGroups(customers)
    .map((g) => buildGroupInvoice(g.biller, g.members, month, { plans, passes, lessons }, singleFee))
    .filter((inv) => inv.total > 0)
    .sort((a, b) => a.customerName.localeCompare(b.customerName, "ja"));

  return <InvoicesClient invoices={invoices} month={month} />;
}

import { getCurrentIsAdmin, getMembers } from "@/lib/members";
import { getCustomers } from "@/lib/customers";
import { getMemberCustomerRates } from "@/lib/commission-rates";
import { RatesClient } from "./rates-client";

export const dynamic = "force-dynamic";

export default async function CommissionRatesPage() {
  const isAdmin = await getCurrentIsAdmin();

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-4xl">🔒</p>
        <p className="text-sm font-semibold text-gray-600">管理者のみ閲覧できます</p>
      </div>
    );
  }

  const [members, customers, rates] = await Promise.all([
    getMembers(),
    getCustomers(),
    getMemberCustomerRates(),
  ]);

  return (
    <RatesClient
      members={members.map((m) => ({ id: m.id, name: m.name, avatarUrl: m.avatarUrl }))}
      customers={customers.map((c) => ({ id: c.id, name: c.fullName }))}
      rates={rates.map((r) => ({ memberId: r.memberId, customerId: r.customerId, rate: r.rate }))}
    />
  );
}

import { getCustomerMonthlyItems } from "@/lib/customer-monthly-items";
import { getCustomers } from "@/lib/customers";
import { getCurrentIsAdmin } from "@/lib/members";
import { MonthlyItemsClient } from "./monthly-items-client";

export const dynamic = "force-dynamic";

export default async function MonthlyItemsPage() {
  const [items, customers, isAdmin] = await Promise.all([
    getCustomerMonthlyItems(),
    getCustomers(),
    getCurrentIsAdmin(),
  ]);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-4xl">🔒</p>
        <p className="text-sm font-semibold text-gray-600">管理者のみ閲覧できます</p>
      </div>
    );
  }

  return (
    <MonthlyItemsClient
      items={items}
      customers={customers.map((c) => ({ id: c.id, name: c.fullName }))}
      isAdmin={isAdmin}
    />
  );
}

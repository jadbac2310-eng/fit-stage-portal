import { getCustomers } from "@/lib/customers";
import { getCurrentIsAdmin, getMembers } from "@/lib/members";
import { getFctStores } from "@/lib/fct-stores";
import { CustomersClient } from "./customers-client";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const [customers, isAdmin, members, fctStores] = await Promise.all([
    getCustomers(),
    getCurrentIsAdmin(),
    getMembers(),
    getFctStores(),
  ]);

  // FCTの歩合率は店舗ごとに違う（直営45% / 豊中千里50%）。
  // 顧客の画面では会場が決まらないので、ある率ぶんだけ見込みを出せるように渡す。
  const fctRates = Array.from(new Set(fctStores.map((f) => f.rate))).sort((a, b) => a - b);
  return (
    <CustomersClient
      customers={customers}
      isAdmin={isAdmin}
      members={members.map((m) => ({ id: m.id, name: m.name, role: m.role }))}
      fctRates={fctRates}
    />
  );
}

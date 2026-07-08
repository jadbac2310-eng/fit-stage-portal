import { getLessons } from "@/lib/lessons";
import { getCustomers } from "@/lib/customers";
import { getMembers, getCurrentMember } from "@/lib/members";
import { getAllSessionPasses } from "@/lib/session-passes";
import { getAllCustomerPlans } from "@/lib/customer-plans";
import { getRentalGyms } from "@/lib/rental-gyms";
import { getStores } from "@/lib/stores";
import { RegularLessonsClient } from "./regular-lessons-client";

export const dynamic = "force-dynamic";

export default async function RegularLessonsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  async function safe<T>(label: string, fn: () => Promise<T>): Promise<{ label: string; value?: T; error?: unknown }> {
    try { return { label, value: await fn() }; }
    catch (e) { return { label, error: e }; }
  }
  const results = await Promise.all([
    safe("getLessons", getLessons),
    safe("getCustomers", getCustomers),
    safe("getMembers", getMembers),
    safe("getAllSessionPasses", getAllSessionPasses),
    safe("getAllCustomerPlans", getAllCustomerPlans),
    safe("getRentalGyms", getRentalGyms),
    safe("getStores", getStores),
    safe("getCurrentMember", getCurrentMember),
  ]);
  const failed = results.filter((r) => r.error);
  if (failed.length > 0) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <p className="text-sm font-bold text-red-600 mb-2">データ取得エラー（この内容を共有してください）</p>
        {failed.map((r) => {
          const e = r.error as Error;
          return (
            <pre key={r.label} className="text-[11px] whitespace-pre-wrap break-all bg-red-50 border border-red-200 rounded-xl p-3 mb-2 text-red-800">
              {r.label}{"\n"}{JSON.stringify(e, Object.getOwnPropertyNames(e), 2)}
            </pre>
          );
        })}
      </div>
    );
  }
  const lessons       = results[0].value as Awaited<ReturnType<typeof getLessons>>;
  const customers     = results[1].value as Awaited<ReturnType<typeof getCustomers>>;
  const members       = results[2].value as Awaited<ReturnType<typeof getMembers>>;
  const sessionPasses = results[3].value as Awaited<ReturnType<typeof getAllSessionPasses>>;
  const customerPlans = results[4].value as Awaited<ReturnType<typeof getAllCustomerPlans>>;
  const rentalGyms    = results[5].value as Awaited<ReturnType<typeof getRentalGyms>>;
  const stores        = results[6].value as Awaited<ReturnType<typeof getStores>>;
  const member        = results[7].value as Awaited<ReturnType<typeof getCurrentMember>>;
  return (
    <RegularLessonsClient
      lessons={lessons}
      customers={customers}
      members={members}
      sessionPasses={sessionPasses}
      customerPlans={customerPlans}
      rentalGyms={rentalGyms}
      stores={stores}
      isAdmin={member?.isAdmin ?? false}
      currentMemberId={member?.id}
      initialSearch={q ?? ""}
    />
  );
}

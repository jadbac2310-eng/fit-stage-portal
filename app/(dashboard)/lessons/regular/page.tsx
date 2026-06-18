import { getLessons } from "@/lib/lessons";
import { getCustomers } from "@/lib/customers";
import { getMembers, getCurrentMember } from "@/lib/members";
import { getAllSessionPasses } from "@/lib/session-passes";
import { getAllCustomerPlans } from "@/lib/customer-plans";
import { getRentalGyms } from "@/lib/rental-gyms";
import { RegularLessonsClient } from "./regular-lessons-client";

export const dynamic = "force-dynamic";

export default async function RegularLessonsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ q }, lessons, customers, members, sessionPasses, customerPlans, rentalGyms, member] = await Promise.all([
    searchParams,
    getLessons(),
    getCustomers(),
    getMembers(),
    getAllSessionPasses(),
    getAllCustomerPlans(),
    getRentalGyms(),
    getCurrentMember(),
  ]);
  return (
    <RegularLessonsClient
      lessons={lessons}
      customers={customers}
      members={members}
      sessionPasses={sessionPasses}
      customerPlans={customerPlans}
      rentalGyms={rentalGyms}
      isAdmin={member?.isAdmin ?? false}
      currentMemberId={member?.id}
      initialSearch={q ?? ""}
    />
  );
}

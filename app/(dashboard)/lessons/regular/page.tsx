import { getLessons } from "@/lib/lessons";
import { getCustomers } from "@/lib/customers";
import { getMembers, getCurrentMember } from "@/lib/members";
import { getAllSessionPasses } from "@/lib/session-passes";
import { getAllCustomerPlans } from "@/lib/customer-plans";
import { RegularLessonsClient } from "./regular-lessons-client";

export const dynamic = "force-dynamic";

export default async function RegularLessonsPage() {
  const [lessons, customers, members, sessionPasses, customerPlans, member] = await Promise.all([
    getLessons(),
    getCustomers(),
    getMembers(),
    getAllSessionPasses(),
    getAllCustomerPlans(),
    getCurrentMember(),
  ]);
  return (
    <RegularLessonsClient
      lessons={lessons}
      customers={customers}
      members={members}
      sessionPasses={sessionPasses}
      customerPlans={customerPlans}
      isAdmin={member?.isAdmin ?? false}
      currentMemberId={member?.id}
    />
  );
}

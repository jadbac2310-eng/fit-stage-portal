import { getLessons } from "@/lib/lessons";
import { getCustomers } from "@/lib/customers";
import { getMembers, getCurrentIsAdmin } from "@/lib/members";
import { getAllSessionPasses } from "@/lib/session-passes";
import { RegularLessonsClient } from "./regular-lessons-client";

export const dynamic = "force-dynamic";

export default async function RegularLessonsPage() {
  const [lessons, customers, members, sessionPasses, isAdmin] = await Promise.all([
    getLessons(),
    getCustomers(),
    getMembers(),
    getAllSessionPasses(),
    getCurrentIsAdmin(),
  ]);
  return (
    <RegularLessonsClient
      lessons={lessons}
      customers={customers}
      members={members}
      sessionPasses={sessionPasses}
      isAdmin={isAdmin}
    />
  );
}

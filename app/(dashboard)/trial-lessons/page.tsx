import { getTrialLessons } from "@/lib/trial-lessons";
import { getCustomers } from "@/lib/customers";
import { getMembers, getCurrentIsAdmin } from "@/lib/members";
import { TrialLessonsClient } from "./trial-lessons-client";

export const dynamic = "force-dynamic";

export default async function TrialLessonsPage() {
  const [lessons, customers, members, isAdmin] = await Promise.all([
    getTrialLessons(),
    getCustomers(),
    getMembers(),
    getCurrentIsAdmin(),
  ]);
  return (
    <TrialLessonsClient
      lessons={lessons}
      customers={customers}
      members={members}
      isAdmin={isAdmin}
    />
  );
}

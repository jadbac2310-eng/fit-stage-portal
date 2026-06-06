import { getLessons } from "@/lib/lessons";
import { getCustomers } from "@/lib/customers";
import { getMembers, getCurrentIsAdmin } from "@/lib/members";
import { RegularLessonsClient } from "./regular-lessons-client";

export const dynamic = "force-dynamic";

export default async function RegularLessonsPage() {
  const [lessons, customers, members, isAdmin] = await Promise.all([
    getLessons(),
    getCustomers(),
    getMembers(),
    getCurrentIsAdmin(),
  ]);
  return (
    <RegularLessonsClient
      lessons={lessons}
      customers={customers}
      members={members}
      isAdmin={isAdmin}
    />
  );
}

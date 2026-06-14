import { getTrialLessons } from "@/lib/trial-lessons";
import { getCustomers } from "@/lib/customers";
import { getMembers, getCurrentMember } from "@/lib/members";
import { collectExerciseNames } from "@/lib/exercise-types";
import { TrialLessonsClient } from "./trial-lessons-client";

export const dynamic = "force-dynamic";

export default async function TrialLessonsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; report?: string }>;
}) {
  const [{ q, report }, lessons, customers, members, currentMember] = await Promise.all([
    searchParams,
    getTrialLessons(),
    getCustomers(),
    getMembers(),
    getCurrentMember(),
  ]);
  return (
    <TrialLessonsClient
      lessons={lessons}
      customers={customers}
      members={members}
      isAdmin={currentMember?.isAdmin ?? false}
      currentMemberId={currentMember?.id}
      initialSearch={q ?? ""}
      openReportId={report}
      pastExerciseNames={collectExerciseNames(lessons.map((l) => l.exercises))}
    />
  );
}

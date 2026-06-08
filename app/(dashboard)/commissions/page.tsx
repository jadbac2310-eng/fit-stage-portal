import { getCustomers } from "@/lib/customers";
import { getLessons } from "@/lib/lessons";
import { getTrialLessons } from "@/lib/trial-lessons";
import { CommissionsClient } from "./commissions-client";

export const dynamic = "force-dynamic";

export default async function CommissionsPage() {
  const [customers, lessons, trialLessons] = await Promise.all([
    getCustomers(),
    getLessons(),
    getTrialLessons(),
  ]);

  const completedLessons   = lessons.filter((l) => l.status === "completed");
  const contractedTrials   = trialLessons.filter((l) => l.contracted === true);

  return (
    <CommissionsClient
      customers={customers}
      lessons={completedLessons}
      trialLessons={contractedTrials}
    />
  );
}

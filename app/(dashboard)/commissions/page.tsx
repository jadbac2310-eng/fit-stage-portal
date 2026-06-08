import { getCustomers } from "@/lib/customers";
import { getLessons } from "@/lib/lessons";
import { getTrialLessons } from "@/lib/trial-lessons";
import { getCurrentIsAdmin } from "@/lib/members";
import { CommissionsClient } from "./commissions-client";

export const dynamic = "force-dynamic";

export default async function CommissionsPage() {
  const isAdmin = await getCurrentIsAdmin();

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-4xl">🔒</p>
        <p className="text-sm font-semibold text-gray-600">管理者のみ閲覧できます</p>
      </div>
    );
  }

  const [customers, lessons, trialLessons] = await Promise.all([
    getCustomers(),
    getLessons(),
    getTrialLessons(),
  ]);

  const completedLessons = lessons.filter((l) => l.status === "completed");
  const contractedTrials = trialLessons.filter((l) => l.contracted === true);

  return (
    <CommissionsClient
      customers={customers}
      lessons={completedLessons}
      trialLessons={contractedTrials}
    />
  );
}

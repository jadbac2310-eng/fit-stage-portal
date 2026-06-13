import { getCustomers } from "@/lib/customers";
import { getLessons } from "@/lib/lessons";
import { getTrialLessons } from "@/lib/trial-lessons";
import { getCurrentMember } from "@/lib/members";
import { CommissionsClient } from "./commissions-client";

export const dynamic = "force-dynamic";

export default async function CommissionsPage() {
  const member = await getCurrentMember();

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-6 text-center">
        <p className="text-4xl">💰</p>
        <p className="text-sm font-semibold text-gray-600">担当者アカウントに紐づいていません</p>
        <p className="text-xs text-gray-400">管理者に担当者の割り当てを依頼してください</p>
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
      isAdmin={member.isAdmin}
      currentMemberId={member.id}
    />
  );
}

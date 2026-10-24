import { getCurrentMember, getMembers } from "@/lib/members";
import { getCommissionAdjustments } from "@/lib/commission-adjustments";
import { AdjustmentsClient } from "./adjustments-client";

export const dynamic = "force-dynamic";

export default async function CommissionAdjustmentsPage() {
  const member = await getCurrentMember();
  if (!member?.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-6 text-center">
        <p className="text-4xl">🔒</p>
        <p className="text-sm font-semibold text-gray-600">管理者のみ閲覧できます</p>
      </div>
    );
  }

  const [members, adjustments] = await Promise.all([getMembers(), getCommissionAdjustments()]);

  return (
    <AdjustmentsClient
      adjustments={adjustments}
      members={members.map((m) => ({ id: m.id, name: m.name, avatarUrl: m.avatarUrl }))}
    />
  );
}

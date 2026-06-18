import { getCurrentIsAdmin, getMembers } from "@/lib/members";
import { getActivityLogs } from "@/lib/activity-logs";
import { ActivityClient } from "./activity-client";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const isAdmin = await getCurrentIsAdmin();
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-4xl">🔒</p>
        <p className="text-sm font-semibold text-gray-600">管理者のみ閲覧できます</p>
      </div>
    );
  }

  const [logs, members] = await Promise.all([
    getActivityLogs({ limit: 500 }),
    getMembers(),
  ]);

  return (
    <ActivityClient
      logs={logs}
      members={members.map((m) => ({ id: m.id, name: m.name }))}
    />
  );
}

import { getSalesTargets, getSalesTargetLogs } from "@/lib/sales-targets";
import { getMembers, getCurrentMember } from "@/lib/members";
import { SalesClient } from "./sales-client";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const [targets, logs, members, me] = await Promise.all([
    getSalesTargets(), getSalesTargetLogs(), getMembers(), getCurrentMember(),
  ]);
  return (
    <SalesClient
      targets={targets}
      logs={logs}
      members={members.map((m) => ({ id: m.id, name: m.name, avatarUrl: m.avatarUrl }))}
      meId={me?.id}
      isAdmin={me?.isAdmin ?? false}
    />
  );
}

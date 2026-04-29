import { getMembers, getCurrentIsAdmin, getCurrentMember } from "@/lib/members";
import { MembersClient } from "./members-client";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const [members, isAdmin, currentMember] = await Promise.all([
    getMembers(), getCurrentIsAdmin(), getCurrentMember(),
  ]);
  return <MembersClient members={members} isAdmin={isAdmin} currentMemberId={currentMember?.id} />;
}

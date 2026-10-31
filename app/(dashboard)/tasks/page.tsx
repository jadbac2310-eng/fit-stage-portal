import { getTasks } from "@/lib/tasks";
import { getMembers, getCurrentMember } from "@/lib/members";
import { TasksClient } from "./tasks-client";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const [tasks, members, me] = await Promise.all([getTasks(), getMembers(), getCurrentMember()]);
  return (
    <TasksClient
      tasks={tasks}
      members={members.map((m) => ({ id: m.id, name: m.name, avatarUrl: m.avatarUrl }))}
      meId={me?.id}
      isAdmin={me?.isAdmin ?? false}
    />
  );
}

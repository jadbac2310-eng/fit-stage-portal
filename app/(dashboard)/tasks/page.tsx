import { getTasks } from "@/lib/tasks";
import { getMembers, getCurrentMember } from "@/lib/members";
import { canSeeCompanyTasks } from "@/lib/tasks-types";
import { TasksClient } from "./tasks-client";

export const dynamic = "force-dynamic";

/**
 * やること。代表・管理者は会社のやること、それ以外の人は自分だけのやることを見る（2026-11-13）。
 * 会社のやることは、ほかの人の画面には1件も出さない。
 */
export default async function TasksPage() {
  const me = await getCurrentMember();
  const company = canSeeCompanyTasks(me);
  const [tasks, members] = await Promise.all([
    company ? getTasks() : me ? getTasks({ ownerId: me.id }) : Promise.resolve([]),
    getMembers(),
  ]);
  return (
    <TasksClient
      tasks={tasks}
      // 会社のやることの担当に選べるのは代表・管理者だけ（担当にするとその人のスケジュールに入り、中身が見えるため）
      members={members.filter((m) => canSeeCompanyTasks(m)).map((m) => ({ id: m.id, name: m.name, avatarUrl: m.avatarUrl }))}
      meId={me?.id}
      isAdmin={me?.isAdmin ?? false}
      personal={!company}
    />
  );
}

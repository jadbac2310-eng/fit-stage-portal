import { getTodos } from "@/lib/todos";
import { getMembers, getCurrentMember } from "@/lib/members";
import { TodoClient } from "./todo-client";

export const dynamic = "force-dynamic";

export default async function TodoPage() {
  const [todos, members, currentMember] = await Promise.all([getTodos(), getMembers(), getCurrentMember()]);
  return <TodoClient todos={todos} members={members} currentMemberId={currentMember?.id} />;
}

import { getTodos } from "@/lib/todos";
import { getMembers } from "@/lib/members";
import { TodoClient } from "./todo-client";

export const dynamic = "force-dynamic";

export default async function TodoPage() {
  const [todos, members] = await Promise.all([getTodos(), getMembers()]);
  return <TodoClient todos={todos} members={members} />;
}

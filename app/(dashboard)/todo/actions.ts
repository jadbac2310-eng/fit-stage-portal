"use server";

import { revalidatePath } from "next/cache";
import { addTodo, toggleTodo, deleteTodo, updateTodo, Priority } from "@/lib/todos";
import { getCurrentMember, requireAdmin } from "@/lib/members";

export async function createTodo(formData: FormData) {
  await requireAdmin();
  const title       = (formData.get("title")       as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const priority    = (formData.get("priority")    as Priority) || "medium";
  const assignedToId = (formData.get("assignedToId") as string) || undefined;

  if (!title) return;

  const currentMember = await getCurrentMember();
  await addTodo({
    title,
    description: description || undefined,
    priority,
    createdById:  currentMember?.id,
    assignedToId: assignedToId || undefined,
  });
  revalidatePath("/todo");
  revalidatePath("/dashboard");
}

export async function toggleTodoAction(id: string) {
  await requireAdmin();
  const currentMember = await getCurrentMember();
  await toggleTodo(id, currentMember?.id);
  revalidatePath("/todo");
  revalidatePath("/dashboard");
}

export async function deleteTodoAction(id: string) {
  await requireAdmin();
  await deleteTodo(id);
  revalidatePath("/todo");
  revalidatePath("/dashboard");
}

export async function updateTodoAction(
  id: string,
  data: { title?: string; description?: string; priority?: Priority; assignedToId?: string | null }
) {
  await requireAdmin();
  await updateTodo(id, data);
  revalidatePath("/todo");
}

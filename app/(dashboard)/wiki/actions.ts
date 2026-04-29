"use server";

import { redirect } from "next/navigation";
import { deleteWikiPage, createWikiFolder, deleteWikiFolder } from "@/lib/wiki";
import { getCurrentIsAdmin } from "@/lib/members";

export async function deleteWikiPageAction(slug: string, folder: string) {
  if (!(await getCurrentIsAdmin())) throw new Error("権限がありません");
  await deleteWikiPage(slug);
  redirect(`/wiki/${encodeURIComponent(folder)}`);
}

export async function createFolderAction(name: string): Promise<void> {
  await createWikiFolder(name);
}

export async function deleteFolderAction(name: string): Promise<void> {
  if (!(await getCurrentIsAdmin())) throw new Error("権限がありません");
  await deleteWikiFolder(name);
  redirect("/wiki");
}

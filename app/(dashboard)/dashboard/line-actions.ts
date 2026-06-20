"use server";

import { revalidatePath } from "next/cache";
import { getCurrentMember, setMemberLineUserId, resetMemberLinkCode } from "@/lib/members";

export async function unlinkLineAction() {
  const m = await getCurrentMember();
  if (!m) throw new Error("ログインが必要です");
  await setMemberLineUserId(m.id, null);
  revalidatePath("/dashboard");
}

export async function regenerateLinkCodeAction() {
  const m = await getCurrentMember();
  if (!m) throw new Error("ログインが必要です");
  await resetMemberLinkCode(m.id);
  revalidatePath("/dashboard");
}

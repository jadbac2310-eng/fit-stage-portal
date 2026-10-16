"use server";

import { revalidatePath } from "next/cache";
import { getCurrentMember } from "@/lib/members";
import { toggleKudo } from "@/lib/kudos";
import { runAction, ActionError, type ActionResult } from "@/lib/action-result";

/** 今日のチームの誰かに「👏」を送る／取り消す */
export async function toggleKudoAction(toMemberId: string, day: string): Promise<ActionResult> {
  return runAction(async () => {
    const me = await getCurrentMember();
    if (!me) throw new ActionError("担当者アカウントに紐づいていません");
    if (me.id === toMemberId) throw new ActionError("自分には押せません");
    await toggleKudo(me.id, toMemberId, day);
    revalidatePath("/dashboard");
  });
}

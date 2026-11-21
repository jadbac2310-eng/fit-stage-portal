"use server";

import { revalidatePath } from "next/cache";
import { getCurrentMember } from "@/lib/members";
import { ActionError, runAction, type ActionResult } from "@/lib/action-result";
import { setHumanCategory, setKillSwitch, setMonthlyBudget } from "@/lib/ai-mail";
import { MAIL_CATEGORIES, type MailCategory } from "@/lib/ai-mail-types";

/** AIメール担当の操作は代表・管理者だけ */
async function requireOwnerOrAdmin() {
  const me = await getCurrentMember();
  if (!me || !(me.isOwner || me.isAdmin)) throw new ActionError("代表・管理者だけが操作できます");
  return me;
}

export async function setKillSwitchAction(on: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireOwnerOrAdmin();
    const ok = await setKillSwitch(on, `portal:${me.name}`, on ? "ポータルの停止ボタン" : undefined);
    if (!ok) throw new ActionError("データベースの準備がまだです（SQL を実行してください）");
    revalidatePath("/ai-mail");
  });
}

export async function setBudgetAction(usd: number): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireOwnerOrAdmin();
    if (!Number.isFinite(usd) || usd < 0 || usd > 200) throw new ActionError("月の上限は 0〜200 ドルで入れてください");
    const ok = await setMonthlyBudget(Math.round(usd * 100) / 100, `portal:${me.name}`);
    if (!ok) throw new ActionError("データベースの準備がまだです（SQL を実行してください）");
    revalidatePath("/ai-mail");
  });
}

export async function setHumanCategoryAction(id: string, category: MailCategory | null, note?: string): Promise<ActionResult> {
  return runAction(async () => {
    const me = await requireOwnerOrAdmin();
    if (category !== null && !MAIL_CATEGORIES.includes(category)) throw new ActionError("仕分けの種類が正しくありません");
    await setHumanCategory(id, category, me.name, note);
    revalidatePath("/ai-mail");
  });
}

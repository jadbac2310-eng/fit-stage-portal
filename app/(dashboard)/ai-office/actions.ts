"use server";

import { revalidatePath } from "next/cache";
import { addTask } from "@/lib/tasks";
import { canSeeCompanyTasks } from "@/lib/tasks-types";
import { getCurrentMember } from "@/lib/members";
import { logActivity } from "@/lib/activity-logs";
import { ActionError } from "@/lib/action-result";
import { deptByKey, orderTitle, type OrderDeptKey } from "@/lib/ai-orders";
import { classifyOrder } from "@/lib/ai-orders-classify";
import { AI_DEPARTMENTS, CHIEF } from "./departments";

/**
 * 統括本部長に指示を出す（AI部署の画面から）。担当の部署を決めて、会社のやることに「【部署名】題名」で入れる。
 * 出せるのは代表・管理者（会社のやることが見える人）だけ。
 */
export type SubmitOrderResult =
  | { ok: true; deptName: string; title: string; by: "ai" | "rule" | "chosen" }
  | { ok: false; error: string };

export async function submitOrderAction(input: { text: string; dept: OrderDeptKey | "auto"; dueOn?: string }): Promise<SubmitOrderResult> {
  try {
    const me = await getCurrentMember();
    if (!me || !canSeeCompanyTasks(me)) throw new ActionError("指示を出せるのは代表・管理者だけです");
    const text = input.text.trim();
    if (!text) throw new ActionError("指示の内容を書いてください");
    if (text.length > 2000) throw new ActionError("指示は2000字までにしてください");
    const dueOn = input.dueOn && /^\d{4}-\d{2}-\d{2}$/.test(input.dueOn) ? input.dueOn : null;

    const c = await classifyOrder(text);
    const deptKey: OrderDeptKey = input.dept !== "auto" && deptByKey(input.dept) ? input.dept : c.dept;
    const dept = deptByKey(deptKey)!;
    const head = AI_DEPARTMENTS.find((d) => d.key === deptKey);
    const jst = new Date(Date.now() + 9 * 3600 * 1000);
    const memo = [
      `社長からの指示（${jst.getUTCMonth() + 1}/${jst.getUTCDate()}）`,
      text,
      "",
      `担当：${dept.name}${head ? ` ${head.personName}${head.title}` : ""}（${CHIEF.fullTitle} ${CHIEF.personName}が振り分け）`,
    ].join("\n");

    await addTask({
      title: orderTitle(deptKey, c.title),
      category: dept.category,
      assigneeId: null,
      dueOn,
      memo,
      createdBy: me.id,
    });
    await logActivity({ action: "create", entityType: "task", summary: `AI部署へ指示: 【${dept.name}】${c.title}`, memberId: me.id, memberName: me.name });
    revalidatePath("/ai-office");
    revalidatePath("/tasks");
    return { ok: true, deptName: dept.name, title: c.title, by: input.dept !== "auto" ? "chosen" : c.by };
  } catch (e) {
    if (e instanceof ActionError) return { ok: false, error: e.message };
    console.error("[ai-office] 指示の受付に失敗", e);
    return { ok: false, error: "受け付けられませんでした。時間をおいてもう一度試してください" };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { getCurrentMember } from "@/lib/members";
import { markReportSent, unmarkReportSent } from "@/lib/report-deliveries";
import { logActivity } from "@/lib/activity-logs";

// 月次レポートを「送付済み」にする
export async function markReportSentAction(customerId: string, period: string, customerName?: string) {
  const member = await getCurrentMember();
  if (!member) throw new Error("ログインが必要です");
  await markReportSent({ customerId, period, channel: "line" });
  await logActivity({
    action: "report", entityType: "report_delivery", entityId: customerId,
    summary: `月次レポートを送付済みに: ${customerName ?? ""}（${period}）`,
    memberId: member.id, memberName: member.name,
  });
  revalidatePath("/reports/monthly");
}

// 送付記録を取り消す（未送付に戻す）
export async function unmarkReportSentAction(customerId: string, period: string) {
  const member = await getCurrentMember();
  if (!member) throw new Error("ログインが必要です");
  await unmarkReportSent(customerId, period);
  revalidatePath("/reports/monthly");
}

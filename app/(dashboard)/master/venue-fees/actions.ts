"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/members";
import { logActivity } from "@/lib/activity-logs";
import { runAction, ActionError, type ActionResult } from "@/lib/action-result";
import { setCustomerVenueFee, deleteCustomerVenueFee } from "@/lib/customer-venue-fees";
import type { VenueKind } from "@/lib/lessons-types";

const KINDS: VenueKind[] = ["gym", "fct", "avenir", "store"];

export async function setVenueFeeAction(formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    const customerId = (formData.get("customerId") as string)?.trim();
    const venue      = (formData.get("venue")      as string)?.trim();  // "fct:<id>" の形
    const feeRaw     = (formData.get("fee")        as string)?.trim();
    const fee        = feeRaw ? parseInt(feeRaw, 10) : NaN;

    if (!customerId) throw new ActionError("顧客を選択してください");
    if (!venue)      throw new ActionError("会場を選択してください");
    if (!Number.isFinite(fee) || fee < 0) throw new ActionError("料金を入力してください");

    const [kind, venueId] = venue.split(":");
    if (!KINDS.includes(kind as VenueKind) || !venueId) throw new ActionError("会場を選択してください");

    await setCustomerVenueFee(customerId, kind as VenueKind, venueId, fee);
    await logActivity({
      action: "update", entityType: "customer", entityId: customerId,
      summary: `顧客ごとの会場料金を設定: ¥${fee.toLocaleString("ja-JP")}`,
    });
    revalidatePath("/master/venue-fees");
  });
}

export async function deleteVenueFeeAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireAdmin();
    await deleteCustomerVenueFee(id);
    await logActivity({ action: "delete", entityType: "customer", entityId: id, summary: "顧客ごとの会場料金を削除" });
    revalidatePath("/master/venue-fees");
  });
}

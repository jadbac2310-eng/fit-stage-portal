"use server";

import { revalidatePath } from "next/cache";
import {
  setMembershipApplicationStatus,
  deleteMembershipApplication,
} from "@/lib/membership-applications";
import { requireAdmin } from "@/lib/members";
import { logActivity } from "@/lib/activity-logs";
import { APPLICATION_STATUS_LABEL, type ApplicationStatus } from "@/lib/membership-applications-types";

export async function setApplicationStatusAction(id: string, status: ApplicationStatus) {
  await setMembershipApplicationStatus(id, status);
  await logActivity({
    action: "update",
    entityType: "membership_application",
    entityId: id,
    summary: `入会申し込みを${APPLICATION_STATUS_LABEL[status]}に変更`,
  });
  revalidatePath("/master/applications");
}

/** 申込書は契約の記録なので、消せるのは管理者だけにする */
export async function deleteApplicationAction(id: string, name: string) {
  await requireAdmin();
  await deleteMembershipApplication(id);
  await logActivity({
    action: "delete",
    entityType: "membership_application",
    entityId: id,
    summary: `入会申し込みを削除: ${name}`,
  });
  revalidatePath("/master/applications");
}

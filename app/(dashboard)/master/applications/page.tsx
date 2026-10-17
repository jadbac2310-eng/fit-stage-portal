import { getMembershipApplications } from "@/lib/membership-applications";
import { getCurrentIsAdmin } from "@/lib/members";
import { ApplicationsClient } from "./applications-client";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const [applications, isAdmin] = await Promise.all([
    getMembershipApplications(),
    getCurrentIsAdmin(),
  ]);

  return <ApplicationsClient applications={applications} isAdmin={isAdmin} />;
}

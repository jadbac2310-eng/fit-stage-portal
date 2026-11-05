import { getSideJobs } from "@/lib/side-jobs";
import { getCurrentIsAdmin } from "@/lib/members";
import { SideJobsClient } from "./side-jobs-client";

export const dynamic = "force-dynamic";

export default async function SideJobsPage() {
  const isAdmin = await getCurrentIsAdmin();
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-4xl">🔒</p>
        <p className="text-sm font-semibold text-gray-600">管理者のみ閲覧できます</p>
      </div>
    );
  }
  const jobs = await getSideJobs();
  return <SideJobsClient jobs={jobs} />;
}

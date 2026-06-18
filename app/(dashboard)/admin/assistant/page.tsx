import { getCurrentIsAdmin } from "@/lib/members";
import { AssistantClient } from "./assistant-client";

export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  const isAdmin = await getCurrentIsAdmin();
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-4xl">🔒</p>
        <p className="text-sm font-semibold text-gray-600">管理者のみ利用できます</p>
      </div>
    );
  }
  return <AssistantClient />;
}

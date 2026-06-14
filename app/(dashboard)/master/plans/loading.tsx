import { Skeleton } from "@/components/ui/skeleton";

export default function PlansMasterLoading() {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-4 hidden md:block">
        <Skeleton className="h-7 w-32 mb-1.5" />
        <Skeleton className="h-4 w-48" />
      </div>

      <div className="space-y-2.5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center gap-3 mb-3">
              <Skeleton className="w-9 h-9 rounded-xl" />
              <div className="flex-1">
                <Skeleton className="h-4 w-20 mb-1.5" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

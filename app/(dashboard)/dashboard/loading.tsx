import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6 hidden md:block">
        <Skeleton className="h-7 w-36 mb-1.5" />
        <Skeleton className="h-4 w-48" />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {[0, 1].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4">
            <Skeleton className="h-3.5 w-20 mb-2" />
            <Skeleton className="h-9 w-12" />
          </div>
        ))}
      </div>

      <Skeleton className="h-3.5 w-16 mb-3" />

      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 p-4">
            <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

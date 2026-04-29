import { Skeleton } from "@/components/ui/skeleton";

export default function MasterLoading() {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-5 hidden md:block">
        <Skeleton className="h-7 w-24 mb-1.5" />
        <Skeleton className="h-4 w-40" />
      </div>

      <div className="space-y-2">
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 p-4">
            <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-36" />
            </div>
            <Skeleton className="h-3 w-8 flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

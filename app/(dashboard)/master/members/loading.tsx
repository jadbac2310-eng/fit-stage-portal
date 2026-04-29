import { Skeleton } from "@/components/ui/skeleton";

export default function MembersLoading() {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-5 hidden md:flex items-center justify-between">
        <div>
          <Skeleton className="h-7 w-24 mb-1.5" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>

      <div className="space-y-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 px-4 py-3.5">
            <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-36" />
            </div>
            <Skeleton className="h-5 w-12 rounded-full flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

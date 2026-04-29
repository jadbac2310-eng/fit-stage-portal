import { Skeleton } from "@/components/ui/skeleton";

export default function WikiFolderLoading() {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-5">
        <Skeleton className="h-4 w-16 mb-4" />
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-7 w-40 mb-1.5" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Skeleton className="h-10 w-40 rounded-xl" />
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 px-4 py-3">
            <Skeleton className="w-4 h-4 flex-shrink-0" />
            <Skeleton className="flex-1 h-4" />
            <div className="flex items-center gap-2 flex-shrink-0">
              <Skeleton className="w-5 h-5 rounded-full" />
              <Skeleton className="w-10 h-3" />
            </div>
            <Skeleton className="w-4 h-4 flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

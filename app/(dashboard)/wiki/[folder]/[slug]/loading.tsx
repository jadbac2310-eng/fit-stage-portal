import { Skeleton } from "@/components/ui/skeleton";

export default function WikiDetailLoading() {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Skeleton className="h-4 w-24 mb-4" />
        <div className="flex items-start justify-between gap-3">
          <Skeleton className="h-7 w-64" />
          <div className="flex items-center gap-2 flex-shrink-0">
            <Skeleton className="h-7 w-32 rounded-lg" />
          </div>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="pt-2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}

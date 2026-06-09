import { Skeleton } from "@/components/ui/skeleton";

export default function CommissionsLoading() {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-5 hidden md:block">
        <Skeleton className="h-7 w-28 mb-1.5" />
        <Skeleton className="h-4 w-56" />
      </div>
      <Skeleton className="h-10 w-64 mb-5" />
      <div className="grid grid-cols-2 gap-3 mb-5">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
      <Skeleton className="h-10 w-full rounded-xl mb-4" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

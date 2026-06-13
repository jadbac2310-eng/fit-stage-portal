import { Skeleton } from "@/components/ui/skeleton";

export default function ScheduleLoading() {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <Skeleton className="h-7 w-40 mb-2" />
      <Skeleton className="h-4 w-48 mb-5" />
      <Skeleton className="h-24 w-full rounded-2xl mb-5" />
      <Skeleton className="h-10 w-full rounded-xl mb-4" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

export default function CommissionRatesLoading() {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-5 hidden md:block">
        <Skeleton className="h-7 w-40 mb-1.5" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-40 w-full rounded-2xl mb-5" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

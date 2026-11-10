import { Skeleton } from "@/components/ui/skeleton";

/** ダッシュボードを読み込んでいる間の骨組み（2列・箱の並びを本物に合わせる） */
export default function DashboardLoading() {
  const box = (rows: number) => (
    <div className="bg-white border border-[var(--portal-line)]">
      <div className="px-3 py-2.5 border-b-2 border-[var(--portal-navy)]"><Skeleton className="h-4 w-28" /></div>
      <div className="p-3 space-y-2.5">
        {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-4 w-full" />)}
      </div>
    </div>
  );
  return (
    <div className="p-3 md:p-5 max-w-6xl mx-auto">
      <Skeleton className="h-4 w-48 mb-3" />
      <div className="grid gap-3 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] md:items-start">
        <div className="space-y-3">{box(2)}{box(5)}{box(6)}</div>
        <div className="space-y-3">{box(6)}{box(3)}</div>
      </div>
    </div>
  );
}

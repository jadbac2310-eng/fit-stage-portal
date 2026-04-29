import { Skeleton } from "@/components/ui/skeleton";

export default function TodoLoading() {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-4 hidden md:flex items-center justify-between">
        <div>
          <Skeleton className="h-7 w-16 mb-1.5" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>

      {/* 進捗バー */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-3 w-full rounded-full" />
      </div>

      {/* タブ */}
      <Skeleton className="h-11 w-full rounded-xl mb-3" />

      {/* フィルター */}
      <div className="flex gap-2 mb-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-7 w-12 rounded-lg" />
        ))}
        <Skeleton className="h-7 w-24 rounded-lg ml-auto" />
      </div>

      {/* タスクリスト */}
      <div className="space-y-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 border-l-4 border-l-gray-200 px-4 py-3.5 flex items-start gap-3">
            <Skeleton className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex gap-3 mt-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-12 ml-auto" />
              </div>
            </div>
            <Skeleton className="h-5 w-6 rounded-full flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

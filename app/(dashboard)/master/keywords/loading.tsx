import { Skeleton } from "@/components/ui/skeleton";

export default function KeywordsLoading() {
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="mb-5 hidden md:block">
        <Skeleton className="h-7 w-40 mb-1.5" />
        <Skeleton className="h-4 w-20" />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Skeleton className="h-10 flex-1 min-w-[180px] rounded-xl" />
        <Skeleton className="h-10 w-36 rounded-xl" />
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["40%", "15%", "12%", "10%", "10%", "8%", "8%"].map((w, i) => (
                  <th key={i} className="px-4 py-3" style={{ width: w }}>
                    <Skeleton className="h-3 w-full" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[...Array(15)].map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-3/4" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-12 ml-auto" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-8 ml-auto" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-14 ml-auto" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-6 mx-auto" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-4 mx-auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

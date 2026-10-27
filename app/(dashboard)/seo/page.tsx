import { getCurrentMember } from "@/lib/members";
import { getSearchOverview } from "@/lib/search-console";
import { getKeywordVolumes } from "@/lib/keywords";
import { SeoClient } from "./seo-client";

export const dynamic = "force-dynamic";

/** 画面で選べる期間。長くしすぎても読み切れないので3つだけ */
const PERIODS = [28, 90, 180];

export default async function SeoPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const member = await getCurrentMember();
  if (!member?.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-6 text-center">
        <p className="text-4xl">🔒</p>
        <p className="text-sm font-semibold text-gray-600">管理者のみ閲覧できます</p>
      </div>
    );
  }

  const { days: daysParam } = await searchParams;
  const days = PERIODS.includes(Number(daysParam)) ? Number(daysParam) : PERIODS[0];

  const overview = await getSearchOverview(days);
  // 画面に出すキーワードぶんだけ、ラッコで調べた月間検索数を引く
  const volumes = await getKeywordVolumes(overview.queries.map((q) => q.key));

  return <SeoClient overview={overview} days={days} periods={PERIODS} volumes={volumes} />;
}

import { getCurrentMember } from "@/lib/members";
import { getSearchOverview, lookupKeyword } from "@/lib/search-console";
import { getKeywordVolumes } from "@/lib/keywords";
import { SeoClient } from "./seo-client";

export const dynamic = "force-dynamic";

/** 画面で選べる期間。長くしすぎても読み切れないので3つだけ */
const PERIODS = [28, 90, 180];

export default async function SeoPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; q?: string }>;
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

  const { days: daysParam, q } = await searchParams;
  const days = PERIODS.includes(Number(daysParam)) ? Number(daysParam) : PERIODS[0];

  const [overview, lookup] = await Promise.all([
    getSearchOverview(days),
    // 「この言葉で何位？」。ページの平均順位では答えにならないときに使う
    q?.trim() ? lookupKeyword(days, q) : Promise.resolve(null),
  ]);
  // 画面に出すキーワードぶんだけ、ラッコで調べた月間検索数を引く
  const words = overview.pages.flatMap((pg) => [...pg.keywords, ...pg.almost, ...pg.weak].map((k) => k.key));
  const volumes = await getKeywordVolumes(words);

  return <SeoClient overview={overview} days={days} periods={PERIODS} volumes={volumes} lookup={lookup} />;
}

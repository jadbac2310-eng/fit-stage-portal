import { getKeywords, getKeywordCategories, KEYWORDS_PAGE_SIZE } from "@/lib/keywords";
import { KeywordsClient } from "./keywords-client";

export const dynamic = "force-dynamic";

export default async function KeywordsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; category?: string; used?: string }>;
}) {
  const params   = await searchParams;
  const page     = Math.max(1, parseInt(params.page ?? "1"));
  const search   = params.search ?? "";
  const category = params.category ?? "";
  const used     = params.used === "true" ? true : params.used === "false" ? false : undefined;

  const [{ data, total }, categories] = await Promise.all([
    getKeywords({ page, search, category, used }),
    getKeywordCategories(),
  ]);

  return (
    <KeywordsClient
      keywords={data}
      total={total}
      page={page}
      pageSize={KEYWORDS_PAGE_SIZE}
      search={search}
      category={category}
      used={used}
      categories={categories}
    />
  );
}

import { createAdminClient } from "./supabase";

export interface Keyword {
  id:             string;
  keyword:        string;
  category:       string | null;
  search_volume:  number | null;
  seo_difficulty: number | null;
  cpc:            number | null;
  competition:    number | null;
  used_at:        string | null;
  article_slug:   string | null;
}

export const KEYWORDS_PAGE_SIZE = 50;

export async function getKeywords({
  page     = 1,
  search   = "",
  category = "",
  used,
}: {
  page?:     number;
  search?:   string;
  category?: string;
  used?:     boolean;
} = {}): Promise<{ data: Keyword[]; total: number }> {
  const supabase = createAdminClient();
  const from = (page - 1) * KEYWORDS_PAGE_SIZE;
  const to   = from + KEYWORDS_PAGE_SIZE - 1;

  let query = supabase
    .from("keywords")
    .select("id, keyword, category, search_volume, seo_difficulty, cpc, competition, used_at, article_slug", { count: "exact" })
    .order("search_volume", { ascending: false, nullsFirst: false })
    .range(from, to);

  if (search)            query = query.ilike("keyword", `%${search}%`);
  if (category)          query = query.eq("category", category);
  if (used === true)     query = query.not("used_at", "is", null);
  if (used === false)    query = query.is("used_at", null);

  const { data, count, error } = await query;
  if (error) throw error;
  return { data: (data ?? []) as Keyword[], total: count ?? 0 };
}

export async function getKeywordsCount(): Promise<number> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("keywords")
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}

export async function getKeywordCategories(): Promise<string[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("keywords")
    .select("category")
    .not("category", "is", null);
  return [...new Set((data ?? []).map((r: { category: string }) => r.category))]
    .filter(Boolean)
    .sort() as string[];
}

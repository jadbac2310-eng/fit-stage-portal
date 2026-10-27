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

/**
 * 指定した言葉だけ、ラッコで調べた月間検索数・難易度を引く。
 *
 * サーチコンソールの一覧に「この言葉は月に何回調べられているか」を並べると、
 * 「順位は低いが需要がある＝伸ばす価値がある」が一目で分かる。
 * keywords の表は件数が多いので、画面に出す言葉だけ名指しで引く（全件は読まない）。
 */
export async function getKeywordVolumes(
  words: string[],
): Promise<Record<string, { searchVolume: number | null; seoDifficulty: number | null }>> {
  const unique = [...new Set(words.map((w) => w.trim()).filter(Boolean))];
  if (unique.length === 0) return {};
  const supabase = createAdminClient();
  const out: Record<string, { searchVolume: number | null; seoDifficulty: number | null }> = {};
  // URL が長くなりすぎないよう小分けにして引く
  const CHUNK = 100;
  for (let i = 0; i < unique.length; i += CHUNK) {
    const { data, error } = await supabase
      .from("keywords")
      .select("keyword, search_volume, seo_difficulty")
      .in("keyword", unique.slice(i, i + CHUNK));
    if (error) return out;   // 引けなくても画面は出す（数字が出ないだけ）
    for (const r of (data ?? []) as { keyword: string; search_volume: number | null; seo_difficulty: number | null }[]) {
      out[r.keyword] = { searchVolume: r.search_volume, seoDifficulty: r.seo_difficulty };
    }
  }
  return out;
}

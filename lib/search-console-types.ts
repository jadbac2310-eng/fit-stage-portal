/**
 * サーチコンソールの型と、画面側でも使う絞り込み。
 *
 * API を叩く側（lib/search-console.ts）と分けてある。
 * 一緒にすると、画面が Google 認証ライブラリまで抱え込んでしまい、
 * スマホに送るデータが一気に増える（ビルドも通らない）。
 */

export interface SearchRow {
  /** キーワード または ページURL */
  key:         string;
  clicks:      number;
  impressions: number;
  /** クリック率（%） */
  ctr:         number;
  /** 平均掲載順位 */
  position:    number;
}

export interface SearchTotals {
  clicks:      number;
  impressions: number;
  ctr:         number;
  position:    number;
}

export interface SearchPeriod {
  /** 実際に集計した期間（サーチコンソールは数日遅れるので、画面に出して誤解を防ぐ） */
  from: string;
  to:   string;
}

export interface SearchDailyRow {
  /** MM/DD */
  date:        string;
  clicks:      number;
  impressions: number;
}

// ─── ページごとの見方 ─────────────────────────────────
//
// 尚樹は「庄内店」「出張パーソナル」「求人」のようにページ単位で考える。
// キーワードを全部並べるより、ページごとに「何位で・どの言葉で・何をすれば上がるか」
// を出す方が、次の一手につながる。

export type PageGroup = "store" | "service" | "recruit" | "en" | "blog" | "other";

export const PAGE_GROUP_LABEL: Record<PageGroup, string> = {
  store:   "店舗",
  service: "サービス",
  recruit: "求人",
  en:      "英語ページ",
  other:   "その他",
  blog:    "記事",
};

/** 画面に並べる順。上げたいページ（店舗・サービス・求人・英語）を先に */
export const PAGE_GROUP_ORDER: PageGroup[] = ["store", "service", "recruit", "en", "other", "blog"];

/**
 * 決まったページの呼び名。
 *
 * ページの <title> は「豊中・庄内のパーソナルジム｜ダイエット・姿勢改善…」のように長く、
 * 尚樹が呼んでいる「庄内店」と一致しない。主要ページはここで名前を決める。
 * ここに無いページ（主に記事）は <title> の先頭を使う。
 */
export const KNOWN_PAGES: Record<string, { title: string; group: PageGroup }> = {
  "/":                          { title: "トップページ",             group: "other" },
  "/store/":                    { title: "店舗一覧",                 group: "store" },
  "/store/shonai/":             { title: "庄内店",                   group: "store" },
  "/store/esaka/":              { title: "江坂店",                   group: "store" },
  "/store/sone-shiroyama/":     { title: "曽根城山店",               group: "store" },
  "/service/":                  { title: "サービス一覧",             group: "service" },
  "/service/personal/":         { title: "出張パーソナル",           group: "service" },
  "/service/homegym/":          { title: "マシン設置（ホームジム）", group: "service" },
  "/service/senior/":           { title: "シニア向け",               group: "service" },
  "/service/online/":           { title: "オンライン",               group: "service" },
  "/service/stretch/":          { title: "ストレッチ",               group: "service" },
  "/service/corporate/":        { title: "法人向け",                 group: "service" },
  "/recruit/english-trainer/":  { title: "求人（英語トレーナー）",   group: "recruit" },
  "/en/recruit/":               { title: "求人（英語ページ）",       group: "recruit" },
  "/en/":                       { title: "英語トップ",               group: "en" },
  "/en/hotel/":                 { title: "英語・ホテル向け",         group: "en" },
  "/en/price/":                 { title: "英語・料金",               group: "en" },
  "/price/":                    { title: "料金",                     group: "other" },
  "/trainer/":                  { title: "トレーナー紹介",           group: "other" },
  "/faq/":                      { title: "よくある質問",             group: "other" },
  "/contact/":                  { title: "お問い合わせ",             group: "other" },
  "/company/":                  { title: "会社概要",                 group: "other" },
  "/cases/":                    { title: "導入事例",                 group: "other" },
};

/** URL の種類から、どのまとまりかを決める（KNOWN_PAGES に無いページ用） */
export function pageGroupOf(path: string): PageGroup {
  if (path.startsWith("/store/"))   return "store";
  if (path.startsWith("/service/")) return "service";
  if (path.startsWith("/recruit/")) return "recruit";
  if (path.startsWith("/en/"))      return "en";
  if (path.startsWith("/blog/"))    return "blog";
  return "other";
}

/** URL からパス部分だけ取り出す（"https://www.fitstage.jp/store/shonai/" → "/store/shonai/"） */
export function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname || "/";
  } catch {
    return url;
  }
}

/**
 * <title> を短くする。「豊中・庄内のパーソナルジム｜ダイエット…｜FIT STAGE 庄内店」→ 先頭だけ。
 * 区切りは ｜ | － - のどれか。区切りが無ければそのまま（長すぎれば切る）。
 */
export function shortTitle(raw: string | undefined, fallback: string): string {
  const t = (raw ?? "").replace(/\s+/g, " ").trim();
  if (!t) return fallback;
  const head = t.split(/\s*[｜|]\s*|\s+[－-]\s+/)[0]?.trim() ?? t;
  const s = head || t;
  return s.length > 40 ? s.slice(0, 39) + "…" : s;
}

export interface PageKeyword {
  key:         string;
  clicks:      number;
  impressions: number;
  ctr:         number;
  position:    number;
}

export interface PageReport {
  url:         string;
  path:        string;
  title:       string;
  group:       PageGroup;
  clicks:      number;
  impressions: number;
  ctr:         number;
  position:    number;
  prevClicks:      number;
  prevImpressions: number;
  /** 前の期間の平均順位。前の期間に表示が無ければ null */
  prevPosition:    number | null;
  /** このページが出ている言葉（表示回数の多い順・上位だけ） */
  keywords:     PageKeyword[];
  keywordCount: number;
  /** 11〜20位。あと少しで1ページ目 */
  almost:       PageKeyword[];
  /** 10位以内なのに押されていない */
  weak:         PageKeyword[];
}

export interface SearchOverview {
  period:     SearchPeriod;
  /** どのサイトの数字か（www あり/なしの取り違えに気付けるように画面へ出す） */
  site?:      string;
  totals:     SearchTotals;
  prevTotals: SearchTotals;
  daily:      SearchDailyRow[];
  /** ページごと。上げたいページ順（店舗→サービス→求人→英語→その他→記事）、同じ中では表示回数順 */
  pages:      PageReport[];
  /** 読めなかったときの理由（権限不足など）。画面にそのまま出して直せるようにする */
  error?:     string;
  /** ポータルがGoogleに名乗っているアドレス。サーチコンソールに貼ってもらうために出す */
  serviceAccount?: string;
}

/**
 * あと一歩のキーワード。
 *
 * 11〜20位は「2ページ目」。表示はされているのにほとんどクリックされない。
 * ここを10位以内に押し上げるのが、いちばん費用対効果が高い。
 * 表示回数が少なすぎるものは直しても効かないので下限を置く。
 */
export const ALMOST_FROM = 10.5;
export const ALMOST_TO   = 20.5;
const ALMOST_MIN_IMPRESSIONS = 10;

export function almostThere<T extends { position: number; impressions: number }>(
  rows: T[], minImpressions = ALMOST_MIN_IMPRESSIONS,
): T[] {
  return rows
    .filter((r) => r.position >= ALMOST_FROM && r.position <= ALMOST_TO && r.impressions >= minImpressions)
    .sort((a, b) => b.impressions - a.impressions);
}

/**
 * 表示はされているのにクリックされていないキーワード。
 *
 * 10位以内に入っているのにクリック率が低いのは、順位ではなく
 * タイトルや説明文が読まれていないということ。書き換えれば今日から効く。
 */
export const WEAK_CTR = 2;
const WEAK_MIN_IMPRESSIONS = 20;

export function weakCtr<T extends { position: number; impressions: number; ctr: number }>(
  rows: T[], minImpressions = WEAK_MIN_IMPRESSIONS,
): T[] {
  return rows
    .filter((r) => r.position <= ALMOST_FROM && r.impressions >= minImpressions && r.ctr < WEAK_CTR)
    .sort((a, b) => b.impressions - a.impressions);
}

/** 順位をひとことで。数字だけだと良いのか悪いのか分からない */
export function positionWord(p: number): string {
  if (p <= 0)  return "—";
  if (p <= 3)  return "上位";
  if (p <= 10) return "1ページ目";
  if (p <= 20) return "2ページ目";
  return "圏外";
}

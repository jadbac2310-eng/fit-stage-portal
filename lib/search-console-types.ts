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
  /**
   * 言葉が伏せられている表示回数。
   * Google は検索した人が少ない言葉を出さない（個人が特定されないように）。
   * 地域の言葉はほぼこれに当たるので、店舗ページは「出ている言葉」が少なく見える。
   */
  hiddenImpressions: number;
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
  if (p <= ALMOST_FROM) return "1ページ目";
  if (p <= ALMOST_TO)   return "2ページ目";
  return "圏外";
}

// ─── HP側のクロードに渡す指示文 ──────────────────────
//
// この画面を読んで直すのは人ではなく、HPのリポジトリを担当するクロードコード。
// 数字を眺めて人が言い直すより、そのまま貼れる指示文を作った方が速くて漏れない。

function fmtKw(k: PageKeyword, volume?: number | null): string {
  const v = volume != null ? `・月間検索 ${volume.toLocaleString("ja-JP")}` : "";
  return `「${k.key}」（${k.position}位・表示 ${k.impressions.toLocaleString("ja-JP")}・クリック ${k.clicks}・CTR ${k.ctr}%${v}）`;
}

export function buildPageBrief(
  page: PageReport,
  period: SearchPeriod,
  volumes: Record<string, { searchVolume: number | null }> = {},
): string {
  const vol = (k: PageKeyword) => volumes[k.key]?.searchVolume;
  const lines: string[] = [];
  lines.push(`fitstage.jp の ${page.path}（${page.title}）のSEOを改善してください。`);
  lines.push("");
  lines.push(`■ サーチコンソールの数字（${period.from}〜${period.to}）`);
  if (page.impressions === 0) {
    lines.push("- この期間、検索結果に一度も出ていません。");
  } else {
    const pos = page.prevPosition != null ? `（前の期間 ${page.prevPosition}位）` : "";
    lines.push(`- 平均順位 ${page.position}位${pos}、表示 ${page.impressions.toLocaleString("ja-JP")}回、クリック ${page.clicks}回（前の期間 ${page.prevClicks}回）`);
    if (page.hiddenImpressions > 0) {
      lines.push(`- 表示のうち ${page.hiddenImpressions.toLocaleString("ja-JP")}回は Google が言葉を伏せている（地域の言葉はほぼこれ）。下の言葉は見えている分だけ。`);
    }
  }
  if (page.weak.length > 0) {
    lines.push("");
    lines.push(`■ 10位以内なのに押されていない言葉（CTR ${WEAK_CTR}%未満）→ title と meta description にこの言葉を入れて書き直す`);
    for (const k of page.weak) lines.push(`- ${fmtKw(k, vol(k))}`);
  }
  if (page.almost.length > 0) {
    lines.push("");
    lines.push("■ 11〜20位の言葉 → 見出し(h2/h3)と本文にこの言葉を入れ、その言葉で検索する人の疑問に答える段落を足す");
    for (const k of page.almost) lines.push(`- ${fmtKw(k, vol(k))}`);
  }
  if (page.keywords.length > 0) {
    lines.push("");
    lines.push("■ 参考：いま出ている言葉（表示の多い順）");
    for (const k of page.keywords) lines.push(`- ${fmtKw(k, vol(k))}`);
  }
  lines.push("");
  lines.push("■ お願い");
  if (page.impressions === 0) {
    lines.push("1. このページが検索に出ていない原因を調べる（noindex・サイトマップ未登録・内部リンクが無い・内容が薄い）");
    lines.push("2. 上の店舗名／サービス名＋地域名で検索されたときに出る内容にする（title・h1・本文）");
  } else {
    lines.push("1. 「押されていない言葉」が自然に入るように title（30文字前後）と meta description（80〜120文字）を書き直す。店名と地域名は残す");
    lines.push("2. 「11〜20位の言葉」を h2/h3 と本文に入れ、内容を厚くする（その言葉で探している人が知りたいことに答える）");
    lines.push("3. 言葉を無理に詰め込まない。読んで自然な文にする");
  }
  lines.push("4. 変更したら、何をどう変えたかを一覧で報告する");
  return lines.join("\n");
}

// ─── 「この言葉で何位？」 ──────────────────────────────
//
// 尚樹が自分で検索して「出てこない」と感じたとき、ページの平均順位では答えにならない。
// その言葉そのものの順位を、ページごとに出す。

export interface KeywordMatch {
  query: string;
  impressions: number;
  clicks: number;
  pages: { path: string; title: string; position: number; impressions: number; clicks: number }[];
  /** ラッコで調べた月間検索数（分かるときだけ） */
  monthlyVolume?: number | null;
}

/**
 * 表示回数が少ない順位は当てにならない。
 *
 * サーチコンソールは「出たとき」しか記録しない。月に何百回も検索される言葉で
 * 表示が6回なら、残りの何百回は出ていない＝ほぼ圏外。
 * そのときの「1位」は、前にサイトを見た2人に出ただけ、ということが多い。
 */
export const RELIABLE_IMPRESSIONS = 30;

export type Reliability =
  | { level: "none";  text: string }   // ほぼ出ていない
  | { level: "low";   text: string }   // 出てはいるが少ない
  | { level: "ok";    text: string };

export function keywordReliability(
  impressions: number, days: number, monthlyVolume?: number | null,
): Reliability {
  // 月間検索数が分かれば「検索されたうち何%で出たか」まで言える
  if (monthlyVolume != null && monthlyVolume > 0) {
    const expected = monthlyVolume * (days / 30);
    const coverage = Math.min(100, Math.round((impressions / expected) * 100));
    if (coverage < 10) {
      return { level: "none", text: `この言葉は月に約${monthlyVolume.toLocaleString("ja-JP")}回検索されますが、出たのは${impressions}回（約${coverage}%）。ほぼ圏外です。上の順位は、出た数回ぶんの位置で、当てになりません。` };
    }
    if (coverage < 50) {
      return { level: "low", text: `検索されたうち約${coverage}%でしか出ていません。順位より「出る回数を増やす」段階です。` };
    }
    return { level: "ok", text: `検索されたうち約${coverage}%で出ています。` };
  }
  if (impressions < RELIABLE_IMPRESSIONS) {
    return { level: "none", text: `${days}日で表示が${impressions}回しかありません。ほとんどの検索では出ていない（ほぼ圏外）と考えてください。上の順位は出た数回ぶんの位置で、当てになりません。` };
  }
  return { level: "ok", text: "" };
}

export interface KeywordLookup {
  q: string;
  matches: KeywordMatch[];
  /** 見つからなかった・読めなかったときの理由 */
  note?: string;
}

/** 空白や全角半角の揺れを吸収して比べる */
export function normalizeQuery(s: string): string {
  return (s ?? "")
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[\s　]+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * ページ×キーワードの行から、q を含む言葉だけを拾って言葉ごとにまとめる。
 * 完全一致を先頭に、あとは表示回数の多い順。多すぎると読めないので上限を置く。
 */
export function groupKeywordMatches(
  rows: { page: string; q: PageKeyword }[],
  q: string,
  titleOf: (url: string) => string,
  limit = 20,
): KeywordMatch[] {
  const needle = normalizeQuery(q);
  if (!needle) return [];
  const byQuery = new Map<string, KeywordMatch>();
  for (const { page, q: k } of rows) {
    if (!normalizeQuery(k.key).includes(needle)) continue;
    const m = byQuery.get(k.key) ?? { query: k.key, impressions: 0, clicks: 0, pages: [] };
    m.impressions += k.impressions;
    m.clicks += k.clicks;
    m.pages.push({ path: pathOf(page), title: titleOf(page), position: k.position, impressions: k.impressions, clicks: k.clicks });
    byQuery.set(k.key, m);
  }
  const out = Array.from(byQuery.values());
  for (const m of out) m.pages.sort((a, b) => a.position - b.position);
  out.sort((a, b) => {
    const ea = normalizeQuery(a.query) === needle ? 1 : 0;
    const eb = normalizeQuery(b.query) === needle ? 1 : 0;
    return (eb - ea) || (b.impressions - a.impressions);
  });
  return out.slice(0, limit);
}

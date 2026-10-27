import { unstable_cache } from "next/cache";
import type {
  SearchRow, SearchTotals, SearchPeriod, SearchDailyRow, SearchOverview, PageReport, PageKeyword,
} from "./search-console-types";
import {
  KNOWN_PAGES, PAGE_GROUP_ORDER, pageGroupOf, pathOf, shortTitle, almostThere, weakCtr,
} from "./search-console-types";

export type {
  SearchRow, SearchTotals, SearchPeriod, SearchDailyRow, SearchOverview, PageReport, PageKeyword,
} from "./search-console-types";
export { almostThere, weakCtr, ALMOST_FROM, ALMOST_TO, WEAK_CTR } from "./search-console-types";

/**
 * Google サーチコンソールの検索パフォーマンス。
 *
 * 「どの言葉で検索されて、何回表示されて、何位で、何回クリックされたか」を読む。
 * 認証は GA4 と同じサービスアカウント（GA4_CLIENT_EMAIL / GA4_PRIVATE_KEY）を使い、
 * 読み取り権限だけ足して使う。
 *
 * データはサーチコンソール側に16か月ぶん残っているので、こちらで溜め込まない。
 * 溜め込むと毎日取りに行く仕掛けと巨大な表が増え、ポータルが重くなるため。
 * そのかわり同じ条件の問い合わせは1時間キャッシュする。
 */

/**
 * サーチコンソールは当日・前日ぶんがまだ揃っていない。
 * そのまま今日までを集計すると、前の期間と比べたときに必ず減って見える。
 * 3日前までで切って、期間どうしを同じ条件で比べる。
 */
const LAG_DAYS = 3;

function ymd(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function shift(base: Date, days: number): Date {
  const d = new Date(base.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** 直近 days 日ぶんの期間と、その1つ前の同じ長さの期間 */
export function searchPeriods(days: number, now: Date = new Date()): { current: SearchPeriod; previous: SearchPeriod } {
  const end = shift(now, -LAG_DAYS);
  const start = shift(end, -(days - 1));
  const prevEnd = shift(start, -1);
  const prevStart = shift(prevEnd, -(days - 1));
  return {
    current:  { from: ymd(start),     to: ymd(end) },
    previous: { from: ymd(prevStart), to: ymd(prevEnd) },
  };
}

/** 鍵が入っているか。入っていなければ画面に案内を出す */
export function isSearchConsoleConfigured(): boolean {
  return !!(process.env.GA4_CLIENT_EMAIL && process.env.GA4_PRIVATE_KEY);
}

/**
 * ポータルがGoogleに名乗っているアドレス（サービスアカウント）。
 *
 * サーチコンソールに権限を足すとき、これを貼る必要がある。
 * Vercelの設定画面を探してもらうのは手間なので、つながっていないときに
 * 画面へ出してコピーできるようにする。
 * 秘密なのは鍵（GA4_PRIVATE_KEY）の方で、このアドレスは貼る先に見せるもの。
 */
export function serviceAccountEmail(): string | undefined {
  return process.env.GA4_CLIENT_EMAIL?.trim() || undefined;
}

async function getToken(): Promise<string> {
  const { GoogleAuth } = await import("google-auth-library");
  const auth = new GoogleAuth({
    credentials: {
      client_email: process.env.GA4_CLIENT_EMAIL!,
      private_key:  process.env.GA4_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });
  const client = await auth.getClient();
  const token  = await client.getAccessToken();
  return token.token!;
}

type ApiRow = { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number };

/** このサービスアカウントが見られるサイト（＝サーチコンソールで権限を足したもの） */
export async function listSites(): Promise<string[]> {
  const token = await getToken();
  const res = await fetch("https://searchconsole.googleapis.com/webmasters/v3/sites", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`サーチコンソールに接続できませんでした（${res.status}）: ${(await res.text()).slice(0, 200)}`);
  }
  const data = await res.json();
  return ((data.siteEntry ?? []) as { siteUrl?: string }[])
    .map((s) => s.siteUrl ?? "")
    .filter(Boolean);
}

/**
 * どのサイトの数字を見るかを決める。
 *
 * 環境変数 SEARCH_CONSOLE_SITE_URL があればそれ。
 * 無ければ、権限を足したサイトを自分で探す。
 * 尚樹に環境変数を触ってもらう手間をなくすため（権限を足すだけで動く）。
 * 複数あってどれか分からないときだけ、名前を並べて選んでもらう。
 */
async function resolveSite(): Promise<string> {
  const fromEnv = process.env.SEARCH_CONSOLE_SITE_URL?.trim();
  if (fromEnv) return fromEnv;

  const sites = await listSites();
  if (sites.length === 0) {
    throw new Error(
      "このサービスアカウントに見えるサイトがありません。"
      + "サーチコンソールの「設定 → ユーザーと権限 → ユーザーを追加」で、"
      + "ポータルのサービスアカウント（GA4_CLIENT_EMAIL の値）を追加してください",
    );
  }
  if (sites.length === 1) return sites[0];
  throw new Error(
    `見えるサイトが複数あります。環境変数 SEARCH_CONSOLE_SITE_URL でどれかを指定してください: ${sites.join(" / ")}`,
  );
}

async function query(body: Record<string, unknown>): Promise<ApiRow[]> {
  const site = encodeURIComponent(await resolveSite());
  const token = await getToken();
  const res = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${site}/searchAnalytics/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "web", ...body }),
    },
  );
  if (!res.ok) {
    throw new Error(`サーチコンソールから読めませんでした（${res.status}）: ${(await res.text()).slice(0, 300)}`);
  }
  const data = await res.json();
  return (data.rows ?? []) as ApiRow[];
}

function toRow(r: ApiRow): SearchRow {
  return {
    key:         r.keys?.[0] ?? "",
    clicks:      Math.round(r.clicks ?? 0),
    impressions: Math.round(r.impressions ?? 0),
    ctr:         Math.round((r.ctr ?? 0) * 1000) / 10,   // 0.0123 → 1.2(%)
    position:    Math.round((r.position ?? 0) * 10) / 10,
  };
}

function sumTotals(rows: SearchRow[]): SearchTotals {
  const clicks = rows.reduce((s, r) => s + r.clicks, 0);
  const impressions = rows.reduce((s, r) => s + r.impressions, 0);
  // 平均順位は表示回数で重みづけする。単純平均だと、ほぼ表示されない言葉に引っぱられる
  const weighted = rows.reduce((s, r) => s + r.position * r.impressions, 0);
  return {
    clicks,
    impressions,
    ctr:      impressions > 0 ? Math.round((clicks / impressions) * 1000) / 10 : 0,
    position: impressions > 0 ? Math.round((weighted / impressions) * 10) / 10 : 0,
  };
}

async function fetchRows(dimension: "query" | "page", from: string, to: string, limit: number): Promise<SearchRow[]> {
  const rows = await query({ startDate: from, endDate: to, dimensions: [dimension], rowLimit: limit });
  return rows.map(toRow);
}

async function fetchDaily(from: string, to: string): Promise<SearchDailyRow[]> {
  const rows = await query({ startDate: from, endDate: to, dimensions: ["date"], rowLimit: 500 });
  return rows
    .map((r) => {
      const raw = r.keys?.[0] ?? "";           // "YYYY-MM-DD"
      return {
        date:        `${raw.slice(5, 7)}/${raw.slice(8, 10)}`,
        clicks:      Math.round(r.clicks ?? 0),
        impressions: Math.round(r.impressions ?? 0),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * ページ×キーワードを全部読む。
 *
 * 1回の問い合わせで返るのは最大 25,000 行。小さいサイトなので普通は1回で足りるが、
 * 期間を長くすると超えることがあるので、足りなければ続きを読む（上限3回）。
 */
const PAGE_QUERY_ROWS = 5000;
const PAGE_QUERY_MAX_CALLS = 3;

async function fetchPageQueries(from: string, to: string): Promise<{ page: string; q: PageKeyword }[]> {
  const out: { page: string; q: PageKeyword }[] = [];
  for (let i = 0; i < PAGE_QUERY_MAX_CALLS; i++) {
    const rows = await query({
      startDate: from, endDate: to,
      dimensions: ["page", "query"],
      rowLimit: PAGE_QUERY_ROWS,
      startRow: i * PAGE_QUERY_ROWS,
    });
    for (const r of rows) {
      const page = r.keys?.[0] ?? "";
      const key  = r.keys?.[1] ?? "";
      if (!page || !key) continue;
      out.push({ page, q: { ...toRow({ ...r, keys: [key] }) } });
    }
    if (rows.length < PAGE_QUERY_ROWS) break;
  }
  return out;
}

// ─── ページの題名 ─────────────────────────────────────
//
// 主要ページは KNOWN_PAGES の呼び名を使う。それ以外（主に記事）はページを読んで <title> を拾う。
// 1ページずつ1日キャッシュするので、重いのは最初の1回だけ。

const TITLE_TIMEOUT_MS = 4000;
/** 題名を取りに行くページの上限。記事が多いので、表示回数の多いものだけ */
const TITLE_FETCH_MAX = 30;
const TITLE_CONCURRENCY = 6;

async function fetchTitleUncached(url: string): Promise<string> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TITLE_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctl.signal, headers: { "User-Agent": "fit-stage-portal/seo" } });
    if (!res.ok) return "";
    const html = (await res.text()).slice(0, 200_000);
    const m = /<title[^>]*>([^<]*)<\/title>/i.exec(html);
    return m?.[1]?.trim() ?? "";
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

const fetchTitle = unstable_cache(fetchTitleUncached, ["page-title"], { revalidate: 86400 });

/** 同時に投げる数を抑えながら全部の題名を集める */
async function fetchTitles(urls: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (let i = 0; i < urls.length; i += TITLE_CONCURRENCY) {
    const chunk = urls.slice(i, i + TITLE_CONCURRENCY);
    const titles = await Promise.all(chunk.map((u) => fetchTitle(u)));
    chunk.forEach((u, k) => out.set(u, titles[k]));
  }
  return out;
}

// ─── ページごとのまとめ ───────────────────────────────

/** 1ページに出す言葉の数。多すぎると読めない */
const KEYWORDS_PER_PAGE = 8;

function totalsOf(rows: { clicks: number; impressions: number; position: number }[]): SearchTotals {
  return sumTotals(rows.map((r) => ({ key: "", ctr: 0, ...r })));
}

/**
 * ページ×キーワードの行を、ページごとにまとめる。
 * 前の期間のページ別の数字（prev）があれば、前期間比も付ける。
 */
/**
 * ページ×キーワードの行を、ページごとにまとめる。
 *
 * ページ全体の数字（クリック・表示・順位）は nowByPage（ページ別の集計）から取る。
 * ページ×キーワードの行から足し上げてはいけない。Google は「検索した人が少ない言葉」を
 * 伏せるので、言葉別の行には出てこない表示がある。地域の言葉（「庄内 パーソナルジム」など）は
 * ほとんどこれに当たり、足し上げると表示が減り、残った大きい言葉だけで順位が決まって変になる。
 */
export function buildPageReports(
  rows: { page: string; q: PageKeyword }[],
  nowByPage: Map<string, SearchRow>,
  prevByPage: Map<string, SearchRow>,
  titles: Map<string, string>,
): PageReport[] {
  const byPage = new Map<string, PageKeyword[]>();
  for (const { page, q } of rows) {
    const arr = byPage.get(page);
    if (arr) arr.push(q);
    else byPage.set(page, [q]);
  }
  // 言葉が全部伏せられて byPage に無いページも、ページ別の集計には居る
  for (const url of nowByPage.keys()) {
    if (!byPage.has(url)) byPage.set(url, []);
  }

  const reports: PageReport[] = [];
  for (const [url, qs] of byPage) {
    const path = pathOf(url);
    const known = KNOWN_PAGES[path];
    const now = nowByPage.get(url);
    // ページ別の集計があればそれ。無ければ言葉別の足し上げ（通常は無い）
    const t = now ?? totalsOf(qs);
    const prev = prevByPage.get(url);
    const sorted = [...qs].sort((a, b) => b.impressions - a.impressions);
    const shownImpressions = qs.reduce((s, q) => s + q.impressions, 0);
    reports.push({
      url, path,
      title: known?.title ?? shortTitle(titles.get(url), path),
      group: known?.group ?? pageGroupOf(path),
      clicks: t.clicks, impressions: t.impressions, ctr: t.ctr, position: t.position,
      prevClicks:      prev?.clicks ?? 0,
      prevImpressions: prev?.impressions ?? 0,
      prevPosition:    prev && prev.impressions > 0 ? prev.position : null,
      keywords:     sorted.slice(0, KEYWORDS_PER_PAGE),
      keywordCount: qs.length,
      hiddenImpressions: Math.max(0, t.impressions - shownImpressions),
      almost:       almostThere(qs),
      weak:         weakCtr(qs),
    });
  }

  // 上げたいページなのに、まだ一度も検索結果に出ていないページも並べる。
  // 無いと「江坂店が無い＝データの不備」に見える。「まだ出ていない」こと自体が大事な情報。
  const present = new Set(reports.map((r) => r.path));
  for (const [path, known] of Object.entries(KNOWN_PAGES)) {
    if (present.has(path)) continue;
    if (!["store", "service", "recruit", "en"].includes(known.group)) continue;
    reports.push({
      url: "", path, title: known.title, group: known.group,
      clicks: 0, impressions: 0, ctr: 0, position: 0,
      prevClicks: 0, prevImpressions: 0, prevPosition: null,
      keywords: [], keywordCount: 0, hiddenImpressions: 0, almost: [], weak: [],
    });
  }

  // 上げたいページ（店舗→サービス→求人→英語）を先に。同じまとまりの中では表示回数の多い順
  const rank = new Map(PAGE_GROUP_ORDER.map((g, i) => [g, i]));
  return reports.sort((a, b) =>
    (rank.get(a.group)! - rank.get(b.group)!) || (b.impressions - a.impressions));
}

/**
 * 読めたぶんを返す。読めなかったときは投げる。
 *
 * ここでエラーを「値」として返すとキャッシュに乗ってしまい、
 * サーチコンソールで権限を足しても最大1時間エラーのままになる。
 * 投げればキャッシュされないので、権限を足した次の表示で出る。
 */
async function fetchOverview(days: number): Promise<SearchOverview> {
  const { current, previous } = searchPeriods(days);
  const site = await resolveSite();
  const [pageQueries, pagesNow, pagesPrev, daily] = await Promise.all([
    fetchPageQueries(current.from, current.to),
    fetchRows("page", current.from,  current.to,  1000),
    fetchRows("page", previous.from, previous.to, 1000),
    fetchDaily(current.from, current.to),
  ]);

  // 題名が要るのは KNOWN_PAGES に無いページだけ。表示回数の多いものから上限まで
  const unknown = pagesNow
    .filter((p) => !KNOWN_PAGES[pathOf(p.key)])
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, TITLE_FETCH_MAX)
    .map((p) => p.key);
  const titles = await fetchTitles(unknown);

  const nowByPage  = new Map(pagesNow.map((p) => [p.key, p]));
  const prevByPage = new Map(pagesPrev.map((p) => [p.key, p]));
  return {
    period: current,
    site,
    // 合計はページ別の集計から出す（キーワード別は匿名化で抜ける言葉があり、合計が小さく出る）
    totals: sumTotals(pagesNow),
    prevTotals: sumTotals(pagesPrev),
    daily,
    pages: buildPageReports(pageQueries, nowByPage, prevByPage, titles),
  };
}

/** 1時間キャッシュ。サーチコンソールの数字は日単位なので、これで十分新しい */
const cachedOverview = unstable_cache(fetchOverview, ["search-console-overview"], { revalidate: 3600 });

/**
 * 画面用。読めなければ、理由と「貼るアドレス」を添えた空の結果を返す。
 * 失敗はキャッシュに乗せない（権限を足した直後に出るようにするため）。
 */
export async function getSearchOverview(days: number): Promise<SearchOverview> {
  const empty: SearchTotals = { clicks: 0, impressions: 0, ctr: 0, position: 0 };
  const base = {
    period: searchPeriods(days).current,
    totals: empty, prevTotals: empty,
    pages: [], daily: [],
    serviceAccount: serviceAccountEmail(),
  };
  if (!isSearchConsoleConfigured()) {
    return { ...base, error: "Googleの鍵（GA4_CLIENT_EMAIL / GA4_PRIVATE_KEY）が設定されていません" };
  }
  try {
    return await cachedOverview(days);
  } catch (e) {
    console.error("[search-console]", e);
    return { ...base, error: e instanceof Error ? e.message : "読み込みに失敗しました" };
  }
}


import { unstable_cache } from "next/cache";
import type { SearchRow, SearchTotals, SearchPeriod, SearchDailyRow, SearchOverview } from "./search-console-types";

export type { SearchRow, SearchTotals, SearchPeriod, SearchDailyRow, SearchOverview } from "./search-console-types";
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

/** 設定が入っているか。入っていなければ画面に案内を出す */
export function isSearchConsoleConfigured(): boolean {
  return !!(process.env.GA4_CLIENT_EMAIL && process.env.GA4_PRIVATE_KEY && process.env.SEARCH_CONSOLE_SITE_URL);
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

async function query(body: Record<string, unknown>): Promise<ApiRow[]> {
  const site = encodeURIComponent(process.env.SEARCH_CONSOLE_SITE_URL!);
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

/** 表に出す件数。多すぎても読めないし、端末に送る量も増える */
const ROW_LIMIT = 100;

async function fetchOverview(days: number): Promise<SearchOverview> {
  const { current, previous } = searchPeriods(days);
  const empty: SearchTotals = { clicks: 0, impressions: 0, ctr: 0, position: 0 };
  if (!isSearchConsoleConfigured()) {
    return { period: current, totals: empty, prevTotals: empty, queries: [], pages: [], daily: [],
             error: "まだ設定されていません" };
  }
  try {
    const [queries, pages, daily, prevQueries] = await Promise.all([
      fetchRows("query", current.from, current.to, ROW_LIMIT),
      fetchRows("page",  current.from, current.to, ROW_LIMIT),
      fetchDaily(current.from, current.to),
      fetchRows("query", previous.from, previous.to, ROW_LIMIT),
    ]);
    return {
      period: current,
      totals: sumTotals(queries),
      prevTotals: sumTotals(prevQueries),
      queries, pages, daily,
    };
  } catch (e) {
    console.error("[search-console]", e);
    return { period: current, totals: empty, prevTotals: empty, queries: [], pages: [], daily: [],
             error: e instanceof Error ? e.message : "読み込みに失敗しました" };
  }
}

/** 1時間キャッシュ。サーチコンソールの数字は日単位なので、これで十分新しい */
export const getSearchOverview = unstable_cache(fetchOverview, ["search-console-overview"], { revalidate: 3600 });


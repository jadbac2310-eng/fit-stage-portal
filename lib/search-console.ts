import { unstable_cache } from "next/cache";

export interface SearchQueryRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchPageRow {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

type SearchConsoleRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getDateRange(days: number) {
  const end = new Date();
  end.setDate(end.getDate() - 2);
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  return { startDate: formatDate(start), endDate: formatDate(end) };
}

async function getToken(): Promise<string> {
  const { GoogleAuth } = await import("google-auth-library");
  const auth = new GoogleAuth({
    credentials: {
      client_email: process.env.GA4_CLIENT_EMAIL!,
      private_key: process.env.GA4_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token!;
}

async function runSearchAnalytics(body: object) {
  if (!process.env.SEARCH_CONSOLE_SITE_URL) {
    throw new Error("SEARCH_CONSOLE_SITE_URL is not set.");
  }

  const token = await getToken();
  const siteUrl = encodeURIComponent(process.env.SEARCH_CONSOLE_SITE_URL);
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${siteUrl}/searchAnalytics/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(JSON.stringify(data.error ?? data, null, 2));
  }
  return data;
}

async function fetchSearchQueries(days = 28, limit = 10): Promise<SearchQueryRow[]> {
  try {
    const data = await runSearchAnalytics({
      ...getDateRange(days),
      dimensions: ["query"],
      rowLimit: limit,
    });
    return (data.rows ?? []).map((row: SearchConsoleRow) => ({
      query: row.keys?.[0] ?? "",
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
    }));
  } catch (e) {
    console.error("[Search Console]", e);
    return [];
  }
}

async function fetchSearchPages(days = 28, limit = 10): Promise<SearchPageRow[]> {
  try {
    const data = await runSearchAnalytics({
      ...getDateRange(days),
      dimensions: ["page"],
      rowLimit: limit,
    });
    return (data.rows ?? []).map((row: SearchConsoleRow) => ({
      page: row.keys?.[0] ?? "",
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
    }));
  } catch (e) {
    console.error("[Search Console]", e);
    return [];
  }
}

export const getSearchQueries = unstable_cache(fetchSearchQueries, ["gsc-search-queries"], { revalidate: 3600 });
export const getSearchPages = unstable_cache(fetchSearchPages, ["gsc-search-pages"], { revalidate: 3600 });

export const getSearchConsoleDiagnostic = unstable_cache(
  async () => {
    try {
      await runSearchAnalytics({
        ...getDateRange(7),
        dimensions: ["query"],
        rowLimit: 1,
      });
      return null;
    } catch (e) {
      return String(e);
    }
  },
  ["gsc-diagnostic"],
  { revalidate: 300 }
);

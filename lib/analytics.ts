import { unstable_cache } from "next/cache";

export interface PageViewRow {
  path:  string;
  views: number;
}

export interface TrafficSourceRow {
  source:   string;
  sessions: number;
}

export interface DeviceRow {
  device:   string;
  sessions: number;
}

export interface DailyPageViewRow {
  date:  string; // "MM/DD"
  views: number;
}

async function getToken(): Promise<string> {
  const { GoogleAuth } = await import("google-auth-library");
  const auth = new GoogleAuth({
    credentials: {
      client_email: process.env.GA4_CLIENT_EMAIL!,
      private_key:  process.env.GA4_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  });
  const client = await auth.getClient();
  const token  = await client.getAccessToken();
  return token.token!;
}

async function runReport(body: object) {
  const token = await getToken();
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${process.env.GA4_PROPERTY_ID}:runReport`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  return res.json();
}

async function fetchPopularPages(days = 7, limit = 5): Promise<PageViewRow[]> {
  try {
    const data = await runReport({
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
      dimensions: [{ name: "pagePath" }],
      metrics:    [{ name: "screenPageViews" }],
      orderBys:   [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.rows ?? []).map((row: any) => ({
      path:  row.dimensionValues[0].value as string,
      views: parseInt(row.metricValues[0].value ?? "0"),
    }));
  } catch (e) {
    console.error("[GA4]", e);
    return [];
  }
}

async function fetchTrafficSources(days = 7, limit = 5): Promise<TrafficSourceRow[]> {
  try {
    const data = await runReport({
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
      dimensions: [{ name: "sessionSource" }],
      metrics:    [{ name: "sessions" }],
      orderBys:   [{ metric: { metricName: "sessions" }, desc: true }],
      limit,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.rows ?? []).map((row: any) => ({
      source:   row.dimensionValues[0].value as string,
      sessions: parseInt(row.metricValues[0].value ?? "0"),
    }));
  } catch (e) {
    console.error("[GA4]", e);
    return [];
  }
}

async function fetchDeviceBreakdown(days = 7): Promise<DeviceRow[]> {
  try {
    const data = await runReport({
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
      dimensions: [{ name: "deviceCategory" }],
      metrics:    [{ name: "sessions" }],
      orderBys:   [{ metric: { metricName: "sessions" }, desc: true }],
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.rows ?? []).map((row: any) => ({
      device:   row.dimensionValues[0].value as string,
      sessions: parseInt(row.metricValues[0].value ?? "0"),
    }));
  } catch (e) {
    console.error("[GA4]", e);
    return [];
  }
}

async function fetchDailyPageViews(days = 28): Promise<DailyPageViewRow[]> {
  try {
    const data = await runReport({
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
      dimensions: [{ name: "date" }],
      metrics:    [{ name: "screenPageViews" }],
      orderBys:   [{ dimension: { dimensionName: "date" }, desc: false }],
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.rows ?? []).map((row: any) => {
      const raw = row.dimensionValues[0].value as string; // "YYYYMMDD"
      const date = `${raw.slice(4, 6)}/${raw.slice(6, 8)}`;
      return { date, views: parseInt(row.metricValues[0].value ?? "0") };
    });
  } catch (e) {
    console.error("[GA4]", e);
    return [];
  }
}

// 1時間キャッシュ（リアルタイム以外）
export const getPopularPages    = unstable_cache(fetchPopularPages,    ["ga4-popular-pages"],    { revalidate: 3600 });
export const getTrafficSources  = unstable_cache(fetchTrafficSources,  ["ga4-traffic-sources"],  { revalidate: 3600 });
export const getDeviceBreakdown = unstable_cache(fetchDeviceBreakdown, ["ga4-device-breakdown"], { revalidate: 3600 });
export const getDailyPageViews  = unstable_cache(fetchDailyPageViews,  ["ga4-daily-pageviews"],  { revalidate: 3600 });
export const getAnalyticsDiagnostic = unstable_cache(
  async () => {
    try {
      const token = await getToken();
      const res = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${process.env.GA4_PROPERTY_ID}:runReport`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
            metrics:    [{ name: "activeUsers" }],
          }),
        }
      );
      const data = await res.json();
      if (data.error) return JSON.stringify(data.error, null, 2);
      return null;
    } catch (e) {
      return String(e);
    }
  },
  ["ga4-diagnostic"],
  { revalidate: 300 }
);


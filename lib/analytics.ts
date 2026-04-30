export interface AnalyticsSummary {
  activeUsers: number;
  sessions:    number;
  pageViews:   number;
  newUsers:    number;
}

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
      private_key:  process.env.GA4_PRIVATE_KEY!,
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

export async function getAnalyticsSummary(days = 7): Promise<AnalyticsSummary | null> {
  try {
    const data = await runReport({
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
      metrics: [
        { name: "activeUsers" },
        { name: "sessions" },
        { name: "screenPageViews" },
        { name: "newUsers" },
      ],
    });
    const row = data.rows?.[0]?.metricValues;
    if (!row) return null;
    return {
      activeUsers: parseInt(row[0]?.value ?? "0"),
      sessions:    parseInt(row[1]?.value ?? "0"),
      pageViews:   parseInt(row[2]?.value ?? "0"),
      newUsers:    parseInt(row[3]?.value ?? "0"),
    };
  } catch (e) {
    console.error("[GA4]", e);
    return null;
  }
}

export async function getPopularPages(days = 7, limit = 5): Promise<PageViewRow[]> {
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

export async function getTrafficSources(days = 7, limit = 5): Promise<TrafficSourceRow[]> {
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

export async function getDeviceBreakdown(days = 7): Promise<DeviceRow[]> {
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

export async function getDailyPageViews(days = 28): Promise<DailyPageViewRow[]> {
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

export async function getRealtimeUsers(): Promise<number> {
  try {
    const token = await getToken();
    const res = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${process.env.GA4_PROPERTY_ID}:runRealtimeReport`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ metrics: [{ name: "activeUsers" }] }),
      }
    );
    const data = await res.json();
    return parseInt(data.rows?.[0]?.metricValues?.[0]?.value ?? "0");
  } catch (e) {
    console.error("[GA4]", e);
    return 0;
  }
}

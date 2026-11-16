import Link from "next/link";
import { SectionBox } from "@/components/ui/section-box";
import { getSearchOverview } from "@/lib/search-console";
import { buildGrowthReport, type GrowthReport } from "@/lib/hp-growth";

/** HP・集客部 広瀬部長の報告（サーチコンソールを読むので Suspense の中で後から出す） */
export async function GrowthSection() {
  const overview = await getSearchOverview(28);
  const report = buildGrowthReport(overview);
  return <GrowthView report={report} error={overview.error} />;
}

export function GrowthView({ report, error }: { report: GrowthReport | null; error?: string }) {
  return (
    <SectionBox title="HP・集客部 広瀬部長の報告（検索・直近28日）" action={{ label: "SEOの画面へ", href: "/seo" }} padded>
      {!report ? (
        <p className="text-sm text-gray-600">{error ? `検索の数字を読めませんでした（${error}）` : "まだ報告できる数字がありません。"}</p>
      ) : (
        <div className="space-y-3 text-sm">
          <p className="text-xs text-gray-500">{report.period.from}〜{report.period.to}・その前の28日と比べて。毎週月曜9時に LINE でもお知らせします。</p>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="クリック" value={report.clicks} prev={report.prevClicks} />
            <Stat label="表示" value={report.impressions} prev={report.prevImpressions} />
          </div>
          {(report.up.length > 0 || report.down.length > 0) && (
            <div className="text-xs text-gray-700 space-y-0.5">
              {report.up.length > 0 && <p>伸びた：{report.up.map((u) => `${u.title}（+${u.diff}）`).join("、")}</p>}
              {report.down.length > 0 && <p>落ちた：{report.down.map((u) => `${u.title}（${u.diff}）`).join("、")}</p>}
            </div>
          )}
          {report.suggestions.length === 0 ? (
            <p className="text-gray-600">今週は、すぐ直したほうがいいところは見つかりませんでした。</p>
          ) : (
            <div>
              <p className="font-bold text-gray-900 mb-1.5">今週の提案</p>
              <ol className="border border-[var(--portal-line)] divide-y divide-[var(--portal-line)]">
                {report.suggestions.map((s, i) => (
                  <li key={s.pagePath} className="px-3 py-2">
                    <p className="font-semibold text-gray-900">{i + 1}. {s.pageTitle} <span className="text-xs font-normal text-gray-400">{s.pagePath}</span></p>
                    <p className="text-xs text-gray-700 mt-0.5">{s.text}</p>
                  </li>
                ))}
              </ol>
              <p className="text-xs text-gray-500 mt-1.5">
                OK なら <Link href="/seo" className="underline text-blue-600">SEO の画面</Link> でそのページの指示文をコピーして、HP のセッションに渡してください。
              </p>
            </div>
          )}
        </div>
      )}
    </SectionBox>
  );
}

function Stat({ label, value, prev }: { label: string; value: number; prev: number }) {
  const d = value - prev;
  return (
    <div className="border border-[var(--portal-line)] px-3 py-2">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="text-lg font-bold text-gray-900 tabular-nums">{value.toLocaleString("ja-JP")}
        <span className={`ml-1.5 text-xs font-semibold ${d > 0 ? "text-green-700" : d < 0 ? "text-red-600" : "text-gray-400"}`}>{d > 0 ? `+${d}` : d}</span>
      </p>
    </div>
  );
}

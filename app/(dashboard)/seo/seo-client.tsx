"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MousePointerClick, Eye, Trophy, AlertTriangle, TrendingUp, Settings } from "lucide-react";
import { cn } from "@/lib/cn";
import { Delta } from "@/components/ui/delta";
// 型と絞り込みだけを読む。lib/search-console.ts を読むと
// Google認証ライブラリまで端末に送られてしまう
import {
  almostThere, weakCtr, ALMOST_FROM, ALMOST_TO, WEAK_CTR,
  type SearchOverview, type SearchRow,
} from "@/lib/search-console-types";

type Volumes = Record<string, { searchVolume: number | null; seoDifficulty: number | null }>;

function num(n: number) {
  return n.toLocaleString("ja-JP");
}

function fmtDate(iso: string) {
  const [, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}`;
}

/** 順位の色分け。1ページ目（10位以内）に入っているかが分かれ目 */
function positionTone(p: number): string {
  if (p <= 3)  return "text-green-700 bg-green-50";
  if (p <= 10) return "text-blue-700 bg-blue-50";
  if (p <= 20) return "text-amber-700 bg-amber-50";
  return "text-gray-500 bg-gray-50";
}

function StatCard({ icon, label, value, suffix, now, prev, goodWhenUp, note }: {
  icon: React.ReactNode; label: string; value: string; suffix?: string;
  now: number; prev?: number; goodWhenUp?: boolean; note?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">{icon} {label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">
        {value}<span className="text-sm font-semibold text-gray-400 ml-0.5">{suffix}</span>
        <Delta now={now} prev={prev} goodWhenUp={goodWhenUp} />
      </p>
      {note && <p className="text-[11px] text-gray-400 mt-0.5">{note}</p>}
    </div>
  );
}

/** クリック数の推移。棒の高さはpxで出す（％だと親の高さが決まらず0になる） */
function DailyChart({ rows }: { rows: SearchOverview["daily"] }) {
  const BAR_AREA = 56;
  if (rows.length === 0) return null;
  const max = Math.max(...rows.map((r) => r.clicks), 1);
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
      <p className="text-xs font-semibold text-gray-500 mb-2">クリック数の推移</p>
      <div className="flex items-end gap-px" style={{ height: BAR_AREA }}>
        {rows.map((r) => (
          <div
            key={r.date}
            title={`${r.date} ${r.clicks}クリック / ${num(r.impressions)}回表示`}
            className={cn("flex-1 rounded-t", r.clicks > 0 ? "bg-blue-400" : "bg-gray-100")}
            style={{ height: r.clicks > 0 ? Math.max(Math.round((r.clicks / max) * BAR_AREA), 3) : 2 }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-gray-400">{rows[0]?.date}</span>
        <span className="text-[10px] text-gray-400">{rows[rows.length - 1]?.date}</span>
      </div>
    </div>
  );
}

function RowTable({ rows, label, volumes }: { rows: SearchRow[]; label: string; volumes?: Volumes }) {
  if (rows.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-10">この期間のデータはありません</p>;
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-400 border-b border-gray-100">
              <th className="text-left py-2 px-3 font-medium">{label}</th>
              {volumes && <th className="text-right py-2 pr-3 font-medium whitespace-nowrap">月間検索</th>}
              <th className="text-right py-2 pr-3 font-medium whitespace-nowrap">順位</th>
              <th className="text-right py-2 pr-3 font-medium whitespace-nowrap">表示</th>
              <th className="text-right py-2 pr-3 font-medium whitespace-nowrap">クリック</th>
              <th className="text-right py-2 pr-3 font-medium whitespace-nowrap">CTR</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const v = volumes?.[r.key];
              return (
                <tr key={r.key} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 px-3 text-gray-800 max-w-[12rem] truncate" title={r.key}>{r.key}</td>
                  {volumes && (
                    <td className="py-2 pr-3 text-right text-gray-500 tabular-nums">
                      {v?.searchVolume != null ? num(v.searchVolume) : "—"}
                    </td>
                  )}
                  <td className="py-2 pr-3 text-right">
                    <span className={cn("inline-block px-1.5 py-0.5 rounded-md font-semibold tabular-nums", positionTone(r.position))}>
                      {r.position}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-right text-gray-600 tabular-nums">{num(r.impressions)}</td>
                  <td className="py-2 pr-3 text-right font-semibold text-gray-900 tabular-nums">{num(r.clicks)}</td>
                  <td className="py-2 pr-3 text-right text-gray-500 tabular-nums">{r.ctr}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** 次に何をすればいいかの提案。数字を並べるだけでは動けないので、行き先を作る */
function ActionCard({ title, why, rows, tone, volumes }: {
  title: string; why: string; rows: SearchRow[];
  tone: "amber" | "violet"; volumes?: Volumes;
}) {
  const [open, setOpen] = useState(false);
  if (rows.length === 0) return null;
  const shown = open ? rows : rows.slice(0, 5);
  const styles = tone === "amber"
    ? "bg-amber-50 border-amber-200 text-amber-900"
    : "bg-violet-50 border-violet-200 text-violet-900";
  return (
    <div className={cn("rounded-2xl border p-4 mb-3", styles)}>
      <p className="text-sm font-bold flex items-center gap-1.5">
        {tone === "amber" ? <TrendingUp size={15} /> : <AlertTriangle size={15} />} {title}（{rows.length}件）
      </p>
      <p className="text-xs mt-1 leading-relaxed opacity-80">{why}</p>
      <ul className="mt-2.5 space-y-1">
        {shown.map((r) => {
          const v = volumes?.[r.key];
          return (
            <li key={r.key} className="flex items-baseline justify-between gap-3 text-xs">
              <span className="truncate font-medium" title={r.key}>{r.key}</span>
              <span className="flex-shrink-0 tabular-nums opacity-70">
                {r.position}位 ・ {num(r.impressions)}回表示
                {v?.searchVolume != null && ` ・ 月間${num(v.searchVolume)}`}
              </span>
            </li>
          );
        })}
      </ul>
      {rows.length > 5 && (
        <button type="button" onClick={() => setOpen(!open)}
          className="mt-2 text-xs font-semibold underline opacity-80 hover:opacity-100">
          {open ? "閉じる" : `のこり${rows.length - 5}件を見る`}
        </button>
      )}
    </div>
  );
}

/** つながっていないときの案内。何をすれば直るかを画面に出す */
function SetupCard({ error }: { error: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
        <Settings size={15} /> サーチコンソールにつながっていません
      </p>
      <p className="text-xs text-gray-500 mt-1 break-all">{error}</p>
      <p className="text-xs font-semibold text-gray-700 mt-3">やること（1回だけ）</p>
      <ol className="mt-1.5 space-y-2 text-xs text-gray-700 list-decimal list-inside leading-relaxed">
        <li>
          Vercel の <span className="font-mono font-semibold">GA4_CLIENT_EMAIL</span> の値をコピー
          （<span className="font-mono">…@….iam.gserviceaccount.com</span> という形）
        </li>
        <li>
          サーチコンソールを開いて
          <span className="font-semibold">「設定 → ユーザーと権限 → ユーザーを追加」</span>
        </li>
        <li>
          そのアドレスを貼って、権限は<span className="font-semibold">「制限付き」</span>で追加
        </li>
        <li>この画面を開き直すと数字が出ます</li>
      </ol>
      <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">
        どのサイトを見るかは自動で決まります。サーチコンソールに複数のサイトが登録してあって
        選べないときだけ、上のメッセージにサイト名が並びます。
      </p>
    </div>
  );
}

export function SeoClient({ overview, days, periods, volumes }: {
  overview: SearchOverview;
  days: number;
  periods: number[];
  volumes: Volumes;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"query" | "page">("query");

  const almost = useMemo(() => almostThere(overview.queries), [overview.queries]);
  const weak   = useMemo(() => weakCtr(overview.queries),     [overview.queries]);

  const t = overview.totals;
  const p = overview.prevTotals;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Search size={20} className="text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">SEO（検索からの集客）</h1>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">
          fitstage.jp がどの言葉で検索され、何位に出ているか
        </p>
      </div>

      {/* 期間 */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {periods.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => router.push(`/seo?days=${d}`)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-semibold transition",
                d === days ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700",
              )}
            >
              {d}日
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400">
          {fmtDate(overview.period.from)}〜{fmtDate(overview.period.to)}
          <span className="ml-1">（サーチコンソールは数日遅れます）</span>
          {overview.site && <span className="ml-1 break-all">／{overview.site}</span>}
        </p>
      </div>

      {overview.error ? (
        <SetupCard error={overview.error} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <StatCard icon={<MousePointerClick size={12} />} label="クリック" value={num(t.clicks)}
              now={t.clicks} prev={p.clicks} goodWhenUp note="検索結果から来た人数" />
            <StatCard icon={<Eye size={12} />} label="表示回数" value={num(t.impressions)}
              now={t.impressions} prev={p.impressions} goodWhenUp note="検索結果に出た回数" />
            <StatCard icon={<Trophy size={12} />} label="平均順位" value={String(t.position)} suffix="位"
              now={-t.position} prev={-p.position} goodWhenUp note="低いほど上に出ている" />
            <StatCard icon={<TrendingUp size={12} />} label="クリック率" value={String(t.ctr)} suffix="%"
              now={t.ctr} prev={p.ctr} goodWhenUp note="出たうち何%が押したか" />
          </div>

          <DailyChart rows={overview.daily} />

          {/* 次にやること */}
          <ActionCard
            tone="amber"
            title="あと一歩のキーワード"
            why={`${ALMOST_FROM - 0.5}〜${ALMOST_TO - 0.5}位。検索結果の2ページ目なので、ほとんど見られていません。ここを10位以内に押し上げるのがいちばん効きます。`}
            rows={almost}
            volumes={volumes}
          />
          <ActionCard
            tone="violet"
            title="出ているのに押されていないキーワード"
            why={`10位以内に入っているのにクリック率が${WEAK_CTR}%未満。順位ではなく、検索結果に出るタイトルや説明文が読まれていません。書き換えれば今日から効きます。`}
            rows={weak}
            volumes={volumes}
          />

          {/* 一覧 */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-3 mt-4">
            {([
              { value: "query" as const, label: "キーワード" },
              { value: "page"  as const, label: "ページ" },
            ]).map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setTab(o.value)}
                className={cn(
                  "flex-1 py-2 rounded-lg text-sm font-semibold transition",
                  tab === o.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>

          {tab === "query"
            ? <RowTable rows={overview.queries} label="キーワード" volumes={volumes} />
            : <RowTable rows={overview.pages}   label="ページ" />}

          <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">
            「月間検索」はラッコキーワードで調べた数字です（マスタ管理のキーワードに入っているものだけ出ます）。
            順位が低くても月間検索が多い言葉は、伸ばす価値があります。
          </p>
        </>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search, MousePointerClick, Eye, Trophy, Settings, Copy, Check,
  ChevronDown, ChevronUp, ExternalLink, TrendingUp, AlertTriangle, CircleDashed, ClipboardCopy,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Delta } from "@/components/ui/delta";
// 型と絞り込みだけを読む。lib/search-console.ts を読むと
// Google認証ライブラリまで端末に送られてしまう
import {
  PAGE_GROUP_LABEL, PAGE_GROUP_ORDER, positionWord, WEAK_CTR, buildPageBrief,
  type SearchOverview, type PageReport, type PageKeyword, type PageGroup, type SearchPeriod,
} from "@/lib/search-console-types";

type Volumes = Record<string, { searchVolume: number | null; seoDifficulty: number | null }>;

function num(n: number) {
  return n.toLocaleString("ja-JP");
}

function fmtDate(iso: string) {
  const [, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}`;
}

/** 順位の色。1ページ目（10位以内）に入っているかが分かれ目 */
function positionTone(p: number): string {
  if (p <= 0)  return "text-gray-400 bg-gray-50";
  if (p <= 3)  return "text-green-700 bg-green-50";
  if (p <= 10) return "text-blue-700 bg-blue-50";
  if (p <= 20) return "text-amber-700 bg-amber-50";
  return "text-gray-500 bg-gray-100";
}

// ─── 上の数字 ─────────────────────────────────────────

function StatCard({ icon, label, value, suffix, now, prev, note }: {
  icon: React.ReactNode; label: string; value: string; suffix?: string;
  now: number; prev?: number; note: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-3">
      <p className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">{icon} {label}</p>
      <p className="text-xl font-bold text-gray-900 mt-1 tabular-nums leading-tight">
        {value}<span className="text-xs font-semibold text-gray-400 ml-0.5">{suffix}</span>
      </p>
      <p className="text-[11px] text-gray-400 mt-0.5 flex items-center">
        {note}<Delta now={now} prev={prev} goodWhenUp className="ml-1" />
      </p>
    </div>
  );
}

/** クリック数の推移。棒の高さはpxで出す（％だと親の高さが決まらず0になる） */
function DailyChart({ rows }: { rows: SearchOverview["daily"] }) {
  const BAR_AREA = 48;
  if (rows.length === 0) return null;
  const max = Math.max(...rows.map((r) => r.clicks), 1);
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-5">
      <p className="text-xs font-semibold text-gray-500 mb-2">1日のクリック数</p>
      <div className="flex items-end gap-px" style={{ height: BAR_AREA }}>
        {rows.map((r) => (
          <div
            key={r.date}
            title={`${r.date} ${r.clicks}クリック`}
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

// ─── ページごと ───────────────────────────────────────

/** 順位は「下がった数字」が良い。前の期間より何位上がったかを出す */
function PositionChange({ now, prev }: { now: number; prev: number | null }) {
  if (prev == null || now <= 0) return null;
  const diff = Math.round((prev - now) * 10) / 10;   // プラス＝上がった
  if (Math.abs(diff) < 0.5) return <span className="text-[11px] text-gray-400 ml-1">→</span>;
  return (
    <span className={cn("text-[11px] font-semibold ml-1", diff > 0 ? "text-green-600" : "text-rose-600")}>
      {diff > 0 ? `↑${diff}` : `↓${Math.abs(diff)}`}
    </span>
  );
}

function KeywordRows({ rows, volumes, emphasis }: { rows: PageKeyword[]; volumes: Volumes; emphasis?: "amber" | "violet" }) {
  return (
    <ul className="divide-y divide-gray-100">
      {rows.map((k) => {
        const v = volumes[k.key];
        return (
          <li key={k.key} className="py-2 flex items-center gap-2">
            <span className={cn(
              "flex-shrink-0 w-14 text-center px-1 py-0.5 rounded-md text-xs font-bold tabular-nums",
              emphasis === "amber" ? "text-amber-700 bg-amber-50" :
              emphasis === "violet" ? "text-violet-700 bg-violet-50" : positionTone(k.position),
            )}>
              {k.position}位
            </span>
            <span className="flex-1 min-w-0 text-sm text-gray-800 truncate" title={k.key}>{k.key}</span>
            <span className="flex-shrink-0 text-[11px] text-gray-400 tabular-nums text-right leading-tight">
              表示 {num(k.impressions)}<br />
              {v?.searchVolume != null ? `月間 ${num(v.searchVolume)}` : `クリック ${num(k.clicks)}`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** HP側のクロードに貼る指示文をコピーする。この画面のいちばんの出口 */
function BriefButton({ copied, onClick }: { copied: boolean; onClick: () => void }) {
  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold transition"
      >
        {copied ? <><Check size={13} /> コピーしました。HPのセッションに貼ってください</> : <><ClipboardCopy size={13} /> HP側のクロードに渡す指示をコピー</>}
      </button>
      <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">
        数字と「何を直すか」が入った指示文です。HPを担当しているクロードコードにそのまま貼ると、作業が始まります。
      </p>
    </div>
  );
}

function PageCard({ page, volumes, period }: { page: PageReport; volumes: Volumes; period: SearchPeriod }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const none = page.impressions === 0;
  const todo = page.almost.length + page.weak.length;

  /** HP側のクロードに貼る指示文。数字を人が読み直すより、そのまま渡す方が速くて漏れない */
  async function copyBrief() {
    try {
      await navigator.clipboard.writeText(buildPageBrief(page, period, volumes));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full text-left px-4 py-3 hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{page.title}</p>
            {none ? (
              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                <CircleDashed size={11} /> まだ検索結果に出ていません
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-0.5 tabular-nums">
                クリック <span className="font-semibold text-gray-700">{num(page.clicks)}</span>
                <Delta now={page.clicks} prev={page.prevClicks} goodWhenUp className="ml-1" />
                <span className="mx-1.5 text-gray-300">・</span>
                表示 {num(page.impressions)}
                <span className="mx-1.5 text-gray-300">・</span>
                {page.keywordCount > 0 ? `${page.keywordCount}語` : "言葉は伏せられています"}
              </p>
            )}
          </div>
          {!none && (
            <div className="text-right flex-shrink-0">
              <span className={cn("inline-block px-2 py-1 rounded-lg text-sm font-bold tabular-nums", positionTone(page.position))}>
                <span className="text-[10px] font-semibold opacity-70 mr-0.5">平均</span>{page.position}位
              </span>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {positionWord(page.position)}
                <PositionChange now={page.position} prev={page.prevPosition} />
              </p>
            </div>
          )}
          {open
            ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" />
            : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
        </div>
        {!none && todo > 0 && !open && (
          <div className="flex gap-1.5 mt-2">
            {page.almost.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[11px] font-semibold">
                <TrendingUp size={10} /> あと一歩 {page.almost.length}語
              </span>
            )}
            {page.weak.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 text-[11px] font-semibold">
                <AlertTriangle size={10} /> 押されてない {page.weak.length}語
              </span>
            )}
          </div>
        )}
      </button>

      {open && none && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3">
          <p className="text-xs text-gray-500 leading-relaxed">
            この期間、検索結果に一度も出ていません。出ていない原因（登録されていない・内容が薄い・リンクが無い）をHP側で調べる必要があります。
          </p>
          <BriefButton copied={copied} onClick={copyBrief} />
        </div>
      )}

      {open && !none && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-4">
          <BriefButton copied={copied} onClick={copyBrief} />
          {page.almost.length > 0 && (
            <div>
              <p className="text-xs font-bold text-amber-700 flex items-center gap-1">
                <TrendingUp size={12} /> あと一歩（11〜20位）
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                2ページ目に出ている言葉。<span className="font-semibold">この言葉を見出しと本文に入れて内容を厚くする</span>と、1ページ目に上がりやすい。
              </p>
              <KeywordRows rows={page.almost} volumes={volumes} emphasis="amber" />
            </div>
          )}
          {page.weak.length > 0 && (
            <div>
              <p className="text-xs font-bold text-violet-700 flex items-center gap-1">
                <AlertTriangle size={12} /> 出ているのに押されていない
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                10位以内なのにクリック率{WEAK_CTR}%未満。順位ではなく<span className="font-semibold">検索結果に出るタイトルと説明文</span>の問題。この言葉を入れて書き直すと今日から効く。
              </p>
              <KeywordRows rows={page.weak} volumes={volumes} emphasis="violet" />
            </div>
          )}
          <div>
            <p className="text-xs font-bold text-gray-600">この言葉で出ています（表示の多い順）</p>
            {page.keywords.length > 0
              ? <KeywordRows rows={page.keywords} volumes={volumes} />
              : <p className="text-xs text-gray-400 py-2">Googleが言葉を出していません</p>}
            {page.keywordCount > page.keywords.length && (
              <p className="text-[11px] text-gray-400 mt-1">ほか {page.keywordCount - page.keywords.length}語</p>
            )}
            {page.hiddenImpressions > 0 && (
              <p className="text-[11px] text-gray-500 mt-2 leading-relaxed bg-gray-50 rounded-lg px-2.5 py-2">
                表示 {num(page.impressions)}回のうち <span className="font-semibold">{num(page.hiddenImpressions)}回は言葉が伏せられています</span>。
                Googleは検索する人が少ない言葉を出しません（個人が特定されないように）。
                「{page.title}」のような地域の言葉はほとんどこれに当たるので、出ている言葉が少なく見えます。
                上の順位・クリックは伏せられた分も含めた数字です。
              </p>
            )}
          </div>
          {page.url && (
            <a href={page.url} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
              <ExternalLink size={12} /> ページを開く
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function PageSection({ group, pages, volumes, period }: { group: PageGroup; pages: PageReport[]; volumes: Volumes; period: SearchPeriod }) {
  const [showAll, setShowAll] = useState(false);
  if (pages.length === 0) return null;
  // 記事は本数が多いので、最初は表示の多い10本だけ
  const limit = group === "blog" ? 10 : pages.length;
  const shown = showAll ? pages : pages.slice(0, limit);
  return (
    <section className="mb-6">
      <h2 className="text-sm font-bold text-gray-700 mb-2 px-1">
        {PAGE_GROUP_LABEL[group]}
        <span className="text-xs font-normal text-gray-400 ml-1.5">{pages.length}ページ</span>
      </h2>
      <div className="space-y-2">
        {shown.map((p) => <PageCard key={p.path} page={p} volumes={volumes} period={period} />)}
      </div>
      {pages.length > limit && !showAll && (
        <button type="button" onClick={() => setShowAll(true)}
          className="mt-2 w-full py-2 text-xs font-semibold text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">
          のこり{pages.length - limit}ページを見る
        </button>
      )}
    </section>
  );
}

// ─── つながっていないとき ─────────────────────────────

function SetupCard({ error, serviceAccount }: { error: string; serviceAccount?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!serviceAccount) return;
    try {
      await navigator.clipboard.writeText(serviceAccount);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // コピーできない端末もある。そのときは長押しで選んでもらう
      setCopied(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
        <Settings size={15} /> サーチコンソールにつながっていません
      </p>
      <p className="text-xs text-gray-500 mt-1 break-all">{error}</p>

      {/* Vercelの設定画面を探しに行かなくていいように、ここに出す。
          秘密なのは鍵の方で、このアドレスは貼る先に見せるもの。 */}
      {serviceAccount && (
        <div className="mt-4 rounded-xl bg-gray-50 border border-gray-200 p-3">
          <p className="text-[11px] font-semibold text-gray-500">サーチコンソールに追加するアドレス</p>
          <p className="text-xs font-mono text-gray-900 break-all mt-1 select-all">{serviceAccount}</p>
          <button
            type="button"
            onClick={copy}
            className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold transition"
          >
            {copied ? <><Check size={13} /> コピーしました</> : <><Copy size={13} /> コピーする</>}
          </button>
        </div>
      )}

      <p className="text-xs font-semibold text-gray-700 mt-4">やること（1回だけ）</p>
      <ol className="mt-1.5 space-y-2 text-xs text-gray-700 list-decimal list-inside leading-relaxed">
        <li>上のアドレスをコピー</li>
        <li>
          サーチコンソールを開いて
          <span className="font-semibold">「設定 → ユーザーと権限 → ユーザーを追加」</span>
        </li>
        <li>貼り付けて、権限は<span className="font-semibold">「制限付き」</span>のまま追加</li>
        <li>この画面を開き直すと数字が出ます</li>
      </ol>
    </div>
  );
}

// ─── 本体 ─────────────────────────────────────────────

export function SeoClient({ overview, days, periods, volumes }: {
  overview: SearchOverview;
  days: number;
  periods: number[];
  volumes: Volumes;
}) {
  const router = useRouter();
  const t = overview.totals;
  const p = overview.prevTotals;
  const byGroup = new Map<PageGroup, PageReport[]>();
  for (const pg of overview.pages) {
    const arr = byGroup.get(pg.group);
    if (arr) arr.push(pg);
    else byGroup.set(pg.group, [pg]);
  }
  const todoPages = overview.pages.filter((pg) => pg.almost.length + pg.weak.length > 0).length;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Search size={20} className="text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">SEO</h1>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">ページごとに、何位で・どの言葉で出ているか</p>
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
          {overview.site && <span className="ml-1 break-all">／{overview.site}</span>}
        </p>
      </div>

      {overview.error ? (
        <SetupCard error={overview.error} serviceAccount={overview.serviceAccount} />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <StatCard icon={<MousePointerClick size={12} />} label="クリック" value={num(t.clicks)}
              now={t.clicks} prev={p.clicks} note="検索から来た人" />
            <StatCard icon={<Eye size={12} />} label="表示" value={num(t.impressions)}
              now={t.impressions} prev={p.impressions} note="検索に出た回数" />
            <StatCard icon={<Trophy size={12} />} label="平均順位" value={String(t.position)} suffix="位"
              now={-t.position} prev={-p.position} note={positionWord(t.position)} />
          </div>

          <DailyChart rows={overview.daily} />

          <div className="rounded-2xl bg-blue-50 border border-blue-100 p-3 mb-5 text-xs text-blue-900 leading-relaxed">
            <span className="font-bold">見方：</span>
            右の順位は<span className="font-semibold">そのページが出た検索ぜんぶの平均</span>です（狙っている言葉で何位かは、タップした中の言葉ごとの順位を見てください）。
            タップすると「何をすれば上がるか」と、<span className="font-semibold">HP側のクロードに貼る指示文のコピー</span>が出ます。
            <span className="inline-block px-1.5 rounded bg-amber-100 text-amber-800 font-semibold mx-0.5">あと一歩</span>
            が付いているページから手を付けるのがいちばん効きます（いま {todoPages}ページ）。
          </div>

          {PAGE_GROUP_ORDER.map((g) => (
            <PageSection key={g} group={g} pages={byGroup.get(g) ?? []} volumes={volumes} period={overview.period} />
          ))}

          <p className="text-[11px] text-gray-400 leading-relaxed">
            サーチコンソールは数日遅れるので、直近3日は含めていません。
            「月間」はラッコキーワードで調べた月間検索数です（マスタ管理のキーワードに入っている言葉だけ出ます）。
          </p>
        </>
      )}
    </div>
  );
}

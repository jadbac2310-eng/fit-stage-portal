import type { SearchOverview, PageReport, PageKeyword } from "./search-console-types";

/**
 * HP・集客部（AI部署の3つ目。2026-11-16 稼働）。
 *
 * サーチコンソールの数字（/seo と同じ getSearchOverview。28日 vs その前の28日）から、
 * 社長に「今週どこを直すと効くか」を3つまでに絞って出す。純粋関数。
 * HP を直すのは HP のセッション（社長の OK のあと）。ここは見つけて提案するだけ。
 *
 * 選び方：
 *   1. 10位以内なのに押されていない言葉 → title / 説明文を直せばすぐ効く
 *   2. 11〜20位の言葉 → 見出しと本文を足せば1ページ目に届く
 *   3. クリックが大きく減ったページ → 何か起きていないか見る
 * 店舗・サービスのページを優先する（記事は後ろ）。
 */

export interface GrowthSuggestion {
  kind: "weak" | "almost" | "drop";
  pagePath: string;
  pageTitle: string;
  text: string;
}

export interface GrowthReport {
  period: { from: string; to: string };
  clicks: number;
  prevClicks: number;
  impressions: number;
  prevImpressions: number;
  /** 伸びたページ・落ちたページ（クリックの増減。上位2つずつ） */
  up: { title: string; diff: number }[];
  down: { title: string; diff: number }[];
  suggestions: GrowthSuggestion[];
}

const PRIORITY: Record<string, number> = { store: 0, service: 1, recruit: 2, en: 3, other: 4, blog: 5 };

function kw(k: PageKeyword): string {
  return `「${k.key}」${k.position}位（表示${k.impressions}回・クリック${k.clicks}回）`;
}

export function buildGrowthReport(o: SearchOverview, max = 3): GrowthReport | null {
  if (o.error || o.pages.length === 0) return null;
  const pages = [...o.pages].sort((a, b) => (PRIORITY[a.group] ?? 9) - (PRIORITY[b.group] ?? 9) || b.impressions - a.impressions);

  const suggestions: GrowthSuggestion[] = [];
  const used = new Set<string>();
  const push = (p: PageReport, kind: GrowthSuggestion["kind"], text: string) => {
    if (suggestions.length >= max || used.has(p.path)) return;
    used.add(p.path);
    suggestions.push({ kind, pagePath: p.path, pageTitle: p.title, text });
  };
  for (const p of pages) if (p.weak[0]) push(p, "weak", `${kw(p.weak[0])}。10位以内なのに押されていないので、タイトルと説明文にこの言葉を入れて書き直す`);
  for (const p of pages) if (p.almost[0]) push(p, "almost", `${kw(p.almost[0])}。あと少しで1ページ目なので、見出しと本文にこの言葉と答えを足す`);
  for (const p of pages) {
    if (p.prevClicks >= 5 && p.clicks <= p.prevClicks * 0.5) push(p, "drop", `クリックが ${p.prevClicks}回 → ${p.clicks}回 に減った。順位や表示の変化を確認する`);
  }

  const diffs = o.pages
    .map((p) => ({ title: p.title, diff: p.clicks - p.prevClicks }))
    .filter((d) => d.diff !== 0);
  return {
    period: o.period,
    clicks: o.totals.clicks,
    prevClicks: o.prevTotals.clicks,
    impressions: o.totals.impressions,
    prevImpressions: o.prevTotals.impressions,
    up: diffs.filter((d) => d.diff > 0).sort((a, b) => b.diff - a.diff).slice(0, 2),
    down: diffs.filter((d) => d.diff < 0).sort((a, b) => a.diff - b.diff).slice(0, 2),
    suggestions,
  };
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

/** 週1回（月曜）に社長へ送る LINE の本文 */
export function buildGrowthMessage(r: GrowthReport, pageUrl: string): string {
  const lines = [
    `📈 HP・集客部より：今週の検索の報告（${r.period.from}〜${r.period.to}・前の28日と比べて）`,
    `クリック ${r.clicks}回（${signed(r.clicks - r.prevClicks)}）／表示 ${r.impressions.toLocaleString("ja-JP")}回（${signed(r.impressions - r.prevImpressions)}）`,
  ];
  if (r.up.length) lines.push(`伸びた：${r.up.map((u) => `${u.title} ${signed(u.diff)}`).join("、")}`);
  if (r.down.length) lines.push(`落ちた：${r.down.map((u) => `${u.title} ${signed(u.diff)}`).join("、")}`);
  if (r.suggestions.length) {
    lines.push("", "■ 今週の提案");
    r.suggestions.forEach((s, i) => lines.push(`${i + 1}. ${s.pageTitle}：${s.text}`));
    lines.push("", "OK なら、ポータルの「SEO」で指示文をコピーして HP のセッションに渡してください。");
  }
  lines.push("", `▶ AI部署で見る\n${pageUrl}`);
  return lines.join("\n");
}

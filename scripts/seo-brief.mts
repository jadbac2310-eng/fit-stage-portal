/**
 * サーチコンソールを、クロードのセッションから直接読むためのスクリプト。
 *
 * ポータルの画面（/seo）と同じ計算を、画面を開かずに端末で出す。
 * 「江坂店の押されていない言葉を見て title を直して」を、コピペ無しで一気にやるためのもの。
 *
 *   npx jiti scripts/seo-brief.mts                       # 全ページの一覧
 *   npx jiti scripts/seo-brief.mts /store/esaka/         # そのページの指示文（画面のコピーボタンと同じ）
 *   npx jiti scripts/seo-brief.mts --q "江坂 パーソナルジム"   # この言葉で何位？
 *   npx jiti scripts/seo-brief.mts --days 90 /store/shonai/
 *   npx jiti scripts/seo-brief.mts --json /store/esaka/  # 数字をそのまま（JSON）
 *
 * 必要な環境変数（Vercel と同じ名前・同じ値。セッションの環境設定に入れておく）:
 *   GA4_CLIENT_EMAIL   サービスアカウントのメールアドレス
 *   GA4_PRIVATE_KEY    その秘密鍵（改行は \n のままでよい）
 *   SEARCH_CONSOLE_SITE_URL  （任意）見るサイト。無ければ権限のあるサイトを自動で選ぶ
 *
 * 月間検索数（ラッコ）は Supabase が要るので、このスクリプトでは出ない（順位・表示・クリックは出る）。
 */
import { createJiti } from "jiti";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const jiti = createJiti(import.meta.url, {
  alias: {
    "@": root,
    "next/cache": path.join(here, "_no-cache.mjs"),
  },
});

function usage(): never {
  console.log(`使い方:
  npx jiti scripts/seo-brief.mts                        全ページの一覧
  npx jiti scripts/seo-brief.mts /store/esaka/          そのページの指示文
  npx jiti scripts/seo-brief.mts --q "江坂 パーソナルジム"   この言葉で何位？
  オプション: --days 28|90|180（既定28） --json`);
  process.exit(0);
}

function parseArgs(argv: string[]) {
  let days = 28;
  let q: string | undefined;
  let json = false;
  let target: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") usage();
    else if (a === "--days") days = Number(argv[++i]);
    else if (a === "--q") q = argv[++i];
    else if (a === "--json") json = true;
    else if (a.startsWith("/")) target = a;
    else { console.error(`分からない引数: ${a}`); usage(); }
  }
  if (![28, 90, 180].includes(days)) { console.error("--days は 28 / 90 / 180 のどれか"); process.exit(1); }
  return { days, q, json, target };
}

function requireEnv() {
  const missing = ["GA4_CLIENT_EMAIL", "GA4_PRIVATE_KEY"].filter((k) => !process.env[k]);
  if (missing.length === 0) return;
  console.error(`サーチコンソールの鍵がありません: ${missing.join(", ")}

セッションの環境設定（タイトルバーのクラウド環境メニュー → Edit → 環境変数）に、
Vercel の Environment Variables と同じ名前・同じ値で入れてください。
入れたあとに始めた新しいセッションから使えます。チャットに鍵を貼らないでください。`);
  process.exit(2);
}

const yen = (n: number) => n.toLocaleString("ja-JP");

async function main() {
  const { days, q, json, target } = parseArgs(process.argv.slice(2));
  requireEnv();

  const S = await jiti.import(path.join(root, "lib/search-console.ts")) as typeof import("../lib/search-console");
  const T = await jiti.import(path.join(root, "lib/search-console-types.ts")) as typeof import("../lib/search-console-types");

  // ── この言葉で何位？ ──
  if (q) {
    const r = await S.lookupKeyword(days, q);
    if (json) { console.log(JSON.stringify(r, null, 2)); return; }
    if (r.note) console.log(r.note);
    for (const m of r.matches) {
      const rel = T.keywordReliability(m.impressions, days, m.monthlyVolume);
      console.log(`\n「${m.query}」 ${days}日で表示 ${yen(m.impressions)}・クリック ${yen(m.clicks)}`);
      if (rel.text) console.log(`  ${rel.level === "none" ? "ほぼ圏外：" : ""}${rel.text}`);
      for (const p of m.pages) console.log(`  ${String(p.position).padStart(5)}位  ${p.title}  （表示 ${yen(p.impressions)}）`);
    }
    return;
  }

  const o = await S.getSearchOverview(days);
  if (o.error) {
    console.error(`読めませんでした: ${o.error}`);
    if (o.serviceAccount) console.error(`サーチコンソールに追加するアドレス: ${o.serviceAccount}`);
    process.exit(3);
  }

  // ── そのページの指示文 ──
  if (target) {
    const page = o.pages.find((p) => p.path === target || p.path === target.replace(/\/?$/, "/"));
    if (!page) {
      console.error(`そのページは見つかりません: ${target}\nあるページ:\n${o.pages.map((p) => `  ${p.path}  ${p.title}`).join("\n")}`);
      process.exit(4);
    }
    if (json) { console.log(JSON.stringify({ period: o.period, site: o.site, page }, null, 2)); return; }
    console.log(T.buildPageBrief(page, o.period));
    return;
  }

  // ── 全ページの一覧 ──
  if (json) { console.log(JSON.stringify(o, null, 2)); return; }
  console.log(`${o.site ?? ""}  ${o.period.from}〜${o.period.to}`);
  console.log(`クリック ${yen(o.totals.clicks)}（前 ${yen(o.prevTotals.clicks)}）・表示 ${yen(o.totals.impressions)}（前 ${yen(o.prevTotals.impressions)}）・平均順位 ${o.totals.position}位（前 ${o.prevTotals.position}位）\n`);
  let group = "";
  for (const p of o.pages) {
    if (p.group !== group) { group = p.group; console.log(`\n■ ${T.PAGE_GROUP_LABEL[p.group]}`); }
    if (p.impressions === 0) { console.log(`  ${p.title.padEnd(22)}  まだ検索結果に出ていない  ${p.path}`); continue; }
    const todo = [p.almost.length ? `あと一歩${p.almost.length}` : "", p.weak.length ? `押されてない${p.weak.length}` : ""].filter(Boolean).join("・");
    console.log(`  ${p.title.padEnd(22)}  平均${String(p.position).padStart(5)}位  クリック ${String(p.clicks).padStart(5)}  表示 ${String(yen(p.impressions)).padStart(7)}  ${todo.padEnd(18)} ${p.path}`);
  }
  console.log("\n指示文: npx jiti scripts/seo-brief.mts /store/esaka/   言葉の順位: --q \"江坂 パーソナルジム\"");
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });

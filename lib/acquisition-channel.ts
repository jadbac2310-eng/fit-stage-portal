/**
 * 体験申込が「どこから来たか」を人が読める経路名にする。
 *
 * HPの entry.js が、最初に外からサイトへ来たときの 参照元ホスト・最初のページ・UTM を覚えていて、
 * 体験予約フォームの送信時に一緒に送ってくる。ここで「Google検索」「Googleマップ」「LINE」などに
 * まとめ、体験レッスンの備考に「経路: …」として残す（あとで経路別に数えるため）。
 */
export interface AcquisitionSource {
  source_referrer?: string;
  source_landing?: string;
  source_utm?: string;
}

/**
 * 参照元とUTMから、人が読める経路名にする。
 * 「経路: Google検索」のように備考へ残し、あとで経路別に数えられるようにする。
 */
export function channelLabel(b: AcquisitionSource): string | undefined {
  const ref = (b.source_referrer ?? "").toLowerCase();
  const utm = (b.source_utm ?? "").toLowerCase();
  const landing = (b.source_landing ?? "").trim();
  let label: string | undefined;
  if (/gclid=|utm_medium=cpc|utm_source=google.*utm_medium=(cpc|paid)/.test(utm)) label = "Google広告";
  else if (/fbclid=|utm_source=(instagram|facebook|meta)/.test(utm)) label = "Instagram・Facebook";
  else if (/utm_source=line/.test(utm)) label = "LINE";
  else if (/utm_source=gbp|utm_source=google.*utm_medium=organic|utm_source=maps/.test(utm)) label = "Googleマップ";
  else if (/utm_source=([a-z0-9_-]+)/.test(utm)) label = `その他（${/utm_source=([a-z0-9_-]+)/.exec(utm)![1]}）`;
  else if (/(^|\.)google\./.test(ref)) label = "Google検索";
  else if (/yahoo\./.test(ref)) label = "Yahoo検索";
  else if (/bing\.com/.test(ref)) label = "Bing検索";
  else if (/instagram\.com/.test(ref)) label = "Instagram";
  else if (/facebook\.com/.test(ref)) label = "Facebook";
  else if (/line\.me|line-apps/.test(ref)) label = "LINE";
  else if (/chatgpt\.com|openai\.com|perplexity|gemini\.google/.test(ref)) label = "AI検索（ChatGPTなど）";
  else if (/hotpepper|epark|minimo/.test(ref)) label = "ポータルサイト";
  else if (ref) label = `他サイト（${ref}）`;
  // 参照元もUTMも無い＝どこから来たか分からない。「直接」と書くと「LINEから来た」等と
  // 読まれてしまったため、2026-11-13 に「不明」へ言い換えた（尚樹OK）。
  // マップアプリ・LINE等のアプリ内ブラウザ・ブックマークなどがここに入る。
  else if (landing) label = UNKNOWN_LABEL;
  if (!label) return undefined;
  return landing ? `${label}　最初に見たページ ${pageWithName(landing)}` : label;
}

export const UNKNOWN_LABEL = "不明（どこから来たか記録なし）";

/**
 * 最初に見たページの名前。申し込んだ店舗と混同しないよう「庄内店のページ」のように出す。
 * 分からないパスはそのまま返す。
 */
const PAGE_NAMES: [RegExp, string][] = [
  [/^\/store\/esaka\//, "江坂店のページ"],
  [/^\/store\/shonai\//, "庄内店のページ"],
  [/^\/store\/sone-shiroyama\//, "曽根城山店のページ"],
  [/^\/store\/reserve\//, "体験予約フォーム"],
  [/^\/store\/?$/, "店舗一覧"],
  [/^\/service\/senior\//, "シニア向けのページ"],
  [/^\/service\/personal\//, "出張パーソナルのページ"],
  [/^\/service\//, "サービスのページ"],
  [/^\/price\//, "料金のページ"],
  [/^\/trainer\//, "トレーナー紹介"],
  [/^\/blog\/.+/, "ブログ記事"],
  [/^\/en\//, "英語のページ"],
  [/^\/?$/, "トップページ"],
];

export function pageWithName(path: string): string {
  const p = path.trim();
  const hit = PAGE_NAMES.find(([re]) => re.test(p));
  return hit ? `${hit[1]}（${p}）` : p;
}

/**
 * 保存済みの経路の文を、今の書き方に直して表示する（備考は申込時の文のまま保存されているため）。
 * 「直接（ブックマーク…）　最初のページ /store/shonai/」
 *   → 「不明（どこから来たか記録なし）　最初に見たページ 庄内店のページ（/store/shonai/）」
 */
export function prettyChannelText(text: string): string {
  return text
    .replace("直接（ブックマーク・LINEのリンク・マップなど）", UNKNOWN_LABEL)
    .replace(/　最初のページ (\S+)/, (_m, p: string) => `　最初に見たページ ${pageWithName(p)}`);
}

/** 集計用に経路の種類だけを取り出す（「Google検索」「不明」など。最初に見たページは落とす） */
export function channelKind(text: string): string {
  const head = text.split(/[（(]|　最初/)[0].trim();
  return head === "直接" ? "不明" : head;
}

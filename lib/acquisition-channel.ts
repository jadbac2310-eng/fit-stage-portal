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
  else if (landing) label = "直接（ブックマーク・LINEのリンク・マップなど）";
  if (!label) return undefined;
  return landing ? `${label}　最初のページ ${landing}` : label;
}

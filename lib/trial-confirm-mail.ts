/**
 * 体験レッスンの「ご予約確定」メールの文面を組み立てる（2026-11-14 尚樹の依頼）。
 *
 * 体験予約の画面の「確定メール」ボタンから使う。名前・日時・店舗・担当トレーナーは
 * 予約の内容から自動で入り、送る前に画面で「ひとこと」を足したり本文を直したりできる。
 *
 * 店舗の住所・アクセス・LINE は HP（fitstage.jp）の表記と揃えている。
 * 料金・キャンセル規定を変えたら、HP の CLAUDE.md の「サイトの基本情報」とここを両方直す。
 */

export interface StoreInfo {
  key: "esaka" | "shonai" | "sone-shiroyama";
  name: string;        // 「FIT STAGE 江坂店」の「江坂店」
  address: string;
  access: string;
  url: string;
}

export const STORE_INFO: StoreInfo[] = [
  {
    key: "esaka",
    name: "江坂店",
    address: "〒564-0051 大阪府吹田市豊津町5-27 ドムス江坂Ⅱ-A",
    access: "地下鉄御堂筋線「江坂駅」より徒歩約6分",
    url: "https://www.fitstage.jp/store/esaka/",
  },
  {
    key: "shonai",
    name: "庄内店",
    address: "〒561-0821 大阪府豊中市日出町1丁目2-7 1F",
    access: "阪急宝塚線「庄内駅」より徒歩8分",
    url: "https://www.fitstage.jp/store/shonai/",
  },
  {
    key: "sone-shiroyama",
    name: "曽根城山店",
    address: "〒561-0803 大阪府豊中市城山町2丁目7-2 城山荘2F",
    access: "阪急宝塚線「服部天神駅」「曽根駅」より徒歩約10分",
    url: "https://www.fitstage.jp/store/sone-shiroyama/",
  },
];

/** 店舗パーソナル用の公式LINE（HPの /store/ 配下と同じ） */
export const STORE_LINE_URL = "https://lin.ee/XkPbVRr";
export const FITSTAGE_TEL = "070-2397-1822";

/** 店舗名らしき文字列（店舗マスタの名前・申込の希望店舗）から店舗を選ぶ */
export function findStore(...names: (string | undefined | null)[]): StoreInfo | undefined {
  for (const n of names) {
    const s = (n ?? "").trim();
    if (!s) continue;
    if (s.includes("江坂")) return STORE_INFO[0];
    if (s.includes("庄内")) return STORE_INFO[1];
    if (s.includes("曽根") || s.includes("城山")) return STORE_INFO[2];
  }
  return undefined;
}

/** 「2026年11月27日（金）11:30〜12:30」（日本時間・60分） */
export function jstSlotLabel(iso: string, minutes = 60): string {
  const start = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  const end = new Date(start.getTime() + minutes * 60 * 1000);
  const wd = ["日", "月", "火", "水", "木", "金", "土"][start.getUTCDay()];
  const hm = (d: Date) => `${d.getUTCHours()}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  return `${start.getUTCFullYear()}年${start.getUTCMonth() + 1}月${start.getUTCDate()}日（${wd}）${hm(start)}〜${hm(end)}`;
}

/** 名前の「姓　名」の間の空白をそろえる（「川野　夢」→「川野 夢」） */
function tidyName(name: string): string {
  return name.trim().replace(/[\s　]+/g, " ");
}

/** 申込の「利用人数」から2名かどうか（ペア料金にするため） */
export function isPair(people?: string): boolean {
  // 「1名（25歳・女性）」の年齢の数字を拾わないよう、先頭の人数とペアの語だけを見る
  const p = (people ?? "").trim();
  return /^(2|２)\s*(名|人)|ペア|二人|2人|２人/.test(p);
}

export interface ConfirmMailInput {
  customerName: string;
  scheduledAt: string;          // ISO
  store?: StoreInfo;            // 店舗が分からないときは placeText を使う
  placeText?: string;
  trainerName?: string;
  pair?: boolean;
  /** お客様の申込内容に合わせた一言（空なら入れない） */
  personalNote?: string;
  /** 「予約を確認しました」ボタンのリンク（lib/trial-confirm-token.ts。無ければ確認のお願いの段落を入れない） */
  confirmUrl?: string;
}

/** 本文の中でボタンになる行（HTML版ではこの行と次のURLの行を1つのボタンにする） */
export const CONFIRM_BUTTON_LINE = "▶ 予約を確認しました（ここを押してください）";

export function buildConfirmMail(i: ConfirmMailInput): { subject: string; body: string } {
  const name = tidyName(i.customerName);
  const start = new Date(new Date(i.scheduledAt).getTime() + 9 * 3600 * 1000);
  const shortDate = `${start.getUTCMonth() + 1}/${start.getUTCDate()}`;
  const placeShort = i.store?.name ?? i.placeText?.trim() ?? "";
  const subject = `【FIT STAGE】体験レッスンのご予約確定のお知らせ（${shortDate}${placeShort ? ` ${placeShort}` : ""}）`;

  const place: string[] = i.store
    ? [
        `店舗：FIT STAGE ${i.store.name}`,
        `住所：${i.store.address}`,
        `アクセス：${i.store.access}`,
      ]
    : i.placeText?.trim()
      ? [`場所：${i.placeText.trim()}`]
      : ["場所：（ここに場所を入れてください）"];

  const lines: (string | null)[] = [
    `${name} 様`,
    "",
    "このたびは FIT STAGE の体験レッスンにお申し込みいただき、誠にありがとうございます。",
    "下記の内容でご予約が確定いたしましたので、ご案内いたします。",
    "",
    "■ ご予約内容",
    `日時：${jstSlotLabel(i.scheduledAt)}`,
    ...place,
    `内容：体験パーソナルトレーニング（60分・${i.pair ? "2名" : "1名"}）`,
    i.trainerName ? `担当トレーナー：${tidyName(i.trainerName)}` : null,
    "",
    ...(i.confirmUrl
      ? [
          "■ ご予約の確認のお願い",
          "ご予約内容に問題がなければ、下の「予約を確認しました」ボタンを押してください。",
          CONFIRM_BUTTON_LINE,
          i.confirmUrl,
          "※ボタンが押されていない方には、お電話にてご予約を確認させていただく場合がございます。",
          "",
        ]
      : []),
    "■ 体験料金",
    i.pair ? "9,900円（税込・2名合計）" : "6,600円（税込）",
    "お支払いは、現金・クレジットカード・PayPay がご利用いただけます。",
    "",
    "■ 持ち物",
    "・動きやすい服装でお越しください。",
    "・お飲み物（お水など）をお持ちいただくと安心です。",
    "",
    ...(i.personalNote?.trim() ? [i.personalNote.trim(), ""] : []),
    "当日は、普段の運動習慣や気になるところを伺いながら進めますので、どうぞ気軽にお越しください。",
    "",
    "■ お時間の変更・お問い合わせ",
    "お時間の変更やお問い合わせは、下記のLINEにてお願いいたします。お電話でも承ります。",
    "前日21時までにご連絡いただければ、変更・キャンセルは無料です。",
    "",
    "当日お会いできることを楽しみにしております。",
    "ご不明な点がございましたら、お気軽にお問い合わせください。",
    "",
    "――――――――――",
    `FIT STAGE${i.store ? ` ${i.store.name}` : ""}`,
    i.trainerName ? `担当：${tidyName(i.trainerName)}` : null,
    `TEL：${FITSTAGE_TEL}`,
    `LINE：${STORE_LINE_URL}`,
    `Web：${i.store?.url ?? "https://www.fitstage.jp/"}`,
    "――――――――――",
  ];
  return { subject, body: lines.filter((l): l is string => l !== null).join("\n") };
}

/**
 * 申込内容から「一言足したほうがよさそうな点」を拾う（画面に目印として出すだけ。本文には勝手に入れない）。
 * 駐車場・人数・日時の補足・ご要望など、定型文では答えられないもの。
 */
export function hintsFromApplication(items: { label: string; value: string }[]): string[] {
  const get = (l: string) => items.find((x) => x.label === l)?.value?.trim() ?? "";
  const hints: string[] = [];
  const parking = get("駐車場");
  if (parking && !/不要|使わない|なし|徒歩|電車/.test(parking)) hints.push(`駐車場：「${parking}」→ 停める場所の案内を一言`);
  const people = get("利用人数");
  if (isPair(people)) hints.push(`利用人数：「${people}」→ ペア料金（9,900円・2名合計）で入れています。お連れ様のお名前があれば一言`);
  const note = get("日時の補足");
  if (note) hints.push(`日時の補足：「${note}」`);
  const wish = get("詳しい内容・ご要望");
  if (wish) hints.push(`ご要望：「${wish}」→ ひとことで触れているか確認`);
  const trainer = get("希望トレーナー");
  if (trainer && !/指名なし|なし|ない/.test(trainer)) hints.push(`希望トレーナー：「${trainer}」→ 担当が希望どおりか確認`);
  return hints;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * 本文（テキスト）からHTML版を作る。中身はテキストと同じで、
 * 「予約を確認しました」の行と次のURLの行だけを、押しやすいボタンにする。
 * テキスト版も一緒に送るので、HTMLを表示しないメールソフトでもURLを押せば同じ。
 */
export function confirmMailHtml(body: string, confirmUrl?: string): string {
  const lines = body.split("\n");
  const out: string[] = [];
  const linkify = (s: string) =>
    escapeHtml(s).replace(/https?:\/\/[^\s<]+/g, (u) => `<a href="${u}" style="color:#17284b">${u}</a>`);
  for (let k = 0; k < lines.length; k++) {
    const line = lines[k];
    if (confirmUrl && line.trim() === CONFIRM_BUTTON_LINE && lines[k + 1]?.trim() === confirmUrl) {
      out.push(
        `<div style="margin:14px 0 10px"><a href="${escapeHtml(confirmUrl)}" ` +
        `style="display:inline-block;background:#17284b;color:#ffffff;text-decoration:none;font-weight:bold;` +
        `font-size:16px;padding:14px 28px;border-radius:6px;border-bottom:3px solid #C9A84C">予約を確認しました</a></div>`,
      );
      k++; // URL の行はボタンに含めた
      continue;
    }
    out.push(line === "" ? "<br>" : `${linkify(line)}<br>`);
  }
  return `<div style="font-family:-apple-system,'Hiragino Sans','Hiragino Kaku Gothic ProN',Meiryo,sans-serif;font-size:14px;line-height:1.8;color:#222">${out.join("\n")}</div>`;
}

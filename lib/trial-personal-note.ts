import Anthropic from "@anthropic-ai/sdk";

/**
 * 体験の確定メールに入れる「ひとこと」を、お客様の申込内容に合わせて作る（2026-11-14 尚樹の依頼）。
 * 画面では下書きとして入るだけで、送る前に必ず人が読んで直せる。
 *
 * AI（Claude）で作文し、つながらない・断られたときは決まった言い回しで作る（作れなければ空）。
 * モデルは Vercel の環境変数 MAIL_NOTE_MODEL で切り替えられる（既定 claude-opus-5-5、短い文なので effort は low）。
 * 送るのは申込内容のうち一言に必要な項目だけ（名前・連絡先は送らない）。
 */

export interface NoteSource {
  goals?: string;      // お悩み・目的
  wish?: string;       // 詳しい内容・ご要望
  habit?: string;      // 運動習慣
  parking?: string;    // 駐車場
  people?: string;     // 利用人数
}

const SYSTEM = `あなたはパーソナルトレーニングジム「FIT STAGE」のスタッフです。
体験レッスンの予約確定メールに入れる「ひとこと」を書きます。日時・場所・料金・持ち物・キャンセル規定はメールの別の欄に書いてあるので、繰り返さないでください。

書き方：
- お客様の申込内容（目的・ご要望・運動習慣）に触れた、1〜2文・合計90字以内の文。
- 丁寧な標準語。ただし堅すぎない。絵文字・記号の飾りは使わない。
- 「必ず痩せる」「〇kg落とせる」のような結果の約束、医療的な効果、「施術」「治療」という言葉は使わない。
- 店舗の設備（駐車場・駐輪場・更衣室など）があるとは書かない。車や自転車で来られる場合は「駐車・駐輪について気になる点があれば、お気軽にご連絡ください」の趣旨を短く添えてよい。
- ご要望が空なら、目的に触れた一般的な一言にする。
- 出力は「ひとこと」の文だけ。前置き・かぎかっこ・説明は付けない。`;

function sourceText(s: NoteSource): string {
  return [
    s.goals && `お悩み・目的: ${s.goals}`,
    s.wish && `詳しい内容・ご要望: ${s.wish}`,
    s.habit && `運動習慣: ${s.habit}`,
    s.parking && `来店方法・駐車場: ${s.parking}`,
    s.people && `利用人数: ${s.people}`,
  ].filter(Boolean).join("\n");
}

/** AI が使えないときの決まった言い回し（目的の最初の項目に触れるだけ） */
export function fallbackPersonalNote(s: NoteSource): string {
  const goal = (s.goals ?? "").split(/[、,]/)[0]?.trim();
  if (!goal) return "";
  return `「${goal}」というご希望を伺いましたので、当日はそこを中心に、無理のない内容でご案内いたします。`;
}

export async function writePersonalNote(s: NoteSource): Promise<{ text: string; by: "ai" | "template" }> {
  const input = sourceText(s);
  if (!input) return { text: "", by: "template" };
  if (!process.env.ANTHROPIC_API_KEY) return { text: fallbackPersonalNote(s), by: "template" };
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 25_000, maxRetries: 1 });
    const res = await anthropic.messages.create({
      model: process.env.MAIL_NOTE_MODEL?.trim() || "claude-opus-5-5",
      max_tokens: 2000,
      output_config: { effort: "low" },
      system: SYSTEM,
      messages: [{ role: "user", content: `お客様の申込内容：\n${input}` }],
    });
    if (res.stop_reason === "refusal") return { text: fallbackPersonalNote(s), by: "template" };
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim()
      .replace(/^[「『]|[」』]$/g, "");
    if (!text) return { text: fallbackPersonalNote(s), by: "template" };
    return { text, by: "ai" };
  } catch (e) {
    console.error("[trial-personal-note] AIでの作文に失敗", e);
    return { text: fallbackPersonalNote(s), by: "template" };
  }
}

import Anthropic from "@anthropic-ai/sdk";
import { ORDER_DEPTS, keywordDept, fallbackTitle, deptByKey, type OrderDeptKey } from "./ai-orders";

/**
 * 指示の文から、担当の部署と短い題名を決める（統括本部長の仕事）。
 * 渡すのは指示の文だけ。モデルは Vercel の AI_OFFICE_MODEL（既定 claude-haiku-5-5。短い分類なので安いモデルで十分）。
 * AI が使えない・答えが変なときは、言葉で決める（keywordDept）。
 */
export async function classifyOrder(text: string): Promise<{ dept: OrderDeptKey; title: string; by: "ai" | "rule" }> {
  const rule = { dept: keywordDept(text), title: fallbackTitle(text), by: "rule" as const };
  if (!process.env.ANTHROPIC_API_KEY) return rule;
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 20_000, maxRetries: 1 });
    const res = await anthropic.messages.create({
      model: process.env.AI_OFFICE_MODEL?.trim() || "claude-haiku-5-5",
      max_tokens: 300,
      system: [
        "あなたはパーソナルジム FIT STAGE の統括本部長です。社長の指示を、担当の部署に振り分けます。",
        "部署（key：担当）",
        ...ORDER_DEPTS.map((d) => `- ${d.key}：${d.name}（${d.hint}）`),
        "答えは JSON だけ：{\"dept\":\"<key>\",\"title\":\"<やることの題名。20字以内。です・ます無し>\"}",
      ].join("\n"),
      messages: [{ role: "user", content: text.slice(0, 2000) }],
    });
    const raw = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("");
    const json = raw.match(/\{[\s\S]*\}/)?.[0];
    if (!json) return rule;
    const parsed = JSON.parse(json) as { dept?: string; title?: string };
    const dept = parsed.dept && deptByKey(parsed.dept) ? (parsed.dept as OrderDeptKey) : rule.dept;
    const title = parsed.title?.trim().slice(0, 40) || rule.title;
    return { dept, title, by: "ai" };
  } catch (e) {
    console.error("[ai-orders] 振り分けに失敗", e);
    return rule;
  }
}

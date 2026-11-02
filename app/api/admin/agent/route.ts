import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { getCurrentIsAdmin } from "@/lib/members";
import { ASSISTANT_TOOLS, runAssistantTool, type ToolInput } from "@/lib/assistant-tools";
import { assistantSystemPrompt } from "@/lib/assistant-prompt";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Hobby プランの上限が60秒。道具を何回か呼んでも収まる（それ以上は MAX_TOOL_ROUNDS で止める）
export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

/**
 * モデル。Vercel の環境変数 ASSISTANT_MODEL で切り替えられる。
 * 既定は Sonnet（質問の意図のくみ取りと、複数の道具を組み合わせる力が Haiku より明らかに上）。
 * 安くしたいときは claude-haiku-5-5。
 */
const MODEL = process.env.ASSISTANT_MODEL?.trim() || "claude-sonnet-5-5";
/** 1つの質問で道具を呼べる回数の上限（複数の角度から調べるのに十分な数） */
const MAX_TOOL_ROUNDS = 12;

export async function POST(request: NextRequest) {
  if (!(await getCurrentIsAdmin())) {
    return new Response(JSON.stringify({ error: "権限がありません（管理者のみ）" }), {
      status: 403, headers: { "Content-Type": "application/json" },
    });
  }

  const { messages } = await request.json();
  const encoder = new TextEncoder();
  const system = assistantSystemPrompt();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: object) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        // 画面から来るのは文字だけ（道具の結果は含まない）。空の発言は API が受け付けないので落とす
        let currentMessages: Anthropic.MessageParam[] = (messages as { role: string; content: string }[])
          .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
        if (currentMessages.length === 0 || currentMessages[0].role !== "user") {
          send({ type: "error", message: "質問が空です" });
          return;
        }

        for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
          const s = anthropic.messages.stream({
            model: MODEL,
            max_tokens: 8192,
            output_config: { effort: "medium" },
            // 案内文と道具の定義は毎回同じなので、ここまでをキャッシュする（道具→案内文の順に前置きになる）
            system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
            tools: ASSISTANT_TOOLS,
            messages: currentMessages,
          });
          // 文章は出た端から画面へ流す（道具を使う前の一言も含む）
          for await (const event of s) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta" && event.delta.text) {
              send({ type: "text", text: event.delta.text });
            }
          }
          const response = await s.finalMessage();

          if (response.stop_reason === "refusal") {
            send({ type: "error", message: "この質問には答えられませんでした。言い方を変えて聞いてみてください" });
            break;
          }
          if (response.stop_reason !== "tool_use") break;

          const toolUseBlocks = response.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
          );
          // 複数の道具を同時に頼まれたら並列に実行して、結果はまとめて1つの発言で返す
          const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
            toolUseBlocks.map(async (block) => {
              send({ type: "tool", name: block.name, input: block.input });
              const result = await runAssistantTool(block.name, block.input as ToolInput);
              return { type: "tool_result" as const, tool_use_id: block.id, content: result };
            }),
          );

          currentMessages = [
            ...currentMessages,
            { role: "assistant", content: response.content },
            { role: "user", content: toolResults },
          ];
          if (round === MAX_TOOL_ROUNDS) {
            send({ type: "text", text: "\n\n（調べる回数の上限に達しました。質問を分けて聞いてください）" });
          }
        }

        send({ type: "done" });
      } catch (e) {
        console.error("[assistant]", e);
        const msg = e instanceof Anthropic.AuthenticationError ? "AIの接続設定（ANTHROPIC_API_KEY）が正しくありません"
          : e instanceof Anthropic.RateLimitError ? "混み合っています。少し待ってからもう一度"
          : e instanceof Anthropic.APIError ? `AIの呼び出しに失敗しました（${e.status}: ${e.message}）`
          : String(e);
        send({ type: "error", message: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
  });
}

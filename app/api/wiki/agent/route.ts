import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import * as wiki from "@/lib/wiki";
import { createAuthClient } from "@/lib/supabase";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const SYSTEM = `あなたはFIT STAGEポータルのWikiエージェントです。
ユーザーの指示に従って、Wikiページを作成・編集・削除します。

## フォルダについて
- Wikiページは必ずフォルダに属します。Wiki直下にページを作成することはできません
- ページ作成時は必ずfolderを指定してください（例：「マニュアル」「ガイドライン」「規則」など）
- フォルダ名は日本語でもURLフレンドリーな英語でも構いません
- 既存フォルダに追加するか新しいフォルダを作るかはユーザーに確認するか、文脈から判断してください

## 重要なルール
- ユーザーからテキストや資料が提供された場合、内容を**一切省略・要約・圧縮せず**、すべての情報をそのままMarkdownに変換してください
- 長文であっても省略記号（…）や「詳細は省略」などを使わず、全文をページに含めてください
- Markdownへの変換は「構造化」であり「要約」ではありません。元の情報量を保ったまま、見出し・箇条書き・表などで読みやすく整形してください

## その他のルール
- slugはURLフレンドリーな英語（小文字・ハイフン区切り）で生成してください
- カテゴリはページの内容に合わせて日本語で設定してください（任意）
- 既存ページの更新時は必ずget_pageで現在の内容を確認してから更新してください`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "list_folders",
    description: "既存のフォルダ一覧と各フォルダのページ数を取得します",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "list_pages",
    description: "Wikiページの一覧を取得します",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_page",
    description: "特定のWikiページの内容を取得します",
    input_schema: {
      type: "object",
      properties: { slug: { type: "string", description: "ページのslug" } },
      required: ["slug"],
    },
  },
  {
    name: "create_page",
    description: "新しいWikiページをフォルダ内に作成します",
    input_schema: {
      type: "object",
      properties: {
        folder:   { type: "string", description: "所属するフォルダ名（必須）" },
        title:    { type: "string", description: "ページのタイトル" },
        slug:     { type: "string", description: "URLフレンドリーなID（英語・ハイフン区切り）" },
        category: { type: "string", description: "カテゴリ名（任意）" },
        content:  { type: "string", description: "Markdown形式のコンテンツ" },
      },
      required: ["folder", "title", "slug", "content"],
    },
  },
  {
    name: "update_page",
    description: "既存のWikiページを更新します",
    input_schema: {
      type: "object",
      properties: {
        slug:     { type: "string", description: "更新するページのslug" },
        folder:   { type: "string", description: "フォルダ名（変更する場合）" },
        title:    { type: "string" },
        category: { type: "string" },
        content:  { type: "string" },
      },
      required: ["slug"],
    },
  },
  {
    name: "delete_page",
    description: "Wikiページを削除します",
    input_schema: {
      type: "object",
      properties: { slug: { type: "string" } },
      required: ["slug"],
    },
  },
];

type ToolInput = Record<string, string | undefined>;

async function runTool(name: string, input: ToolInput, currentUserId?: string): Promise<string> {
  try {
    switch (name) {
      case "list_folders": {
        const pages = await wiki.getWikiPages();
        const folderMap = pages.reduce<Record<string, number>>((acc, p) => {
          acc[p.folder] = (acc[p.folder] ?? 0) + 1;
          return acc;
        }, {});
        return JSON.stringify(Object.entries(folderMap).map(([folder, count]) => ({ folder, count })));
      }
      case "list_pages": {
        const pages = await wiki.getWikiPages();
        return JSON.stringify(pages.map((p) => ({ slug: p.slug, title: p.title, folder: p.folder, category: p.category })));
      }
      case "get_page": {
        const page = await wiki.getWikiPage(input.slug!);
        return page ? JSON.stringify(page) : "ページが見つかりません";
      }
      case "create_page": {
        const page = await wiki.createWikiPage({
          title:     input.title!,
          slug:      input.slug!,
          folder:    input.folder!,
          category:  input.category,
          content:   input.content!,
          createdBy: currentUserId,
        });
        return JSON.stringify({ success: true, slug: page.slug, title: page.title, folder: page.folder });
      }
      case "update_page": {
        const page = await wiki.updateWikiPage(input.slug!, {
          title:    input.title,
          folder:   input.folder,
          category: input.category,
          content:  input.content,
        });
        return JSON.stringify({ success: true, slug: page?.slug, title: page?.title, folder: page?.folder });
      }
      case "delete_page": {
        await wiki.deleteWikiPage(input.slug!);
        return JSON.stringify({ success: true });
      }
      default:
        return "Unknown tool";
    }
  } catch (e) {
    return JSON.stringify({ error: String(e) });
  }
}

type ApiFile = { name: string; type: string; data: string };

function buildUserContent(text: string, files: ApiFile[]): Anthropic.ContentBlockParam[] {
  const blocks: Anthropic.ContentBlockParam[] = [];

  for (const file of files) {
    if (file.type.startsWith("image/")) {
      blocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: file.type as Anthropic.Base64ImageSource["media_type"],
          data: file.data,
        },
      });
    } else {
      const decoded = Buffer.from(file.data, "base64").toString("utf-8");
      blocks.push({
        type: "text",
        text: `添付ファイル「${file.name}」の内容:\n\`\`\`\n${decoded}\n\`\`\``,
      });
    }
  }

  if (text) blocks.push({ type: "text", text });
  return blocks;
}

export async function POST(request: NextRequest) {
  const { messages, folder, files = [], editSlug } = await request.json();
  const { data: { user } } = await (await createAuthClient()).auth.getUser();
  const currentUserId = user?.id;
  const encoder = new TextEncoder();

  let systemPrompt = SYSTEM;
  if (folder)   systemPrompt += `\n\n## 現在のコンテキスト\n操作対象フォルダ：「${folder}」\nこのセッションで作成するページは特に指定がない限り「${folder}」フォルダに作成してください。`;
  if (editSlug) systemPrompt += `\n\n## 編集対象ページ\nslug「${editSlug}」のページを編集するセッションです。まず get_page でページ内容を読み込み、ユーザーの指示に従って更新してください。`;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: object) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));

      try {
        const baseMessages: Anthropic.MessageParam[] = messages.map(
          (m: { role: string; content: string }, idx: number) => {
            if (idx === messages.length - 1 && m.role === "user" && files.length > 0) {
              return { role: m.role, content: buildUserContent(m.content, files) };
            }
            return m;
          }
        );
        let currentMessages: Anthropic.MessageParam[] = baseMessages;

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const response = await anthropic.messages.create({
            model: "claude-opus-4-7",
            max_tokens: 16000,
            system: systemPrompt,
            messages: currentMessages,
            tools: TOOLS,
          });

          for (const block of response.content) {
            if (block.type === "text" && block.text) {
              send({ type: "text", text: block.text });
            }
          }

          if (response.stop_reason !== "tool_use") break;

          const toolUseBlocks = response.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
          );
          const toolResults: Anthropic.ToolResultBlockParam[] = [];

          for (const block of toolUseBlocks) {
            send({ type: "tool", name: block.name, input: block.input });
            const result = await runTool(block.name, block.input as ToolInput, currentUserId);
            send({ type: "tool_result", name: block.name, result: JSON.parse(result) });
            toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
          }

          currentMessages = [
            ...currentMessages,
            { role: "assistant", content: response.content },
            { role: "user",      content: toolResults },
          ];
        }

        send({ type: "done" });
      } catch (e) {
        send({ type: "error", message: String(e) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
  });
}

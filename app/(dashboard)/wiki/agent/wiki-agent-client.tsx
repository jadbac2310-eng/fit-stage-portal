"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Send, Bot, User, BookOpen, Pencil, Trash2, List, Loader2 } from "lucide-react";
import Link from "next/link";
import { MarkdownRenderer } from "@/components/markdown-renderer";

type TextPart = { kind: "text"; text: string };
type ToolPart = { kind: "tool"; name: string; input: Record<string, unknown>; result?: Record<string, unknown> };
type MessageParts = TextPart | ToolPart;

type Message = {
  role: "user" | "assistant";
  parts: MessageParts[];
};

const TOOL_LABELS: Record<string, string> = {
  list_folders: "フォルダ一覧を確認",
  list_pages:   "ページ一覧を確認",
  get_page:     "ページを読み込み",
  create_page:  "ページを作成",
  update_page:  "ページを更新",
  delete_page:  "ページを削除",
};

const TOOL_ICONS: Record<string, React.ReactNode> = {
  list_folders: <List size={13} />,
  list_pages:   <List size={13} />,
  get_page:     <BookOpen size={13} />,
  create_page:  <Pencil size={13} />,
  update_page:  <Pencil size={13} />,
  delete_page:  <Trash2 size={13} />,
};

function ToolChip({ tool, loading }: { tool: ToolPart; loading?: boolean }) {
  const label = TOOL_LABELS[tool.name] ?? tool.name;
  const icon = TOOL_ICONS[tool.name];
  const isCreate = tool.name === "create_page";
  const isUpdate = tool.name === "update_page";
  const isDelete = tool.name === "delete_page";
  const slug   = (tool.result?.slug   ?? tool.input?.slug)   as string | undefined;
  const folder = (tool.result?.folder ?? tool.input?.folder) as string | undefined;
  const title  = (tool.result?.title  ?? tool.input?.title)  as string | undefined;

  return (
    <div className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
      isDelete ? "bg-red-50 text-red-600" :
      isCreate ? "bg-green-50 text-green-700" :
      "bg-blue-50 text-blue-600"
    }`}>
      {loading ? <Loader2 size={12} className="animate-spin" /> : icon}
      <span>{label}{title ? `：${title}` : ""}</span>
      {!loading && (isCreate || isUpdate) && slug && folder && (
        <Link href={`/wiki/${encodeURIComponent(folder)}/${slug}`} className="underline hover:no-underline ml-1">
          開く →
        </Link>
      )}
    </div>
  );
}

function AssistantMessage({ parts, streaming }: { parts: MessageParts[]; streaming?: boolean }) {
  const textParts = parts.filter((p): p is TextPart => p.kind === "text");
  const toolParts = parts.filter((p): p is ToolPart => p.kind === "tool");
  const fullText = textParts.map((p) => p.text).join("");

  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Bot size={15} className="text-white" />
      </div>
      <div className="flex-1 space-y-2 min-w-0">
        {toolParts.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {toolParts.map((t, i) => (
              <ToolChip key={i} tool={t} loading={streaming && i === toolParts.length - 1 && !t.result} />
            ))}
          </div>
        )}
        {fullText && (
          <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-800 [&_.markdown]:text-sm">
            <MarkdownRenderer content={fullText} />
          </div>
        )}
        {streaming && !fullText && toolParts.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 size={14} className="animate-spin" /> 考え中...
          </div>
        )}
      </div>
    </div>
  );
}

export function WikiAgentClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentFolder = searchParams.get("folder") ?? undefined;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const editSlug = searchParams.get("edit");
    if (editSlug) {
      setInput(`「${editSlug}」のページを編集してください`);
      textareaRef.current?.focus();
    }
  }, [searchParams]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function submit() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const userMessage: Message = { role: "user", parts: [{ kind: "text", text }] };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setLoading(true);

    const assistantMessage: Message = { role: "assistant", parts: [] };
    setMessages((prev) => [...prev, assistantMessage]);

    const apiMessages = updatedMessages.map((m) => ({
      role: m.role,
      content: m.parts
        .filter((p): p is TextPart => p.kind === "text")
        .map((p) => p.text)
        .join(""),
    }));

    try {
      const res = await fetch("/api/wiki/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, folder: currentFolder }),
      });
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            setMessages((prev) => {
              const msgs = [...prev];
              const last = { ...msgs[msgs.length - 1], parts: [...msgs[msgs.length - 1].parts] };

              if (event.type === "text") {
                const lastPart = last.parts[last.parts.length - 1];
                if (lastPart?.kind === "text") {
                  last.parts[last.parts.length - 1] = { kind: "text", text: lastPart.text + event.text };
                } else {
                  last.parts.push({ kind: "text", text: event.text });
                }
              } else if (event.type === "tool") {
                last.parts.push({ kind: "tool", name: event.name, input: event.input });
              } else if (event.type === "tool_result") {
                const toolIdx = [...last.parts].reverse().findIndex(
                  (p): p is ToolPart => p.kind === "tool" && p.name === event.name && !p.result
                );
                if (toolIdx !== -1) {
                  const realIdx = last.parts.length - 1 - toolIdx;
                  last.parts[realIdx] = { ...(last.parts[realIdx] as ToolPart), result: event.result };
                }
              } else if (event.type === "done") {
                router.refresh();
              }

              msgs[msgs.length - 1] = last;
              return msgs;
            });
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (e) {
      setMessages((prev) => {
        const msgs = [...prev];
        const last = msgs[msgs.length - 1];
        last.parts.push({ kind: "text", text: `エラーが発生しました: ${String(e)}` });
        return msgs;
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-57px)] md:h-[calc(100vh-0px)] max-w-2xl mx-auto">
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
        {messages.length === 0 && (
          <div className="text-center py-16">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Bot size={28} className="text-white" />
            </div>
            <p className="text-base font-semibold text-gray-800">WikiエージェントにAIの質問を<br/>してみましょう</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {[
                "トレーナー向けガイドラインを作って",
                "会員対応マニュアルを作成して",
                "施設の利用ルールをWikiにまとめて",
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          msg.role === "user" ? (
            <div key={i} className="flex gap-3 justify-end">
              <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm max-w-[80%] whitespace-pre-wrap">
                {(msg.parts[0] as TextPart)?.text}
              </div>
              <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User size={15} className="text-gray-600" />
              </div>
            </div>
          ) : (
            <AssistantMessage key={i} parts={msg.parts} streaming={loading && i === messages.length - 1} />
          )
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-200 bg-white p-3 md:p-4 pb-safe">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submit(); }
            }}
            placeholder="Wikiページの作成・編集を依頼する..."
            rows={2}
            disabled={loading}
            className="flex-1 resize-none px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
          />
          <button
            onClick={submit}
            disabled={!input.trim() || loading}
            className="w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl flex items-center justify-center flex-shrink-0 transition"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}

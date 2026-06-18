"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, BarChart3, Users, Dumbbell, PiggyBank, History, Building2 } from "lucide-react";
import { MarkdownRenderer } from "@/components/markdown-renderer";

type TextPart = { kind: "text"; text: string };
type ToolPart = { kind: "tool"; name: string; input: Record<string, unknown> };
type MessagePart = TextPart | ToolPart;
type Message = { role: "user" | "assistant"; parts: MessagePart[] };

const TOOL_LABELS: Record<string, string> = {
  get_business_summary: "経営サマリーを集計",
  list_customers: "顧客を検索",
  get_customer: "顧客詳細を取得",
  list_lessons: "レッスンを集計",
  get_commissions: "歩合を集計",
  list_members: "担当者を取得",
  get_activity_logs: "操作ログを確認",
};

const TOOL_ICONS: Record<string, React.ReactNode> = {
  get_business_summary: <BarChart3 size={13} />,
  list_customers: <Users size={13} />,
  get_customer: <Users size={13} />,
  list_lessons: <Dumbbell size={13} />,
  get_commissions: <PiggyBank size={13} />,
  list_members: <Users size={13} />,
  get_activity_logs: <History size={13} />,
};

const SUGGESTIONS = [
  "今月の利益はいくら？",
  "今月の売上・支払・利益を教えて",
  "在籍中の顧客は何人？",
  "今月のトレーナー別の歩合は？",
  "レンタルジムの利用状況は？",
];

function ToolChip({ tool, loading }: { tool: ToolPart; loading?: boolean }) {
  return (
    <div className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium bg-blue-50 text-blue-600">
      {loading ? <Loader2 size={12} className="animate-spin" /> : (TOOL_ICONS[tool.name] ?? <Building2 size={13} />)}
      <span>{TOOL_LABELS[tool.name] ?? tool.name}</span>
    </div>
  );
}

function AssistantMessage({ parts, streaming }: { parts: MessagePart[]; streaming?: boolean }) {
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
              <ToolChip key={i} tool={t} loading={streaming && i === toolParts.length - 1 && !fullText} />
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

export function AssistantClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function streamResponse(res: Response) {
    if (!res.body) return;
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
              const lp = last.parts[last.parts.length - 1];
              if (lp?.kind === "text") last.parts[last.parts.length - 1] = { kind: "text", text: lp.text + event.text };
              else last.parts.push({ kind: "text", text: event.text });
            } else if (event.type === "tool") {
              last.parts.push({ kind: "tool", name: event.name, input: event.input });
            } else if (event.type === "error") {
              last.parts.push({ kind: "text", text: `エラー: ${event.message}` });
            }
            msgs[msgs.length - 1] = last;
            return msgs;
          });
        } catch { /* ignore */ }
      }
    }
  }

  async function submit(preset?: string) {
    const text = (preset ?? input).trim();
    if (!text || loading) return;
    setInput("");

    const userMessage: Message = { role: "user", parts: [{ kind: "text", text }] };
    const updated = [...messages, userMessage];
    setMessages([...updated, { role: "assistant", parts: [] }]);
    setLoading(true);

    const apiMessages = updated.map((m) => ({
      role: m.role,
      content: m.parts.filter((p): p is TextPart => p.kind === "text").map((p) => p.text).join(""),
    }));

    try {
      const res = await fetch("/api/admin/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });
      if (!res.body) throw new Error("No response body");
      await streamResponse(res);
    } catch (e) {
      setMessages((prev) => {
        const msgs = [...prev];
        msgs[msgs.length - 1].parts.push({ kind: "text", text: `エラーが発生しました: ${String(e)}` });
        return msgs;
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-57px)] md:h-screen max-w-2xl mx-auto">
      <div className="flex-1 overflow-y-auto min-h-0 p-4 md:p-6 space-y-5">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Bot size={28} className="text-white" />
            </div>
            <p className="text-base font-semibold text-gray-800">データアシスタント</p>
            <p className="text-xs text-gray-400 mt-2">売上・顧客・レッスン・歩合などをデータから回答します（閲覧専用）</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => submit(s)}
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full transition">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) =>
            msg.role === "user" ? (
              <div key={i} className="flex gap-3 justify-end">
                <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm whitespace-pre-wrap max-w-[80%]">
                  {msg.parts.filter((p): p is TextPart => p.kind === "text").map((p) => p.text).join("")}
                </div>
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User size={15} className="text-gray-600" />
                </div>
              </div>
            ) : (
              <AssistantMessage key={i} parts={msg.parts} streaming={loading && i === messages.length - 1} />
            )
          )
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-200 bg-white p-3 md:p-4">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submit(); } }}
            placeholder="データについて質問する...（Ctrl/⌘+Enterで送信）"
            rows={2}
            disabled={loading}
            className="flex-1 resize-none px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
          />
          <button
            onClick={() => submit()}
            disabled={!input.trim() || loading}
            className="w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl flex items-center justify-center flex-shrink-0 transition"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5">閲覧専用・回答は生成AIによるものです。重要な判断は元データをご確認ください。</p>
      </div>
    </div>
  );
}

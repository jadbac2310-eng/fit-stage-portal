"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send, Bot, Loader2, BarChart3, Users, Dumbbell, PiggyBank, History, Building2,
  Sparkles, RotateCcw, ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { MarkdownRenderer } from "@/components/markdown-renderer";

type TextPart = { kind: "text"; text: string };
type ToolPart = { kind: "tool"; name: string };
type MessagePart = TextPart | ToolPart;
type Message = { role: "user" | "assistant"; parts: MessagePart[] };

const TOOL_LABELS: Record<string, string> = {
  get_business_summary: "経営サマリーを集計",
  list_customers: "顧客を検索",
  get_customer: "顧客詳細を取得",
  list_lessons: "レッスンを集計",
  get_commissions: "歩合を集計",
  list_members: "担当者を取得",
  get_member_activity: "担当者の稼働を集計",
  get_activity_logs: "操作ログを確認",
};
const TOOL_ICONS: Record<string, React.ReactNode> = {
  get_business_summary: <BarChart3 size={12} />,
  list_customers: <Users size={12} />,
  get_customer: <Users size={12} />,
  list_lessons: <Dumbbell size={12} />,
  get_commissions: <PiggyBank size={12} />,
  list_members: <Users size={12} />,
  get_member_activity: <History size={12} />,
  get_activity_logs: <History size={12} />,
};

const SUGGESTIONS = [
  { icon: <PiggyBank size={14} />, text: "今月の利益はいくら？" },
  { icon: <BarChart3 size={14} />, text: "今月の売上・支払・利益を教えて" },
  { icon: <Users size={14} />, text: "在籍中の顧客は何人？" },
  { icon: <Dumbbell size={14} />, text: "今月のトレーナー別の歩合は？" },
  { icon: <Building2 size={14} />, text: "レンタルジムの利用状況は？" },
];

function ToolChip({ name, loading }: { name: string; loading?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-lg font-medium bg-slate-100 text-slate-600">
      {loading ? <Loader2 size={11} className="animate-spin" /> : (TOOL_ICONS[name] ?? <Building2 size={12} />)}
      {TOOL_LABELS[name] ?? name}
    </span>
  );
}

function AssistantBubble({ parts, streaming }: { parts: MessagePart[]; streaming?: boolean }) {
  const textParts = parts.filter((p): p is TextPart => p.kind === "text");
  const toolParts = parts.filter((p): p is ToolPart => p.kind === "tool");
  const fullText = textParts.map((p) => p.text).join("");
  return (
    <div className="flex gap-2.5">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
        <Bot size={16} className="text-white" />
      </div>
      <div className="flex-1 space-y-2 min-w-0 pt-0.5">
        {toolParts.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {toolParts.map((t, i) => (
              <ToolChip key={i} name={t.name} loading={streaming && i === toolParts.length - 1 && !fullText} />
            ))}
          </div>
        )}
        {fullText && (
          <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-800 shadow-sm [&_.markdown]:text-sm [&_table]:text-xs">
            <MarkdownRenderer content={fullText} />
          </div>
        )}
        {streaming && !fullText && toolParts.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-1">
            <Loader2 size={14} className="animate-spin" /> 考え中…
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // テキストエリアの高さ自動調整
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
  }, [input]);

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
              last.parts.push({ kind: "tool", name: event.name });
            } else if (event.type === "error") {
              last.parts.push({ kind: "text", text: `⚠️ エラー: ${event.message}` });
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

    const updated: Message[] = [...messages, { role: "user", parts: [{ kind: "text", text }] }];
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
        msgs[msgs.length - 1].parts.push({ kind: "text", text: `⚠️ エラーが発生しました: ${String(e)}` });
        return msgs;
      });
    } finally {
      setLoading(false);
    }
  }

  const empty = messages.length === 0;

  return (
    // 画面いっぱい。共通レイアウトの下余白(pb-24)を打ち消して無駄な空白をなくす。
    <div className="flex flex-col h-[calc(100dvh-3.25rem)] md:h-[100dvh] -mb-24 md:mb-0 bg-gray-50">
      {/* ヘッダー */}
      <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-white border-b border-gray-200">
        <Link href="/admin" className="md:hidden p-1 -ml-1 text-gray-400 hover:text-gray-700" aria-label="戻る">
          <ArrowLeft size={18} />
        </Link>
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
          <Sparkles size={15} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 leading-tight">データアシスタント</p>
          <p className="text-[11px] text-gray-400 leading-tight">売上・顧客・歩合などをデータから回答（閲覧専用）</p>
        </div>
        {!empty && (
          <button
            onClick={() => setMessages([])}
            disabled={loading}
            className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition disabled:opacity-40"
          >
            <RotateCcw size={13} /> <span className="hidden sm:inline">リセット</span>
          </button>
        )}
      </div>

      {/* メッセージ */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">
        {empty ? (
          <div className="h-full flex flex-col items-center justify-center px-6 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-200">
              <Bot size={32} className="text-white" />
            </div>
            <p className="text-lg font-bold text-gray-900">何でも聞いてください</p>
            <p className="text-sm text-gray-500 mt-1.5 max-w-xs">売上・顧客・レッスン・歩合・操作ログなどを、最新データから集計して答えます。</p>
            <div className="mt-6 w-full max-w-md grid gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.text}
                  onClick={() => submit(s.text)}
                  className="flex items-center gap-3 text-left text-sm text-gray-700 bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-blue-300 hover:shadow-sm transition"
                >
                  <span className="text-blue-500 flex-shrink-0">{s.icon}</span>
                  {s.text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
            {messages.map((msg, i) =>
              msg.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm whitespace-pre-wrap max-w-[85%] shadow-sm">
                    {msg.parts.filter((p): p is TextPart => p.kind === "text").map((p) => p.text).join("")}
                  </div>
                </div>
              ) : (
                <AssistantBubble key={i} parts={msg.parts} streaming={loading && i === messages.length - 1} />
              )
            )}
          </div>
        )}
      </div>

      {/* 入力（下端のセーフエリア＝ホームインジケータに被らないよう余白を確保） */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white px-3 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] md:px-4 md:pb-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition">
            <textarea
              ref={taRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="データについて質問する…"
              rows={1}
              disabled={loading}
              className="flex-1 resize-none bg-transparent py-1.5 text-sm focus:outline-none disabled:opacity-50 max-h-[140px]"
            />
            <button
              onClick={() => submit()}
              disabled={!input.trim() || loading}
              className="w-8 h-8 mb-0.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg flex items-center justify-center flex-shrink-0 transition"
              aria-label="送信"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

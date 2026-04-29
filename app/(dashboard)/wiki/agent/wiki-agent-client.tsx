"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Send, Bot, User, BookOpen, Pencil, Trash2, List, Loader2, Paperclip, X, FileText, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { MarkdownRenderer } from "@/components/markdown-renderer";

type TextPart = { kind: "text"; text: string };
type ToolPart = { kind: "tool"; name: string; input: Record<string, unknown>; result?: Record<string, unknown> };
type FilePart = { kind: "file"; name: string; fileType: string; previewUrl?: string };
type MessageParts = TextPart | ToolPart | FilePart;

type Message = {
  role: "user" | "assistant";
  parts: MessageParts[];
};

type AttachedFile = { name: string; type: string; data: string; previewUrl?: string };

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

const ACCEPTED = "image/jpeg,image/png,image/gif,image/webp,text/plain,text/markdown,.md";
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB per file
const MAX_TOTAL_SIZE = 3 * 1024 * 1024; // 3MB total

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

function FileChip({ file, onRemove }: { file: AttachedFile; onRemove?: () => void }) {
  const isImage = file.type.startsWith("image/");
  return (
    <div className="relative inline-flex items-center gap-1.5 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
      {isImage && file.previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={file.previewUrl} alt={file.name} className="w-10 h-10 object-cover" />
      ) : (
        <div className="w-10 h-10 flex items-center justify-center bg-gray-200">
          <FileText size={16} className="text-gray-500" />
        </div>
      )}
      <span className="text-xs text-gray-700 pr-2 max-w-[100px] truncate">{file.name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-0.5 right-0.5 w-4 h-4 bg-gray-600/70 hover:bg-gray-800 rounded-full flex items-center justify-center"
        >
          <X size={10} className="text-white" />
        </button>
      )}
    </div>
  );
}

function UserMessage({ parts }: { parts: MessageParts[] }) {
  const textPart = parts.find((p): p is TextPart => p.kind === "text");
  const fileParts = parts.filter((p): p is FilePart => p.kind === "file");

  return (
    <div className="flex gap-3 justify-end">
      <div className="flex flex-col items-end gap-1.5 max-w-[80%]">
        {fileParts.length > 0 && (
          <div className="flex flex-wrap gap-1.5 justify-end">
            {fileParts.map((fp, i) => (
              <div key={i} className="inline-flex items-center gap-1.5 bg-blue-100 rounded-lg overflow-hidden border border-blue-200">
                {fp.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={fp.previewUrl} alt={fp.name} className="w-24 h-16 object-cover rounded-lg" />
                ) : (
                  <div className="flex items-center gap-1.5 px-2 py-1.5">
                    <FileText size={14} className="text-blue-600" />
                    <span className="text-xs text-blue-700 font-medium">{fp.name}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {textPart?.text && (
          <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm whitespace-pre-wrap">
            {textPart.text}
          </div>
        )}
      </div>
      <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
        <User size={15} className="text-gray-600" />
      </div>
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
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editSlug = searchParams.get("edit") ?? undefined;

  useEffect(() => {
    if (!editSlug) return;
    // 編集モードの場合は自動でエージェントを起動する
    autoStart(editSlug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";

    const currentTotal = attachedFiles.reduce((sum, f) => sum + (f.data.length * 0.75), 0);

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        alert(`「${file.name}」は3MBを超えています`);
        continue;
      }
      if (currentTotal + file.size > MAX_TOTAL_SIZE) {
        alert("添付ファイルの合計が3MBを超えます");
        break;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        const data = result.split(",")[1];
        const previewUrl = file.type.startsWith("image/") ? result : undefined;
        setAttachedFiles((prev) => [...prev, { name: file.name, type: file.type, data, previewUrl }]);
      };
      reader.readAsDataURL(file);
    }
  }

  async function autoStart(slug: string) {
    setLoading(true);
    const assistantMessage: Message = { role: "assistant", parts: [] };
    setMessages([assistantMessage]);

    try {
      const res = await fetch("/api/wiki/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: "" }], folder: currentFolder, files: [], editSlug: slug }),
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
  }

  async function submit() {
    const text = input.trim();
    if ((!text && attachedFiles.length === 0) || loading) return;
    setInput("");

    const fileParts: FilePart[] = attachedFiles.map((f) => ({
      kind: "file",
      name: f.name,
      fileType: f.type,
      previewUrl: f.previewUrl,
    }));

    const userMessage: Message = {
      role: "user",
      parts: [...fileParts, ...(text ? [{ kind: "text" as const, text }] : [])],
    };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    const filesToSend = attachedFiles.map((f) => ({ name: f.name, type: f.type, data: f.data }));
    setAttachedFiles([]);
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
        body: JSON.stringify({ messages: apiMessages, folder: currentFolder, files: filesToSend, editSlug }),
      });
      if (!res.body) throw new Error("No response body");
      await streamResponse(res);
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

  const totalAttachedSize = attachedFiles.reduce((sum, f) => sum + Math.round(f.data.length * 0.75), 0);
  const canAttachMore = totalAttachedSize < MAX_TOTAL_SIZE;

  return (
    <div className="flex flex-col h-[calc(100vh-57px)] md:h-[calc(100vh-0px)] max-w-2xl mx-auto">
      <div className="flex-1 overflow-y-auto min-h-0 p-4 md:p-6 space-y-5">
        {messages.length === 0 && (
          <div className="text-center py-16">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Bot size={28} className="text-white" />
            </div>
            <p className="text-base font-semibold text-gray-800">WikiエージェントにAIの質問を<br/>してみましょう</p>
            <p className="text-xs text-gray-400 mt-2 flex items-center justify-center gap-1">
              <Paperclip size={11} /> 画像やテキストファイルを添付できます
            </p>
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
            <UserMessage key={i} parts={msg.parts} />
          ) : (
            <AssistantMessage key={i} parts={msg.parts} streaming={loading && i === messages.length - 1} />
          )
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-200 bg-white p-3 md:p-4 pb-safe">
        {/* 添付ファイルプレビュー */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {attachedFiles.map((f, i) => (
              <FileChip
                key={i}
                file={f}
                onRemove={() => setAttachedFiles((prev) => prev.filter((_, j) => j !== i))}
              />
            ))}
          </div>
        )}

        <div className="flex gap-2 items-end">
          {/* 添付ボタン */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading || !canAttachMore}
            title="ファイルを添付（画像・テキスト、合計3MBまで）"
            className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-300 disabled:opacity-40 transition"
          >
            {attachedFiles.length > 0
              ? <span className="relative"><Paperclip size={18} /><span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-blue-600 text-white rounded-full text-[9px] flex items-center justify-center font-bold">{attachedFiles.length}</span></span>
              : <Paperclip size={18} />}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED}
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

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
            disabled={(!input.trim() && attachedFiles.length === 0) || loading}
            className="w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl flex items-center justify-center flex-shrink-0 transition"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>

        <p className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-1">
          <ImageIcon size={10} />画像（JPEG/PNG/WEBP/GIF）・テキスト・Markdownファイル対応　合計3MBまで
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Download, Share2, Send, Copy, Check, X } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { createInvoiceShareAction } from "../actions";

/**
 * 請求書の送付。
 * - 「LINEで送る」= 内訳＋金額＋Stripe決済リンクの文面を作り、共有シート/コピーで公式LINEに貼って送る。
 * - 「共有」「PDF」= 従来どおり請求書PDFを共有/保存。
 */
export function InvoiceActions({
  pdfHref, filename, billerId, month,
}: {
  pdfHref: string; filename: string; billerId: string; month: string;
}) {
  const [busy, setBusy] = useState<"share" | "download" | "line" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function fetchFile(): Promise<File> {
    const res = await fetch(pdfHref);
    if (!res.ok) throw new Error("PDFの取得に失敗しました");
    const blob = await res.blob();
    return new File([blob], filename, { type: "application/pdf" });
  }

  function saveFile(file: File) {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function handleShare() {
    setBusy("share");
    try {
      const file = await fetchFile();
      const nav = navigator as Navigator & { canShare?: (d?: ShareData) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: filename });
      } else {
        saveFile(file); // 共有非対応端末はダウンロード
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") alert((e as Error).message || "共有に失敗しました");
    } finally {
      setBusy(null);
    }
  }

  async function handleDownload() {
    setBusy("download");
    try {
      saveFile(await fetchFile());
    } catch (e) {
      alert((e as Error).message || "ダウンロードに失敗しました");
    } finally {
      setBusy(null);
    }
  }

  async function handleLine() {
    setBusy("line");
    try {
      const res = await createInvoiceShareAction(billerId, month);
      if (res.ok) {
        setMessage(res.message);
        setCopied(false);
      } else {
        alert(res.error);
      }
    } catch {
      alert("文面の作成に失敗しました");
    } finally {
      setBusy(null);
    }
  }

  async function shareMessage() {
    if (!message) return;
    try {
      if ("share" in navigator && typeof navigator.share === "function") {
        await navigator.share({ text: message });
      } else {
        await copyMessage();
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") await copyMessage();
    }
  }

  async function copyMessage() {
    if (!message) return;
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("コピーに失敗しました。文面を長押しでコピーしてください。");
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={handleLine}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition"
        >
          {busy === "line" ? <Spinner size={16} /> : <Send size={16} />} LINEで送る
        </button>
        <button
          onClick={handleShare}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 font-semibold px-3.5 py-2.5 rounded-xl text-sm transition"
        >
          <Share2 size={16} /> {busy === "share" ? "準備中…" : "PDF共有"}
        </button>
        <button
          onClick={handleDownload}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 font-semibold px-3.5 py-2.5 rounded-xl text-sm transition"
        >
          <Download size={16} /> {busy === "download" ? "準備中…" : "PDF"}
        </button>
      </div>

      {message !== null && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={() => setMessage(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-gray-900">LINEで送る文面</h3>
              <button onClick={() => setMessage(null)} className="p-1 text-gray-400 hover:text-gray-700 rounded-lg"><X size={18} /></button>
            </div>
            <p className="text-xs text-gray-500 mb-2">内容を確認して、公式LINEで顧客に送ってください。</p>
            <textarea
              readOnly
              value={message}
              className="w-full h-64 text-xs text-gray-800 border border-gray-200 rounded-xl p-3 bg-gray-50 resize-none focus:outline-none"
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={shareMessage}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition"
              >
                <Send size={16} /> LINEへ共有
              </button>
              <button
                onClick={copyMessage}
                className="flex-1 inline-flex items-center justify-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold px-4 py-2.5 rounded-xl text-sm transition"
              >
                {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />} {copied ? "コピー済" : "コピー"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

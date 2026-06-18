"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Share2, CheckCircle2, Send } from "lucide-react";
import { cn } from "@/lib/cn";
import { markReportSentAction, unmarkReportSentAction } from "../actions";

/**
 * 月次レポートPDFの共有/ダウンロードと、送付済み管理。
 * 共有は Web Share API（files対応端末）でOSの共有シート（LINE等）を開く。
 * 共有が成功したら自動で「送付済み」にする。
 */
export function ReportActions({ pdfHref, filename, customerId, period, customerName, sent }: {
  pdfHref: string; filename: string; customerId: string; period: string; customerName: string; sent: boolean;
}) {
  const [busy, setBusy] = useState<"share" | "download" | null>(null);
  const [marking, startMark] = useTransition();
  const router = useRouter();

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

  function markSent() {
    startMark(async () => {
      await markReportSentAction(customerId, period, customerName);
      router.refresh();
    });
  }
  function unmark() {
    startMark(async () => {
      await unmarkReportSentAction(customerId, period);
      router.refresh();
    });
  }

  async function handleShare() {
    setBusy("share");
    try {
      const file = await fetchFile();
      const nav = navigator as Navigator & { canShare?: (d?: ShareData) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: filename });
        if (!sent) markSent(); // 共有できたら送付済みに
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
    try { saveFile(await fetchFile()); }
    catch (e) { alert((e as Error).message || "ダウンロードに失敗しました"); }
    finally { setBusy(null); }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={handleShare} disabled={busy !== null}
        className="inline-flex items-center gap-2 bg-gray-900 hover:bg-black disabled:opacity-60 text-[#C9A84C] font-semibold px-4 py-2.5 rounded-xl text-sm transition">
        <Share2 size={16} /> {busy === "share" ? "準備中…" : "LINE等で共有"}
      </button>
      <button onClick={handleDownload} disabled={busy !== null}
        className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 font-semibold px-4 py-2.5 rounded-xl text-sm transition">
        <Download size={16} /> {busy === "download" ? "準備中…" : "PDF"}
      </button>
      <button
        onClick={sent ? unmark : markSent}
        disabled={marking}
        className={cn(
          "inline-flex items-center gap-2 font-semibold px-4 py-2.5 rounded-xl text-sm transition border disabled:opacity-50",
          sent
            ? "text-green-700 bg-green-50 border-green-200 hover:bg-green-100"
            : "text-gray-600 bg-white border-gray-300 hover:bg-gray-50"
        )}
      >
        {sent ? <><CheckCircle2 size={16} /> 送付済み</> : <><Send size={16} /> 送付済みにする</>}
      </button>
    </div>
  );
}

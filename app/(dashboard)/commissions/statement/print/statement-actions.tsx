"use client";

import { useState } from "react";
import { Download, Share2 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

export function StatementActions({ pdfHref, filename }: { pdfHref: string; filename: string }) {
  const [busy, setBusy] = useState<"share" | "download" | null>(null);

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

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleShare}
        disabled={busy !== null}
        className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 font-semibold px-3.5 py-2.5 rounded-xl text-sm transition"
      >
        {busy === "share" ? <Spinner size={16} /> : <Share2 size={16} />} {busy === "share" ? "準備中…" : "共有"}
      </button>
      <button
        onClick={handleDownload}
        disabled={busy !== null}
        className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 font-semibold px-3.5 py-2.5 rounded-xl text-sm transition"
      >
        {busy === "download" ? <Spinner size={16} /> : <Download size={16} />} {busy === "download" ? "準備中…" : "PDF"}
      </button>
    </div>
  );
}

"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useState } from "react";

type ShareButtonsProps = {
  title: string;
  content: string;
};

export function ShareButtons({ title, content }: ShareButtonsProps) {
  const [copiedArticle, setCopiedArticle] = useState(false);

  function getUrl() {
    return window.location.href;
  }

  async function handleNativeShare() {
    const url = getUrl();
    if (typeof navigator.share === "function") {
      await navigator.share({ title, url });
      return;
    }
    await copyUrl(url);
  }

  async function handleCopyArticle() {
    const articleText = `# ${title}\n\n${content}`.trim();
    await navigator.clipboard.writeText(articleText);
    setCopiedArticle(true);
    window.setTimeout(() => setCopiedArticle(false), 1800);
  }

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleNativeShare}
        className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-800 font-medium bg-gray-50 hover:bg-gray-100 border border-gray-300 hover:border-gray-400 px-3 py-1.5 rounded-lg transition"
      >
        <Share2 size={13} /> 共有
      </button>
      <button
        type="button"
        onClick={handleCopyArticle}
        className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-800 font-medium bg-gray-50 hover:bg-gray-100 border border-gray-300 hover:border-gray-400 px-3 py-1.5 rounded-lg transition"
      >
        {copiedArticle ? <Check size={13} /> : <Copy size={13} />}
        {copiedArticle ? "コピー済み" : "記事コピー"}
      </button>
    </div>
  );
}

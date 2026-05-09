"use client";

import { Check, Copy, MessageCircle, Share2 } from "lucide-react";
import { useState } from "react";

type ShareButtonsProps = {
  title: string;
};

export function ShareButtons({ title }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

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

  async function handleCopy() {
    await copyUrl(getUrl());
  }

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function handleLineShare() {
    const lineShareUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(getUrl())}`;
    window.open(lineShareUrl, "_blank", "noopener,noreferrer");
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
        onClick={handleLineShare}
        className="flex items-center gap-1.5 text-xs text-green-700 hover:text-green-800 font-medium bg-green-50 hover:bg-green-100 border border-green-300 hover:border-green-400 px-3 py-1.5 rounded-lg transition"
      >
        <MessageCircle size={13} /> LINE
      </button>
      <button
        type="button"
        onClick={handleCopy}
        className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-800 font-medium bg-gray-50 hover:bg-gray-100 border border-gray-300 hover:border-gray-400 px-3 py-1.5 rounded-lg transition"
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
        {copied ? "コピー済み" : "URLコピー"}
      </button>
    </div>
  );
}

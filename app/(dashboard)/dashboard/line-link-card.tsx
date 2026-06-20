"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Check, Copy, RefreshCw } from "lucide-react";
import { unlinkLineAction, regenerateLinkCodeAction } from "./line-actions";

export function LineLinkCard({ linked, code, oaUrl }: {
  linked: boolean;
  code: string | null;
  oaUrl?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);

  function unlink() {
    if (!confirm("LINE通知の連携を解除しますか？")) return;
    start(async () => { await unlinkLineAction(); router.refresh(); });
  }
  function regen() {
    start(async () => { await regenerateLinkCodeAction(); router.refresh(); });
  }
  function copy() {
    if (!code) return;
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <MessageCircle size={16} className="text-green-600" />
        <p className="text-sm font-bold text-gray-900">LINE通知</p>
        {linked && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">
            <Check size={10} /> 連携済み
          </span>
        )}
      </div>

      {linked ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-gray-500">予定のリマインドや変更通知がLINEに届きます。</p>
          <button onClick={unlink} disabled={pending}
            className="text-xs font-semibold text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition disabled:opacity-50 flex-shrink-0">
            連携を解除
          </button>
        </div>
      ) : code ? (
        <div className="space-y-2.5">
          <p className="text-xs text-gray-500">
            LINEで予定の通知を受け取るには、公式アカウントを友だち追加して、下のコードをトークに送信してください。
          </p>
          {oaUrl && (
            <a href={oaUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#06C755] hover:opacity-90 rounded-lg px-3 py-2 transition">
              <MessageCircle size={14} /> 公式アカウントを友だち追加
            </a>
          )}
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg font-bold tracking-[0.3em] bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900">
              {code}
            </span>
            <button onClick={copy}
              className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg px-2.5 py-2 hover:bg-gray-50 transition">
              {copied ? <><Check size={13} className="text-green-600" /> コピー済</> : <><Copy size={13} /> コピー</>}
            </button>
            <button onClick={regen} disabled={pending} title="コードを再発行"
              className="inline-flex items-center text-xs text-gray-400 hover:text-gray-700 rounded-lg px-2 py-2 transition disabled:opacity-50">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-400">連携コードを準備中です（管理者にお問い合わせください）。</p>
      )}
    </div>
  );
}

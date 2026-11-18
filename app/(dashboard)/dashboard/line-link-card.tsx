"use client";

import { useT } from "@/components/i18n/lang-provider";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Check, Copy, RefreshCw } from "lucide-react";
import { unlinkLineAction, regenerateLinkCodeAction } from "./line-actions";
import { Spinner } from "@/components/ui/spinner";

export function LineLinkCard({ linked, code, oaUrl }: {
  linked: boolean;
  code: string | null;
  oaUrl?: string;
}) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);

  function unlink() {
    if (!confirm(t("LINE通知の連携を解除しますか？", "Disconnect LINE notifications?"))) return;
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
    <div className="bg-white border border-[var(--portal-line)] p-3">
      <div className="flex items-center gap-2 mb-2">
        <MessageCircle size={16} className="text-green-600" />
        <p className="text-sm font-bold text-gray-900">{t("LINE通知", "LINE notifications")}</p>
        {linked && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">
            <Check size={10} /> {t("連携済み", "Connected")}
          </span>
        )}
      </div>

      {linked ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-gray-500">{t("予定のリマインドや変更通知がLINEに届きます。", "Schedule reminders and changes are sent to LINE (in Japanese).")}</p>
          <button onClick={unlink} disabled={pending}
            className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition disabled:opacity-50 flex-shrink-0">
            {pending && <Spinner size={12} />}{pending ? t("解除中…", "Disconnecting…") : t("連携を解除", "Disconnect")}
          </button>
        </div>
      ) : code ? (
        <div className="space-y-2.5">
          <p className="text-xs text-gray-500">
            {t("LINEで予定の通知を受け取るには、公式アカウントを友だち追加して、下のコードをトークに送信してください。", "To get schedule notifications on LINE, add our official account as a friend and send the code below in the chat.")}
          </p>
          {oaUrl && (
            <a href={oaUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#06C755] hover:opacity-90 rounded-lg px-3 py-2 transition">
              <MessageCircle size={14} /> {t("公式アカウントを友だち追加", "Add the official account")}
            </a>
          )}
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg font-bold tracking-[0.3em] bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900">
              {code}
            </span>
            <button onClick={copy}
              className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg px-2.5 py-2 hover:bg-gray-50 transition">
              {copied ? <><Check size={13} className="text-green-600" /> {t("コピー済", "Copied")}</> : <><Copy size={13} /> {t("コピー", "Copy")}</>}
            </button>
            <button onClick={regen} disabled={pending} title={t("コードを再発行", "Issue a new code")}
              className="inline-flex items-center text-xs text-gray-400 hover:text-gray-700 rounded-lg px-2 py-2 transition disabled:opacity-50">
              {pending ? <Spinner size={14} /> : <RefreshCw size={14} />}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-400">{t("連携コードを準備中です（管理者にお問い合わせください）。", "Link code not ready yet (please ask an admin).")}</p>
      )}
    </div>
  );
}

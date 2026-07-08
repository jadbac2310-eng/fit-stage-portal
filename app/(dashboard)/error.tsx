"use client";

import { useEffect } from "react";

// ダッシュボード配下でサーバー/クライアントの描画エラーが起きた時の表示。
// 本番では message が伏せられるため digest を大きく出す（Vercel Logs の SERVER_ERROR と突き合わせ可能）。
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // ブラウザのコンソールにも全部出す
    // eslint-disable-next-line no-console
    console.error("DashboardError", error, error?.digest);
  }, [error]);

  return (
    <div className="p-6 max-w-lg mx-auto">
      <p className="text-4xl mb-3">⚠️</p>
      <p className="text-sm font-bold text-gray-800 mb-2">画面の表示中にエラーが発生しました</p>
      <div className="text-[11px] whitespace-pre-wrap break-all bg-red-50 border border-red-200 rounded-xl p-3 text-red-800 mb-3">
        <p>digest: {error?.digest ?? "(なし)"}</p>
        <p className="mt-1">message: {error?.message ?? "(なし)"}</p>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        この digest を共有いただくか、Vercel の Logs で「SERVER_ERROR」を検索すると原因の全文が見られます。
      </p>
      <button
        onClick={reset}
        className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
      >
        再読み込み
      </button>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

/**
 * ポータルを新しくした直後に、古い画面のまま保存すると、
 * 「Server Action "…" was not found on the server」という英語のエラーが出て保存できない（2026-11-14 に体験の編集で発生）。
 * 画面（ブラウザ）と、新しくなったサーバーとで、ボタンの宛先がずれるため。読み込み直せば直る。
 *
 * そこで2つ手を打つ：
 *  1. アプリに戻ってきたとき（ホーム画面から開き直した・タブを戻した）に版を比べ、古ければ入力前に読み込み直す。
 *     入力の途中（文字を打っている欄がある）なら勝手に読み込み直さず、下の帯で知らせる。
 *  2. それでも古い画面で保存してしまったら、英語のエラーの代わりに、何が起きたかと「読み込み直す」ボタンを帯で出す。
 */
const MY_BUILD = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";
const ACTION_NOT_FOUND_HEADER = "x-nextjs-action-not-found";

function typing(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  return el.tagName === "TEXTAREA" || el.tagName === "SELECT" || (el.tagName === "INPUT" && (el as HTMLInputElement).type !== "button") || el.isContentEditable;
}

export function DeployGuard() {
  const [notice, setNotice] = useState<null | "stale" | "failed">(null);

  useEffect(() => {
    if (MY_BUILD === "dev") return;

    // 2. 保存（サーバーアクション）の返事に「その宛先は無い」の印があったら知らせる
    const orig = window.fetch;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const res = await orig(...args);
      if (res.headers.get(ACTION_NOT_FOUND_HEADER)) setNotice("failed");
      return res;
    };

    // 1. 戻ってきたときに版を比べる
    let checking = false;
    async function check() {
      if (checking || document.visibilityState !== "visible") return;
      checking = true;
      try {
        const r = await orig("/api/version", { cache: "no-store" });
        if (!r.ok) return;
        const { id } = (await r.json()) as { id?: string };
        if (!id || id === MY_BUILD || id === "dev") return;
        if (typing()) setNotice((n) => n ?? "stale");
        else window.location.reload();
      } catch { /* 電波が悪いときは何もしない */ }
      finally { checking = false; }
    }
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    const timer = window.setInterval(check, 10 * 60 * 1000);
    return () => {
      window.fetch = orig;
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
      window.clearInterval(timer);
    };
  }, []);

  if (!notice) return null;
  return (
    <div role="alert" className="fixed inset-x-0 bottom-0 z-[60] border-t-[3px] border-gold-500 bg-navy-900 text-white px-4 py-3 print:hidden">
      <div className="max-w-2xl mx-auto flex items-center gap-3">
        <p className="flex-1 text-xs leading-relaxed">
          {notice === "failed"
            ? <><b>保存できませんでした。</b>ポータルが新しくなったため、この画面が古いままです。入力した内容を控えてから、読み込み直してもう一度保存してください。</>
            : <><b>ポータルが新しくなりました。</b>保存の前に読み込み直してください（入力した内容は消えるので、控えてから）。</>}
        </p>
        <button onClick={() => window.location.reload()} className="flex-shrink-0 inline-flex items-center gap-1.5 bg-gold-500 hover:bg-gold-600 px-3 py-2 text-xs font-bold text-white">
          <RefreshCw size={14} /> 読み込み直す
        </button>
      </div>
    </div>
  );
}

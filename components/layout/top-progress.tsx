"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * 画面遷移中に上部へ表示するプログレスバー。
 * - 内部リンクのクリック / 戻る・進むを検知して開始
 * - pathname / searchParams が変わったら完了
 * 遷移が「固まって見える」のを防ぎ、操作したことを即座にフィードバックする。
 */
export function TopProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const activeRef = useRef(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimers() {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    if (doneRef.current) { clearTimeout(doneRef.current); doneRef.current = null; }
  }

  function start() {
    if (activeRef.current) return;
    activeRef.current = true;
    clearTimers();
    setActive(true);
    setProgress(8);
    tickRef.current = setInterval(() => {
      setProgress((p) => (p >= 90 ? p : p + Math.max(0.5, (90 - p) * 0.12)));
    }, 120);
  }

  function finish() {
    if (!activeRef.current) return;
    activeRef.current = false;
    clearTimers();
    setProgress(100);
    doneRef.current = setTimeout(() => {
      setActive(false);
      setProgress(0);
    }, 280);
  }

  // 内部リンククリックで開始
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      const target = anchor.getAttribute("target");
      if (!href || target === "_blank" || anchor.hasAttribute("download")) return;
      let url: URL;
      try { url = new URL(anchor.href, window.location.href); }
      catch { return; }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    }
    function onPopState() { start(); }
    document.addEventListener("click", onClick, { capture: true });
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      window.removeEventListener("popstate", onPopState);
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 遷移確定 → 完了（effect内の同期setStateを避けるため遅延実行）
  useEffect(() => {
    if (!activeRef.current) return;
    const id = setTimeout(finish, 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  if (!active && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] pointer-events-none h-0.5">
      <div
        className="h-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.6)] transition-[width,opacity] duration-200 ease-out"
        style={{ width: `${progress}%`, opacity: active ? 1 : 0 }}
      />
    </div>
  );
}

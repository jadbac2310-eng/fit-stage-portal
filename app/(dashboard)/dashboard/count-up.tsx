"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 数字を0から目標まで上げる演出。
 *
 * 開いた瞬間に数字が動くと、見るのがちょっと気持ちよくなる。
 * 「動きを減らす」設定の端末では、動かさずにそのまま出す。
 */
export function CountUp({
  value, prefix = "", suffix = "", durationMs = 800, className,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  durationMs?: number;
  className?: string;
}) {
  const [shown, setShown] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const reduce = typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    // 動かさない場合も、描画の次のコマで値を入れる（効果の中で直接setStateしない）
    if (reduce || value === 0) {
      raf.current = requestAnimationFrame(() => setShown(value));
      return () => { if (raf.current != null) cancelAnimationFrame(raf.current); };
    }

    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / durationMs);
      // 最後をゆっくり止める（そのほうが気持ちいい）
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(value * eased));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current != null) cancelAnimationFrame(raf.current); };
  }, [value, durationMs]);

  return (
    <span className={className}>
      {prefix}{shown.toLocaleString("ja-JP")}{suffix}
    </span>
  );
}

"use client";

import { useEffect, useState } from "react";

const COLORS = ["#2563eb", "#f59e0b", "#ef4444", "#10b981", "#8b5cf6", "#ec4899"];

/**
 * 紙吹雪。称号を今日とった日だけ、一度だけ降らせる。
 *
 * ライブラリは使わず、小さな四角をCSSで落としているだけ（読み込みは増えない）。
 * 「動きを減らす」設定の端末では何も出さない。
 */
export function Confetti({ pieces = 36 }: { pieces?: number }) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = requestAnimationFrame(() => setOn(true));
    const off = setTimeout(() => setOn(false), 4000);   // 終わったら消す
    return () => { cancelAnimationFrame(id); clearTimeout(off); };
  }, []);

  if (!on) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {Array.from({ length: pieces }, (_, i) => {
        const left = (i * 97) % 100;                 // ばらけて見えるように
        const delay = (i % 10) * 0.12;
        const dur = 2.2 + ((i % 5) * 0.25);
        const size = 6 + (i % 4) * 2;
        return (
          <span
            key={i}
            style={{
              position: "absolute",
              top: "-5vh",
              left: `${left}%`,
              width: size,
              height: size * 1.6,
              background: COLORS[i % COLORS.length],
              borderRadius: 1,
              animation: `fs-fall ${dur}s linear ${delay}s forwards`,
            }}
          />
        );
      })}
      <style>{`
        @keyframes fs-fall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}

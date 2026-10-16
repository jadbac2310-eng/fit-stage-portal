"use client";

import { useEffect, useState } from "react";

// ログイン画面で何もしないまま5秒たつと、一度だけ画面が揺れて💥が出る。
//
// 入力中・タップ中は数え直すので、ふつうにログインする人には出ない。
// 出るのは1回だけ（何度も出ると、ただのうっとうしい画面になるため）。
// 「動きを減らす」設定の端末では何も出さない。

const IDLE_MS = 5000;

const LINES = [
  "びっくりしました？　ログインどうぞ。",
  "5秒も止まってました。パスワード忘れました？",
  "ぼーっとしてますね。今日の格言、読みました？",
  "起きてますか？　今日もいきましょう。",
  "何も起きないと思いました？",
];

export function IdleSurprise() {
  const [boom, setBoom] = useState(false);
  const [line, setLine] = useState("");

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let timer: ReturnType<typeof setTimeout>;
    let done = false;

    const fire = () => {
      if (done) return;
      done = true;
      setLine(LINES[Math.floor(Math.random() * LINES.length)]);
      setBoom(true);
      document.body.classList.add("fs-shake");
      setTimeout(() => document.body.classList.remove("fs-shake"), 600);
      setTimeout(() => setBoom(false), 2600);
    };

    const reset = () => {
      if (done) return;
      clearTimeout(timer);
      timer = setTimeout(fire, IDLE_MS);
    };

    const events = ["keydown", "pointerdown", "pointermove", "touchstart", "wheel"] as const;
    for (const e of events) window.addEventListener(e, reset, { passive: true });
    reset();

    return () => {
      clearTimeout(timer);
      for (const e of events) window.removeEventListener(e, reset);
      document.body.classList.remove("fs-shake");
    };
  }, []);

  return (
    <>
      {boom && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center" aria-hidden>
          <span className="fs-boom" style={{ fontSize: 140, lineHeight: 1 }}>💥</span>
          <span className="fs-boom-line absolute bottom-24 left-0 right-0 text-center text-sm font-bold text-gray-700 px-6">
            {line}
          </span>
        </div>
      )}
      <style>{`
        @keyframes fs-boom-pop {
          0%   { transform: scale(0.2); opacity: 0; }
          25%  { transform: scale(1.25); opacity: 1; }
          60%  { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes fs-boom-fade {
          0%   { opacity: 0; transform: translateY(6px); }
          20%  { opacity: 1; transform: translateY(0); }
          80%  { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes fs-shake-keys {
          0%, 100% { transform: translate(0, 0); }
          15% { transform: translate(-6px, 3px) rotate(-0.6deg); }
          30% { transform: translate(5px, -4px) rotate(0.6deg); }
          45% { transform: translate(-4px, 2px) rotate(-0.4deg); }
          60% { transform: translate(3px, -2px) rotate(0.3deg); }
          80% { transform: translate(-2px, 1px); }
        }
        .fs-boom      { animation: fs-boom-pop 2.4s ease-out forwards; }
        .fs-boom-line { animation: fs-boom-fade 2.6s ease-out forwards; }
        .fs-shake     { animation: fs-shake-keys 0.6s ease-in-out; }
      `}</style>
    </>
  );
}

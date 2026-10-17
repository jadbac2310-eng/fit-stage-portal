"use client";

import { useEffect, useState } from "react";

// ログイン画面で何もしないまま5秒たつと、一度だけ画面が爆発する。
//
// 入力中・タップ中は数え直すので、ふつうにログインする人には出ない。
// 出るのは1回だけ（何度も出ると、ただのうっとうしい画面になるため）。
// 「動きを減らす」設定の端末では何も出さない。
//
// 中身は、閃光 → 衝撃波 → 💥 → 破片 → 画面ゆれ、の5つを重ねているだけ。
// ライブラリは使っていないので、読み込みは増えない。

const IDLE_MS = 5000;
/** 画面がゆれている時間（ドン！のあと、ぶるぶるが長く続く） */
const SHAKE_MS = 4200;
/** 全部が消えるまで */
const TOTAL_MS = 5200;

const LINES = [
  "びっくりしました？　ログインどうぞ。",
  "5秒も止まってました。パスワード忘れました？",
  "ぼーっとしてますね。今日の格言、読みました？",
  "起きてますか？　今日もいきましょう。",
  "何も起きないと思いました？",
  "ポータルは、開いた人の味方です。",
];

const DEBRIS = ["💥", "🔥", "✨", "💢", "⭐️", "🧨"];
const PIECES = 28;

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
      setTimeout(() => document.body.classList.remove("fs-shake"), SHAKE_MS);
      setTimeout(() => setBoom(false), TOTAL_MS);
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
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
          {/* 閃光 */}
          <div className="fs-flash absolute inset-0" />

          {/* 衝撃波（2枚ずらして出す） */}
          <div className="fs-wave absolute left-1/2 top-1/2" />
          <div className="fs-wave fs-wave-2 absolute left-1/2 top-1/2" />

          {/* 本体 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="fs-boom" style={{ fontSize: "min(60vw, 420px)", lineHeight: 1 }}>💥</span>
          </div>

          {/* 破片。中心から外へ飛ばす */}
          <div className="absolute left-1/2 top-1/2">
            {Array.from({ length: PIECES }, (_, i) => {
              const angle = (360 / PIECES) * i + (i % 3) * 4;
              const dist = 42 + (i % 5) * 12;              // vmax
              const delay = (i % 4) * 0.04;
              const size = 22 + (i % 4) * 10;
              return (
                <span
                  key={i}
                  className="fs-piece absolute"
                  style={{
                    fontSize: size,
                    ["--fs-x" as string]: `${Math.cos((angle * Math.PI) / 180) * dist}vmax`,
                    ["--fs-y" as string]: `${Math.sin((angle * Math.PI) / 180) * dist}vmax`,
                    ["--fs-rot" as string]: `${(i % 2 ? 1 : -1) * (360 + i * 25)}deg`,
                    animationDelay: `${delay}s`,
                  }}
                >
                  {DEBRIS[i % DEBRIS.length]}
                </span>
              );
            })}
          </div>

          {/* ひとこと */}
          <p className="fs-line absolute bottom-20 left-0 right-0 px-6 text-center text-base font-bold text-gray-800">
            {line}
          </p>
        </div>
      )}

      <style>{`
        @keyframes fs-flash-keys {
          0%   { background: rgba(255,255,255,0); }
          8%   { background: rgba(255,245,210,0.95); }
          28%  { background: rgba(255,170,60,0.35); }
          100% { background: rgba(255,255,255,0); }
        }
        @keyframes fs-wave-keys {
          0%   { width: 0; height: 0; opacity: 0.9; border-width: 14px; }
          100% { width: 190vmax; height: 190vmax; opacity: 0; border-width: 0; }
        }
        @keyframes fs-boom-keys {
          0%   { transform: scale(0.05) rotate(-12deg); opacity: 0; }
          12%  { transform: scale(1.35) rotate(6deg);  opacity: 1; }
          30%  { transform: scale(1.05) rotate(-3deg); opacity: 1; }
          70%  { transform: scale(1.15) rotate(0deg);  opacity: 0.95; }
          100% { transform: scale(2.1)  rotate(4deg);  opacity: 0; }
        }
        @keyframes fs-piece-keys {
          0%   { transform: translate(-50%, -50%) scale(0.3) rotate(0deg); opacity: 0; }
          10%  { opacity: 1; }
          100% { transform: translate(calc(-50% + var(--fs-x)), calc(-50% + var(--fs-y))) scale(1) rotate(var(--fs-rot)); opacity: 0; }
        }
        @keyframes fs-line-keys {
          0%   { opacity: 0; transform: translateY(10px) scale(0.96); }
          18%  { opacity: 1; transform: translateY(0) scale(1); }
          80%  { opacity: 1; }
          100% { opacity: 0; }
        }
        /* ① ドン！ 最初の大きな一撃（0.7秒） */
        @keyframes fs-hit-keys {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          6%  { transform: translate(-26px, 14px) rotate(-2deg); }
          13% { transform: translate(24px, -18px) rotate(1.9deg); }
          21% { transform: translate(-20px, 15px) rotate(-1.6deg); }
          30% { transform: translate(18px, -12px) rotate(1.3deg); }
          42% { transform: translate(-14px, 9px)  rotate(-1deg); }
          56% { transform: translate(11px, -7px)  rotate(0.8deg); }
          72% { transform: translate(-8px, 5px)   rotate(-0.5deg); }
          88% { transform: translate(5px, -3px)   rotate(0.3deg); }
        }
        /* ② ぶるぶるぶるぶる。細かく速いのを何度も繰り返す */
        @keyframes fs-buzz-keys {
          0%   { transform: translate(-4px, 2px)  rotate(-0.35deg); }
          25%  { transform: translate(4px, -3px)  rotate(0.35deg); }
          50%  { transform: translate(-3px, -2px) rotate(-0.3deg); }
          75%  { transform: translate(3px, 3px)   rotate(0.3deg); }
          100% { transform: translate(-4px, 2px)  rotate(-0.35deg); }
        }
        .fs-flash { animation: fs-flash-keys 1.1s ease-out forwards; }
        .fs-wave {
          transform: translate(-50%, -50%);
          border: solid rgba(255,140,40,0.85);
          border-radius: 9999px;
          animation: fs-wave-keys 1.5s cubic-bezier(.15,.7,.25,1) forwards;
        }
        .fs-wave-2 { border-color: rgba(255,80,40,0.55); animation-delay: 0.14s; }
        .fs-boom  { animation: fs-boom-keys ${TOTAL_MS}ms cubic-bezier(.2,.8,.2,1) forwards; }
        .fs-piece { animation: fs-piece-keys 2.4s cubic-bezier(.1,.75,.25,1) forwards; }
        .fs-line  { animation: fs-line-keys ${TOTAL_MS}ms ease-out forwards; }
        /* ドン！のあと、0.07秒のぶるぶるを50回ぶん続ける（合計3.5秒） */
        .fs-shake {
          animation:
            fs-hit-keys 0.7s cubic-bezier(.36,.07,.19,.97),
            fs-buzz-keys 0.07s linear 0.7s 50;
        }
      `}</style>
    </>
  );
}

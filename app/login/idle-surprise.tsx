"use client";

import { useEffect, useState } from "react";

// ログイン画面で何もしないまま5秒たつと、一度だけ画面が爆発する。
//
// 流れ：
//   ① 地鳴り（ぶるぶる）… だんだん強くなる。赤い縁も濃くなっていく
//   ② 爆発 … 閃光 → 火球 → 衝撃波 → 火の粉 → 煙
//   ③ 余震 … ドンのあと、こまかい揺れがしばらく続く
//
// 入力中・タップ中は数え直すので、ふつうにログインする人には出ない。
// 出るのは1回だけ。「動きを減らす」設定の端末では何も出さない。
// 絵文字は使わず、グラデーションと影だけで作っている（画像の読み込みは増えない）。

const IDLE_MS   = 5000;   // 何もしないまま、この時間で地鳴りが始まる
const RUMBLE_MS = 2600;   // 地鳴りの長さ（この間ずっと、だんだん強くなる）
const SHAKE_MS  = 4200;   // 爆発後に画面がゆれている時間
const TOTAL_MS  = 5200;   // 全部が消えるまで

const LINES = [
  "びっくりしました？　ログインどうぞ。",
  "5秒も止まってました。パスワード忘れました？",
  "ぼーっとしてますね。今日の格言、読みました？",
  "起きてますか？　今日もいきましょう。",
  "何も起きないと思いました？",
  "ポータルは、開いた人の味方です。",
];

const SPARKS = 46;
const SMOKES = 10;

export function IdleSurprise() {
  const [phase, setPhase] = useState<"idle" | "rumble" | "boom">("idle");
  const [line, setLine] = useState("");

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let timer: ReturnType<typeof setTimeout>;
    let boomTimer: ReturnType<typeof setTimeout>;
    let endTimer: ReturnType<typeof setTimeout>;
    let done = false;

    const startRumble = () => {
      if (done) return;
      done = true;
      setPhase("rumble");
      document.body.classList.add("fs-rumble");

      boomTimer = setTimeout(() => {
        document.body.classList.remove("fs-rumble");
        setLine(LINES[Math.floor(Math.random() * LINES.length)]);
        setPhase("boom");
        document.body.classList.add("fs-shake");
        setTimeout(() => document.body.classList.remove("fs-shake"), SHAKE_MS);
        endTimer = setTimeout(() => setPhase("idle"), TOTAL_MS);
      }, RUMBLE_MS);
    };

    const reset = () => {
      if (done) return;
      clearTimeout(timer);
      timer = setTimeout(startRumble, IDLE_MS);
    };

    const events = ["keydown", "pointerdown", "pointermove", "touchstart", "wheel"] as const;
    for (const e of events) window.addEventListener(e, reset, { passive: true });
    reset();

    return () => {
      clearTimeout(timer); clearTimeout(boomTimer); clearTimeout(endTimer);
      for (const e of events) window.removeEventListener(e, reset);
      document.body.classList.remove("fs-rumble", "fs-shake");
    };
  }, []);

  return (
    <>
      {/* ① 地鳴り中の赤い縁。じわじわ濃くなる */}
      {phase === "rumble" && <div className="fs-vignette pointer-events-none fixed inset-0 z-40" aria-hidden />}

      {/* ② 爆発 */}
      {phase === "boom" && (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
          <div className="fs-flash absolute inset-0" />

          <div className="absolute left-1/2 top-1/2">
            {/* 衝撃波 */}
            <div className="fs-wave" />
            <div className="fs-wave fs-wave-2" />

            {/* 煙（火球より先に広がり、あとまで残る） */}
            {Array.from({ length: SMOKES }, (_, i) => {
              const a = (360 / SMOKES) * i + (i % 3) * 7;
              const d = 16 + (i % 4) * 7;
              return (
                <div
                  key={`s${i}`}
                  className="fs-smoke"
                  style={{
                    ["--x" as string]: `${Math.cos((a * Math.PI) / 180) * d}vmax`,
                    ["--y" as string]: `${Math.sin((a * Math.PI) / 180) * d - 6}vmax`,
                    width: `${26 + (i % 4) * 9}vmax`,
                    height: `${26 + (i % 4) * 9}vmax`,
                    animationDelay: `${0.05 + (i % 5) * 0.06}s`,
                  }}
                />
              );
            })}

            {/* 火球 */}
            <div className="fs-core" />
            <div className="fs-core fs-core-2" />

            {/* 火の粉 */}
            {Array.from({ length: SPARKS }, (_, i) => {
              const a = (360 / SPARKS) * i + (i % 5) * 3;
              const d = 26 + (i % 7) * 9;
              const sz = 3 + (i % 4) * 2;
              return (
                <span
                  key={`p${i}`}
                  className="fs-spark"
                  style={{
                    ["--x" as string]: `${Math.cos((a * Math.PI) / 180) * d}vmax`,
                    ["--y" as string]: `${Math.sin((a * Math.PI) / 180) * d}vmax`,
                    width: sz, height: sz,
                    animationDelay: `${(i % 6) * 0.03}s`,
                    animationDuration: `${1.1 + (i % 5) * 0.28}s`,
                  }}
                />
              );
            })}
          </div>

          <p className="fs-line absolute bottom-20 left-0 right-0 px-6 text-center text-base font-bold text-gray-800">
            {line}
          </p>
        </div>
      )}

      <style>{`
        /* ── 地鳴り ───────────────────────────── */
        @keyframes fs-rumble-keys {
          0%   { transform: translate(0, 0); }
          20%  { transform: translate(-1px, 1px); }
          40%  { transform: translate(1px, -1px); }
          60%  { transform: translate(-2px, 1px); }
          80%  { transform: translate(2px, -2px); }
          100% { transform: translate(-1px, 1px); }
        }
        @keyframes fs-rumble-grow {
          0%   { opacity: 0.15; }
          100% { opacity: 1; }
        }
        @keyframes fs-vignette-keys {
          0%   { box-shadow: inset 0 0 0 0 rgba(200,30,10,0); background: rgba(0,0,0,0); }
          60%  { box-shadow: inset 0 0 90px 10px rgba(200,40,10,0.18); background: rgba(40,0,0,0.04); }
          100% { box-shadow: inset 0 0 200px 40px rgba(220,50,10,0.45); background: rgba(40,0,0,0.12); }
        }
        .fs-rumble {
          animation: fs-rumble-keys 0.06s linear infinite, fs-rumble-grow ${RUMBLE_MS}ms linear forwards;
        }
        .fs-vignette { animation: fs-vignette-keys ${RUMBLE_MS}ms ease-in forwards; }

        /* ── 閃光 ─────────────────────────────── */
        @keyframes fs-flash-keys {
          0%   { background: rgba(255,255,255,0); }
          5%   { background: rgba(255,252,240,0.98); }
          18%  { background: rgba(255,190,90,0.5); }
          45%  { background: rgba(255,120,40,0.12); }
          100% { background: rgba(255,255,255,0); }
        }
        .fs-flash { animation: fs-flash-keys 1.3s ease-out forwards; }

        /* ── 火球 ─────────────────────────────── */
        @keyframes fs-core-keys {
          0%   { transform: translate(-50%, -50%) scale(0.04); opacity: 1; filter: blur(0px); }
          8%   { transform: translate(-50%, -50%) scale(0.75); opacity: 1; filter: blur(2px); }
          30%  { transform: translate(-50%, -52%) scale(1.15); opacity: 0.95; filter: blur(8px); }
          65%  { transform: translate(-50%, -56%) scale(1.5);  opacity: 0.45; filter: blur(20px); }
          100% { transform: translate(-50%, -62%) scale(1.9);  opacity: 0;    filter: blur(34px); }
        }
        .fs-core {
          position: absolute; left: 0; top: 0;
          width: 62vmax; height: 62vmax; border-radius: 9999px;
          background: radial-gradient(circle at 50% 50%,
            #ffffff 0%, #fff6cf 9%, #ffd874 19%, #ffa52b 32%,
            #ff6a14 46%, #e03207 60%, rgba(120,26,6,0.55) 74%, rgba(60,14,4,0) 86%);
          animation: fs-core-keys 2.6s cubic-bezier(.12,.75,.25,1) forwards;
        }
        .fs-core-2 {
          width: 34vmax; height: 34vmax;
          background: radial-gradient(circle at 50% 45%,
            #ffffff 0%, #fffbe8 18%, #ffdf8a 38%, #ff9c22 62%, rgba(255,110,20,0) 80%);
          animation-duration: 1.7s; animation-delay: 0.03s;
        }

        /* ── 衝撃波 ───────────────────────────── */
        @keyframes fs-wave-keys {
          0%   { width: 0; height: 0; opacity: 0.95; border-width: 18px; }
          100% { width: 210vmax; height: 210vmax; opacity: 0; border-width: 0; }
        }
        .fs-wave {
          position: absolute; left: 0; top: 0;
          transform: translate(-50%, -50%);
          border: solid rgba(255,214,140,0.9);
          border-radius: 9999px;
          animation: fs-wave-keys 1.4s cubic-bezier(.1,.7,.2,1) forwards;
        }
        .fs-wave-2 { border-color: rgba(255,110,40,0.5); animation-delay: 0.16s; animation-duration: 1.8s; }

        /* ── 火の粉 ───────────────────────────── */
        @keyframes fs-spark-keys {
          0%   { transform: translate(-50%, -50%) scale(1); opacity: 0; }
          6%   { opacity: 1; }
          70%  { opacity: 0.9; }
          100% { transform: translate(calc(-50% + var(--x)), calc(-50% + var(--y))) scale(0.25); opacity: 0; }
        }
        .fs-spark {
          position: absolute; left: 0; top: 0; border-radius: 9999px;
          background: #fffbe0;
          box-shadow: 0 0 10px 3px rgba(255,170,50,0.95), 0 0 24px 8px rgba(255,90,20,0.45);
          animation-name: fs-spark-keys;
          animation-timing-function: cubic-bezier(.08,.8,.2,1);
          animation-fill-mode: forwards;
        }

        /* ── 煙 ───────────────────────────────── */
        @keyframes fs-smoke-keys {
          0%   { transform: translate(-50%, -50%) scale(0.2); opacity: 0; }
          15%  { opacity: 0.55; }
          100% { transform: translate(calc(-50% + var(--x)), calc(-50% + var(--y))) scale(1.6); opacity: 0; }
        }
        .fs-smoke {
          position: absolute; left: 0; top: 0; border-radius: 9999px;
          background: radial-gradient(circle, rgba(70,62,58,0.6) 0%, rgba(70,62,58,0.28) 45%, rgba(70,62,58,0) 72%);
          filter: blur(10px);
          animation: fs-smoke-keys 3.2s ease-out forwards;
        }

        /* ── ひとこと ─────────────────────────── */
        @keyframes fs-line-keys {
          0%   { opacity: 0; transform: translateY(10px) scale(0.96); }
          22%  { opacity: 1; transform: translateY(0) scale(1); }
          80%  { opacity: 1; }
          100% { opacity: 0; }
        }
        .fs-line { animation: fs-line-keys ${TOTAL_MS}ms ease-out forwards; }

        /* ── 爆発後のゆれ ─────────────────────── */
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
        @keyframes fs-buzz-keys {
          0%   { transform: translate(-4px, 2px)  rotate(-0.35deg); }
          25%  { transform: translate(4px, -3px)  rotate(0.35deg); }
          50%  { transform: translate(-3px, -2px) rotate(-0.3deg); }
          75%  { transform: translate(3px, 3px)   rotate(0.3deg); }
          100% { transform: translate(-4px, 2px)  rotate(-0.35deg); }
        }
        .fs-shake {
          animation:
            fs-hit-keys 0.7s cubic-bezier(.36,.07,.19,.97),
            fs-buzz-keys 0.07s linear 0.7s 50;
        }
      `}</style>
    </>
  );
}

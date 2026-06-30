"use client";

import { useCallback, useRef, useState } from "react";

/**
 * 保存・送信・削除など「サーバーへの書き込み」を多重実行から守る共通フック。
 *
 * - `run(fn)` は実行中なら後続の呼び出しを**同期的に無視**する（ref判定なので、
 *   ボタンの disabled が再描画される前の連打（同一tickの二度押し）も確実にブロック）。
 * - `locked` を button の `disabled` に渡せば、処理中はボタンも無効化＋スピナー表示できる。
 *
 * 使い方:
 *   const { locked, run } = useSubmitLock();
 *   <button disabled={locked} onClick={() => run(async () => { await action(); onClose(); })}>
 *
 * フォームの action 用:
 *   <form action={(fd) => run(() => handle(fd))}>
 */
export function useSubmitLock() {
  const inFlight = useRef(false);
  const [locked, setLocked] = useState(false);

  const run = useCallback(async (fn: () => Promise<void> | void) => {
    if (inFlight.current) return; // 実行中の連打を無視
    inFlight.current = true;
    setLocked(true);
    try {
      await fn();
    } finally {
      inFlight.current = false;
      setLocked(false);
    }
  }, []);

  return { locked, run };
}

"use client";

import { useEffect, useRef, useState } from "react";
import { confirmTrialAction } from "./actions";

/**
 * 開いたら自動で「確認しました」を送る。送れなかったときだけボタンを出す。
 * 少し待ってから送るのは、リンクを先読みするだけの仕組みで記録されないようにするため。
 */
export function ConfirmRunner({ token, name }: { token: string; name: string }) {
  const [state, setState] = useState<"sending" | "done" | "error">("sending");
  const started = useRef(false);

  async function send() {
    setState("sending");
    try {
      const r = await confirmTrialAction(token);
      setState(r.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const id = setTimeout(() => { void send(); }, 500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="bg-white border border-gray-200 rounded-md px-4 py-4">
      {state === "done" ? (
        <>
          <p className="text-gold-600 text-xs font-bold tracking-widest mb-1">CONFIRMED</p>
          <h1 className="text-lg font-bold mb-2">ご予約を確認しました</h1>
          <p className="text-sm text-gray-600 leading-relaxed">{name} 様、ご確認ありがとうございます。当日お会いできることを楽しみにしております。</p>
        </>
      ) : state === "error" ? (
        <>
          <h1 className="text-lg font-bold mb-2">確認を送れませんでした</h1>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">通信の状態をご確認のうえ、下のボタンをもう一度押してください。</p>
          <button onClick={() => void send()} className="w-full rounded-md bg-navy-900 text-white text-base font-bold py-3.5 border-b-[3px] border-gold-500">
            予約を確認しました
          </button>
        </>
      ) : (
        <>
          <h1 className="text-lg font-bold mb-2">ご予約を確認しています…</h1>
          <p className="text-sm text-gray-600">そのままお待ちください。</p>
        </>
      )}
    </section>
  );
}

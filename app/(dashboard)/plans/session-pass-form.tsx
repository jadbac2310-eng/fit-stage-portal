"use client";

// 回数券を追加するフォーム（プラン・回数券の画面と、レッスンの登録フォームの両方で使う）。
//
// 店舗／出張 → メニュー → 回数 をボタンで選ぶと、人数・回数・金額・メモが入る（金額はHPの料金表と同じ）。
// どれにも当てはまらない券（6回券など）は「その他（手で入れる）」で回数と金額を打つ。
//
// <form> にしていない（<div> とボタン）。レッスンの登録フォームの中から開くことがあり、
// フォームの中にフォームは置けないため。入力欄に name も付けていない（外側のフォームの送信に混ざらないように）。

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSessionPassAction } from "./actions";
import { cn } from "@/lib/cn";
import { Spinner } from "@/components/ui/spinner";
import { useSubmitLock } from "@/lib/use-submit-lock";
import { PASS_MENUS, PASS_MENU_GROUP_LABEL, passMenuName, type PassMenuGroup } from "@/lib/session-pass-menus";

/** 今日の日付（端末の時刻で YYYY-MM-DD） */
function todayLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function SessionPassForm({
  customerId, onClose, onCreated,
}: {
  customerId: string;
  onClose: () => void;
  /** 追加できたときに、できた回数券の id を渡す（レッスンの登録フォームで、そのまま選ぶのに使う） */
  onCreated?: (passId: string) => void;
}) {
  const router = useRouter();
  const { locked: loading, run } = useSubmitLock();
  const [group, setGroup] = useState<PassMenuGroup | "custom">("store");
  const [menuIdx, setMenuIdx] = useState<number | null>(null);
  const [personCount, setPersonCount] = useState(1);
  const [totalCount, setTotalCount] = useState("");
  const [price, setPrice] = useState("");
  const [purchasedAt, setPurchasedAt] = useState(todayLocal);
  const [expiredAt, setExpiredAt] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const menus = PASS_MENUS.map((m, i) => ({ m, i })).filter(({ m }) => m.group === group);
  const menu = menuIdx != null ? PASS_MENUS[menuIdx] : null;

  function pickGroup(g: PassMenuGroup | "custom") {
    setGroup(g); setMenuIdx(null); setTotalCount(""); setPrice("");
    if (g === "custom") setNote("");
  }
  function pickMenu(i: number) {
    const m = PASS_MENUS[i];
    setMenuIdx(i); setPersonCount(m.personCount); setTotalCount(""); setPrice("");
    setNote(passMenuName(m));
  }
  function pickCount(count: number, amount: number) {
    setTotalCount(String(count)); setPrice(String(amount));
  }

  async function handleSubmit() {
    setError("");
    if (!(parseInt(totalCount, 10) > 0) || price.trim() === "") { setError("回数と金額を入れてください"); return; }
    if (!purchasedAt) { setError("購入日を入れてください"); return; }
    const fd = new FormData();
    fd.set("customerId", customerId);
    fd.set("personCount", String(personCount));
    fd.set("totalCount", totalCount);
    fd.set("price", price);
    fd.set("purchasedAt", purchasedAt);
    fd.set("expiredAt", expiredAt);
    fd.set("note", note);
    await run(async () => {
      try {
        const result = await createSessionPassAction(fd);
        if (!result.ok) throw new Error(result.error);
        if (result.passId) onCreated?.(result.passId);
        onClose();
        router.refresh();
      } catch (e) { setError(e instanceof Error ? e.message : "保存できませんでした"); }
    });
  }

  const inputClass = "w-full min-w-0 max-w-full box-border px-3 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500";
  const chip = (on: boolean) => cn(
    "py-2 rounded-lg border text-xs font-semibold",
    // 選んだボタンに hover の色を残さない（スマホはタップ後も hover が残るので、白文字が見えなくなる）
    on ? "bg-amber-500 border-amber-500 text-white" : "border-gray-300 text-gray-600 bg-white active:bg-gray-100",
  );

  return (
    <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 space-y-3">
      <div className="grid grid-cols-3 gap-1.5">
        {(["store", "outcall", "custom"] as const).map((g) => (
          <button key={g} type="button" onClick={() => pickGroup(g)} className={chip(group === g)}>
            {g === "custom" ? "その他" : PASS_MENU_GROUP_LABEL[g]}
          </button>
        ))}
      </div>

      {group !== "custom" && (
        <>
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1">メニュー</p>
            <div className="grid grid-cols-2 gap-1.5">
              {menus.map(({ m, i }) => (
                <button key={i} type="button" onClick={() => pickMenu(i)} className={chip(menuIdx === i)}>{m.label}</button>
              ))}
            </div>
          </div>
          {menu && (
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">回数をえらぶ</p>
              <div className="grid grid-cols-3 gap-1.5">
                {menu.prices.map((p) => (
                  <button key={p.count} type="button" onClick={() => pickCount(p.count, p.amount)}
                    className={cn(chip(totalCount === String(p.count)), "flex flex-col items-center leading-tight py-1.5")}>
                    <span>{p.count}回</span>
                    <span className={cn("text-[10px] font-normal tabular-nums", totalCount === String(p.count) ? "text-white/90" : "text-gray-400")}>
                      ¥{p.amount.toLocaleString("ja-JP")}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 mt-1">有効期限の目安：初回利用日から {menu.validity}</p>
            </div>
          )}
        </>
      )}

      {group === "custom" && (
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">人数</p>
          <div className="flex gap-2">
            {[1, 2].map((n) => (
              <button key={n} type="button" onClick={() => setPersonCount(n)} className={cn(chip(personCount === n), "flex-1")}>{n}名様</button>
            ))}
          </div>
        </div>
      )}

      {/* 回数と金額。いつも出しておく（2026-11-19 尚樹「回数券の値段と回数も、入力できるように」。
          前は回数のボタンを押すまで隠れていて、手で入れられると分からなかった）。
          ボタンで選ぶと入り、そのあと手で直せる（特別価格・6回券など）。 */}
      <div>
        <div className="flex gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-600 mb-1">回数</p>
            <input type="number" min="1" inputMode="numeric" placeholder="例: 8" value={totalCount} aria-label="回数"
              onChange={(e) => setTotalCount(e.target.value)} className={inputClass} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-600 mb-1">金額（税込）</p>
            <input type="number" min="0" step="1" inputMode="numeric" placeholder="例: 72000" value={price} aria-label="金額（税込）"
              onChange={(e) => setPrice(e.target.value)} className={inputClass} />
          </div>
        </div>
        {group !== "custom" && (
          <p className="text-[11px] text-gray-400 mt-1">上のボタンで選ぶと入ります。手で入れる・直すこともできます。</p>
        )}
      </div>

      <div className="flex gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-600 mb-1">購入日</p>
          <input type="date" value={purchasedAt} aria-label="購入日" onChange={(e) => setPurchasedAt(e.target.value)} className={inputClass} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-600 mb-1">有効期限（任意）</p>
          <input type="date" value={expiredAt} aria-label="有効期限" onChange={(e) => setExpiredAt(e.target.value)} className={inputClass} />
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-gray-600 mb-1">メモ</p>
        <input value={note} aria-label="メモ" onChange={(e) => setNote(e.target.value)} placeholder="備考など" className={inputClass} />
      </div>
      {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onClose}
          className="flex-1 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50">
          キャンセル
        </button>
        <button type="button" onClick={handleSubmit} disabled={loading}
          className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-xs font-semibold flex items-center justify-center gap-1">
          {loading && <Spinner size={12} />}{loading ? "追加中..." : "回数券を追加"}
        </button>
      </div>
    </div>
  );
}

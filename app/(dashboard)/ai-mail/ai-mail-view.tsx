"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageTitle, tabsWrap, tabButton, tabCount } from "@/components/ui/page-title";
import { SectionBox } from "@/components/ui/section-box";
import { cn } from "@/lib/cn";
import {
  CATEGORY_HINT, CATEGORY_LABEL, EVENT_LABEL, MAIL_CATEGORIES, accuracy, workerState,
  type AgentEventRow, type AgentStatus, type MailCategory, type MailRow,
} from "@/lib/ai-mail-types";
import { setBudgetAction, setHumanCategoryAction, setKillSwitchAction } from "./actions";

const CAT_STYLE: Record<MailCategory, string> = {
  needs_review: "bg-amber-50 text-amber-800 border-amber-300",
  faq: "bg-blue-50 text-blue-800 border-blue-300",
  sales: "bg-gray-100 text-gray-700 border-gray-300",
  ignore: "bg-white text-gray-400 border-gray-200",
};

function jst(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

function CatBadge({ c, small }: { c: MailCategory | null; small?: boolean }) {
  if (!c) return <span className="text-[11px] text-gray-400 border border-dashed border-gray-300 px-1.5">仕分け待ち</span>;
  return <span className={cn("border font-bold whitespace-nowrap", small ? "text-[10px] px-1" : "text-[11px] px-1.5 py-0.5", CAT_STYLE[c])}>{CATEGORY_LABEL[c]}</span>;
}

export function AiMailView({ status, rows, events, spentUsd, nowIso }: {
  status: AgentStatus | null; rows: MailRow[]; events: AgentEventRow[]; spentUsd: number; nowIso: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<MailCategory | "all">("needs_review");
  const [open, setOpen] = useState<string | null>(null);
  const [budget, setBudget] = useState(String(status?.monthlyBudgetUsd ?? 10));

  const now = new Date(nowIso).getTime();
  const state = workerState(status?.heartbeatAt ?? null, now);
  const acc = accuracy(rows);
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    for (const k of MAIL_CATEGORIES) c[k] = rows.filter((r) => r.category === k).length;
    return c;
  }, [rows]);
  const shown = tab === "all" ? rows : rows.filter((r) => r.category === tab);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? "うまくいきませんでした");
      router.refresh();
    });
  };

  const toggleKill = () => {
    if (!status) return;
    const on = !status.killSwitch;
    const msg = on
      ? "AIメール担当を緊急停止します。受信と保存だけ続け、仕分け・通知・送信はすべて止めます。よろしいですか？"
      : "AIメール担当を再開します。よろしいですか？";
    if (!window.confirm(msg)) return;
    run(() => setKillSwitchAction(on));
  };

  return (
    <div className="space-y-4">
      <PageTitle title="AIメール担当" sub={`フェーズ${status?.phase ?? 1}：読むだけ（仕分けとまとめ通知。返信はしません）`} />

      {!status && (
        <div className="border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          データベースの準備がまだです。<code>supabase/migrations/20261121000001_ai_mail_agent.sql</code> を Supabase の SQL Editor で実行してください。
        </div>
      )}
      {error && <div className="border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}

      <div className="grid gap-4 md:grid-cols-3">
        <SectionBox title="動いているか" padded>
          <p className={cn("text-lg font-bold", state === "alive" ? "text-green-700" : state === "down" ? "text-red-700" : "text-gray-500")}>
            {state === "alive" ? "● 稼働中" : state === "down" ? "● 止まっています" : "○ まだ動いていません"}
          </p>
          <p className="text-xs text-gray-500 mt-1">最後の動き：{jst(status?.heartbeatAt ?? null)}{status?.workerVersion ? `（v${status.workerVersion}）` : ""}</p>
          {state === "never" && <p className="text-xs text-gray-500 mt-1">VPS にワーカーを入れると、ここが「稼働中」になります。</p>}
          {state === "down" && <p className="text-xs text-red-700 mt-1">30分以上動いていません。VPS で <code>pm2 status</code> を確認してください。</p>}
        </SectionBox>

        <SectionBox title="緊急停止" padded>
          <p className={cn("text-lg font-bold", status?.killSwitch ? "text-red-700" : "text-gray-800")}>
            {status?.killSwitch ? "停止中" : "動かしています"}
          </p>
          {status?.killSwitch && (
            <p className="text-xs text-gray-500 mt-1">{jst(status.killedAt)} {status.killedBy ?? ""}{status.killReason ? `（${status.killReason}）` : ""}</p>
          )}
          <button
            type="button"
            disabled={!status || pending}
            onClick={toggleKill}
            className={cn(
              "mt-2 w-full py-2.5 text-sm font-bold text-white disabled:opacity-50",
              status?.killSwitch ? "bg-blue-600 hover:bg-blue-700" : "bg-red-600 hover:bg-red-700",
            )}
          >
            {status?.killSwitch ? "再開する" : "緊急停止する"}
          </button>
          <p className="text-[11px] text-gray-500 mt-1.5">LINE で「停止」と送っても止まります（再開はこの画面だけ）。</p>
        </SectionBox>

        <SectionBox title="今月の AI の費用" padded>
          <p className="text-lg font-bold text-gray-800">${spentUsd.toFixed(2)} <span className="text-sm text-gray-500">/ ${status?.monthlyBudgetUsd.toFixed(2) ?? "10.00"}</span></p>
          <p className="text-[11px] text-gray-500 mt-1">8割で LINE。上限に届くと、仕分けせずに全部「要確認」にします。</p>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-xs text-gray-600">上限 $</span>
            <input
              type="number" min={0} max={200} step={1} value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-20 border border-[var(--portal-line)] px-2 py-1 text-sm"
            />
            <button
              type="button" disabled={!status || pending}
              onClick={() => run(() => setBudgetAction(Number(budget)))}
              className="border border-[var(--portal-navy)] px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
            >
              変える
            </button>
          </div>
        </SectionBox>
      </div>

      <SectionBox title="仕分けの精度（尚樹が正解を付けた分だけで数える）" padded>
        {acc.reviewed === 0 ? (
          <p className="text-sm text-gray-500">まだ正解が付いていません。下の一覧で行を開き、AIの仕分けが合っていれば「合っている」、違えば正しい区分を押してください。1週間後の報告に使います。</p>
        ) : (
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span>確認した数 <b>{acc.reviewed}</b>件</span>
            <span>合っていた <b>{acc.correct}</b>件（<b>{Math.round((acc.rate ?? 0) * 100)}%</b>）</span>
            <span className={acc.missedReview ? "text-red-700" : ""}>要確認の取りこぼし <b>{acc.missedReview}</b>件</span>
            <span>要確認にしすぎ <b>{acc.overReview}</b>件</span>
          </div>
        )}
      </SectionBox>

      <SectionBox title="届いたメール・お問い合わせ（直近14日）">
        <div className="p-2">
          <div className={tabsWrap}>
            {(["needs_review", "faq", "sales", "ignore", "all"] as const).map((k) => (
              <button key={k} type="button" className={tabButton(tab === k, "sm")} onClick={() => setTab(k)}>
                {k === "all" ? "すべて" : CATEGORY_LABEL[k]}
                <span className={tabCount(tab === k)}>{counts[k] ?? 0}</span>
              </button>
            ))}
          </div>
          {tab !== "all" && <p className="text-[11px] text-gray-500 mt-1.5">{CATEGORY_HINT[tab]}</p>}
        </div>
        {shown.length === 0 ? (
          <p className="px-3 pb-4 text-sm text-gray-500">ありません。</p>
        ) : (
          <ul className="divide-y divide-[var(--portal-line)] border-t border-[var(--portal-line)]">
            {shown.map((r) => {
              const isOpen = open === r.id;
              const agreed = r.humanCategory && r.humanCategory === r.category;
              return (
                <li key={r.id}>
                  <button type="button" onClick={() => setOpen(isOpen ? null : r.id)} className="w-full text-left px-3 py-2.5 hover:bg-gray-50">
                    <div className="flex items-center gap-2 text-[11px] text-gray-500">
                      <span>{jst(r.receivedAt)}</span>
                      {r.source === "contact_form" && <span className="border border-[var(--portal-gold)] text-gold-600 px-1">HPフォーム</span>}
                      {r.toAddress && r.source === "email" && <span>→ {r.toAddress}</span>}
                      {r.urgent && r.urgent !== "none" && <span className="text-red-700 font-bold">{r.urgent === "complaint" ? "クレームの可能性" : "当日の変更"}</span>}
                      <span className="ml-auto flex items-center gap-1">
                        <CatBadge c={r.category} />
                        {r.humanCategory && (
                          <span className={cn("text-[10px]", agreed ? "text-green-700" : "text-red-700")}>
                            {agreed ? "✓ 合っている" : `正解：${CATEGORY_LABEL[r.humanCategory]}`}
                          </span>
                        )}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-gray-900 mt-0.5 truncate">{r.subject || "（件名なし）"}</p>
                    <p className="text-xs text-gray-600 truncate">{r.fromName ? `${r.fromName} ` : ""}&lt;{r.fromAddress ?? "?"}&gt;</p>
                    {(r.summary || r.reason) && <p className="text-xs text-gray-500 mt-0.5 truncate">→ {r.summary || r.reason}</p>}
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-3 space-y-2">
                      <div className="text-xs text-gray-600 space-y-0.5">
                        <p>AIの仕分け：<CatBadge c={r.category} small /> {r.confidence ? `自信 ${r.confidence === "high" ? "高" : r.confidence === "medium" ? "中" : "低"}` : ""}{r.classifiedBy === "rule" ? "（決まりで判定）" : ""}</p>
                        {r.reason && <p>理由：{r.reason}</p>}
                        {r.error && <p className="text-red-700">エラー：{r.error}</p>}
                      </div>
                      {r.bodyText ? (
                        <pre className="whitespace-pre-wrap break-words text-xs text-gray-800 bg-gray-50 border border-[var(--portal-line)] p-2 max-h-72 overflow-auto font-sans">{r.bodyText}</pre>
                      ) : (
                        <p className="text-xs text-gray-400">本文は保存していません（決まりで無視にしたメール）。</p>
                      )}
                      <div>
                        <p className="text-xs font-bold text-gray-700 mb-1">正解を付ける</p>
                        <div className="flex flex-wrap gap-1.5">
                          {r.category && (
                            <button type="button" disabled={pending} onClick={() => run(() => setHumanCategoryAction(r.id, r.category))}
                              className="border border-green-600 text-green-700 px-2.5 py-1 text-xs font-bold hover:bg-green-50 disabled:opacity-50">
                              合っている
                            </button>
                          )}
                          {MAIL_CATEGORIES.filter((c) => c !== r.category).map((c) => (
                            <button key={c} type="button" disabled={pending} onClick={() => run(() => setHumanCategoryAction(r.id, c))}
                              className={cn("border px-2.5 py-1 text-xs font-bold disabled:opacity-50", r.humanCategory === c ? "bg-navy-900 text-white border-navy-900" : "border-[var(--portal-line)] text-gray-700 hover:bg-gray-50")}>
                              正しくは「{CATEGORY_LABEL[c]}」
                            </button>
                          ))}
                          {r.humanCategory && (
                            <button type="button" disabled={pending} onClick={() => run(() => setHumanCategoryAction(r.id, null))}
                              className="px-2 py-1 text-xs text-gray-500 underline disabled:opacity-50">
                              取り消す
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </SectionBox>

      <SectionBox title="ログ（新しい順）">
        {events.length === 0 ? (
          <p className="px-3 py-3 text-sm text-gray-500">まだありません。</p>
        ) : (
          <ul className="divide-y divide-[var(--portal-line)] text-xs">
            {events.map((e) => (
              <li key={e.id} className="px-3 py-1.5 flex gap-2">
                <span className="text-gray-500 whitespace-nowrap">{jst(e.createdAt)}</span>
                <span className="font-bold text-gray-800 whitespace-nowrap">{EVENT_LABEL[e.eventType] ?? e.eventType}</span>
                <span className="text-gray-600 truncate">{describe(e)}</span>
                <span className="ml-auto text-gray-400 whitespace-nowrap">{e.actor === "ai" ? "" : e.actor}</span>
              </li>
            ))}
          </ul>
        )}
      </SectionBox>
    </div>
  );
}

function describe(e: AgentEventRow): string {
  const d = e.detail;
  if (typeof d.category === "string") return `${CATEGORY_LABEL[d.category as MailCategory] ?? d.category}${d.reason ? `：${String(d.reason)}` : ""}`;
  if (d.reason) return String(d.reason);
  if (d.error) return String(d.error);
  if (d.count != null) return `${d.count}件`;
  if (d.usd != null) return `$${d.usd}`;
  return "";
}

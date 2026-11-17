"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Send, Copy, Check } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { SectionBox } from "@/components/ui/section-box";
import { useSubmitLock } from "@/lib/use-submit-lock";
import { submitOrderAction } from "./actions";

export interface OrderRow {
  id: string;
  deptKey: string;
  deptName: string;
  title: string;
  status: string;
  dueOn?: string;
  updatedAt: string;
  stalled: boolean;
  /** Claude Code のセッションに貼る文 */
  brief: string;
}

const DEPT_OPTIONS = [
  { value: "auto", label: "おまかせ（統括本部長が決める）" },
  { value: "hp-growth", label: "HP・集客部" },
  { value: "portal-dev", label: "ポータル開発部" },
  { value: "ops-check", label: "業務チェック部" },
] as const;

/** 統括本部長に指示を出す箱と、出した指示の一覧（AI部署の画面） */
export function OrderPanel({ chiefLabel, orders }: { chiefLabel: string; orders: OrderRow[] }) {
  const router = useRouter();
  const { locked, run } = useSubmitLock();
  const [text, setText] = useState("");
  const [dept, setDept] = useState<(typeof DEPT_OPTIONS)[number]["value"]>("auto");
  const [dueOn, setDueOn] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function submit() {
    setMsg(null);
    await run(async () => {
      const r = await submitOrderAction({ text, dept, dueOn: dueOn || undefined });
      if (!r.ok) { setMsg({ ok: false, text: r.error }); return; }
      setMsg({ ok: true, text: `${r.deptName}に振り分けて「${r.title}」として会社のやることに入れました。` });
      setText(""); setDueOn(""); setDept("auto");
      router.refresh();
    });
  }

  async function copy(o: OrderRow) {
    try {
      await navigator.clipboard.writeText(o.brief);
      setCopied(o.id);
      setTimeout(() => setCopied((c) => (c === o.id ? null : c)), 2000);
    } catch { /* コピーできない端末では何もしない */ }
  }

  const open = orders.filter((o) => o.status !== "完了");
  const input = "w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white";

  return (
    <SectionBox title={`${chiefLabel}に指示を出す`} action={{ label: "やることへ", href: "/tasks" }} padded>
      <div className="space-y-2">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className={input}
          placeholder="例）江坂店のページで「江坂 パーソナルジム」の順位を上げたい。案を出して／体験の一覧に、申込の経路で絞り込みを足して" />
        <div className="flex flex-wrap gap-2">
          <select value={dept} onChange={(e) => setDept(e.target.value as typeof dept)} className={`${input} w-auto flex-1 min-w-[180px]`}>
            {DEPT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input type="date" value={dueOn} onChange={(e) => setDueOn(e.target.value)} className={`${input} w-auto`} aria-label="期限（任意）" />
          <button type="button" onClick={submit} disabled={locked || !text.trim()}
            className="flex items-center gap-1.5 bg-navy-900 text-white text-sm font-bold px-4 py-2 border-b-2 border-gold-500 disabled:opacity-50">
            {locked ? <Spinner size={14} /> : <Send size={14} />}{locked ? "振り分け中…" : "指示を出す"}
          </button>
        </div>
        {msg && <p className={`text-xs ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>}
        <p className="text-[11px] text-gray-500 leading-relaxed">
          指示は「会社のやること」に【部署名】つきで入ります。AI がひとりでに作業を始めるわけではありません。
          進めるときは、下の「コピー」を Claude Code のセッションに貼って頼んでください（HP のことは HP のセッションへ）。
        </p>
      </div>

      <div className="mt-4">
        <p className="text-sm font-bold text-gray-900 mb-1.5">進行中の指示（{open.length}件）</p>
        {open.length === 0 ? (
          <p className="text-xs text-gray-500">いま進行中の指示はありません。</p>
        ) : (
          <ul className="border border-[var(--portal-line)] divide-y divide-[var(--portal-line)]">
            {open.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
                <span className="text-[11px] font-bold text-navy-900 border border-[var(--portal-line)] px-1.5 py-0.5 flex-shrink-0">{o.deptName}</span>
                <span className="flex-1 min-w-[140px] font-medium text-gray-900">{o.title}</span>
                <span className="text-xs text-gray-500 flex-shrink-0">{o.status}{o.dueOn ? `・期限 ${o.dueOn.slice(5).replace("-", "/")}` : ""}</span>
                {o.stalled && <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-300 px-1.5 py-0.5 flex-shrink-0">止まっています</span>}
                <button type="button" onClick={() => copy(o)} className="flex items-center gap-1 text-xs text-blue-600 flex-shrink-0">
                  {copied === o.id ? <Check size={12} /> : <Copy size={12} />}{copied === o.id ? "コピーしました" : "コピー"}
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-[11px] text-gray-500 mt-1.5">終わった指示は <Link href="/tasks" className="underline text-blue-600">やること</Link> で完了にすると、ここから消えます。</p>
      </div>
    </SectionBox>
  );
}

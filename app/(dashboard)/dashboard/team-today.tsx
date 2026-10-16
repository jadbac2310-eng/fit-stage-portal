"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { assertActionOk } from "@/lib/action-result";
import { toggleKudoAction } from "./actions";

export interface TeamMemberToday {
  memberId:  string;
  name:      string;
  avatarUrl?: string;
  /** 今日の担当レッスン数（キャンセル以外） */
  lessons:   number;
  /** もらった👏の数 */
  kudos:     number;
  /** 自分が押しているか */
  mine:      boolean;
  /** 自分自身の行か */
  isMe:      boolean;
}

/**
 * 今日のチーム。
 *
 * 今日レッスンがある人を並べて、おつかれの「👏」を送れるようにする。
 * 順位は出さない（多い順ではなく名前順）。自分には押せない。
 */
export function TeamToday({ rows, day }: { rows: TeamMemberToday[]; day: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  // 押した見た目をすぐ返す（サーバーの返事を待つと反応が鈍く感じるため）
  const [local, setLocal] = useState<Record<string, { kudos: number; mine: boolean }>>({});

  if (rows.length === 0) return null;

  async function tap(memberId: string) {
    if (busy) return;
    const row = rows.find((r) => r.memberId === memberId);
    if (!row || row.isMe) return;
    const cur = local[memberId] ?? { kudos: row.kudos, mine: row.mine };
    setLocal((s) => ({ ...s, [memberId]: { kudos: cur.kudos + (cur.mine ? -1 : 1), mine: !cur.mine } }));
    setBusy(memberId);
    try {
      assertActionOk(await toggleKudoAction(memberId, day));
      router.refresh();
    } catch {
      setLocal((s) => ({ ...s, [memberId]: cur }));   // 失敗したら戻す
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 mb-6">
      <p className="text-xs font-bold text-gray-700 mb-2">今日のチーム</p>
      <div className="space-y-1.5">
        {rows.map((r) => {
          const st = local[r.memberId] ?? { kudos: r.kudos, mine: r.mine };
          return (
            <div key={r.memberId} className="flex items-center gap-2.5 rounded-xl bg-gray-50 px-2.5 py-2">
              {r.avatarUrl ? (
                <Image src={r.avatarUrl} alt="" width={24} height={24} className="rounded-full object-cover w-6 h-6" />
              ) : (
                <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500">
                  {r.name.slice(0, 1)}
                </span>
              )}
              <span className="text-sm font-semibold text-gray-800 truncate">
                {r.name}{r.isMe && <span className="ml-1 text-[10px] text-gray-400">あなた</span>}
              </span>
              <span className="text-xs text-gray-400">today {r.lessons}本</span>

              <button
                type="button"
                onClick={() => tap(r.memberId)}
                disabled={r.isMe || busy === r.memberId}
                title={r.isMe ? "自分には押せません" : "おつかれさま！"}
                className={[
                  "ml-auto inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition",
                  r.isMe ? "border-gray-100 text-gray-300 cursor-default"
                         : st.mine ? "border-amber-300 bg-amber-50 text-amber-700"
                                   : "border-gray-200 text-gray-500 hover:border-amber-300 hover:text-amber-700",
                ].join(" ")}
              >
                {busy === r.memberId ? <Spinner size={11} /> : <span>👏</span>}
                {st.kudos > 0 ? st.kudos : ""}
              </button>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-gray-400 mt-2">今日レッスンがある人です。👏は1日1回ずつ送れます。</p>
    </div>
  );
}

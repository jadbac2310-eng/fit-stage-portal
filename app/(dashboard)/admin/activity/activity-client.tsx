"use client";

import { useMemo, useState } from "react";
import { History, LogIn, LogOut, Plus, Pencil, Trash2, ClipboardList, UserRound, Smartphone } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ActivityLog } from "@/lib/activity-logs";

const ACTION_META: Record<string, { label: string; cls: string; Icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  login:  { label: "ログイン",   cls: "bg-green-100 text-green-700",   Icon: LogIn },
  logout: { label: "ログアウト", cls: "bg-gray-100 text-gray-500",     Icon: LogOut },
  create: { label: "追加",       cls: "bg-blue-100 text-blue-700",     Icon: Plus },
  update: { label: "編集",       cls: "bg-amber-100 text-amber-700",   Icon: Pencil },
  delete: { label: "削除",       cls: "bg-red-100 text-red-700",       Icon: Trash2 },
  report: { label: "レポート",   cls: "bg-purple-100 text-purple-700", Icon: ClipboardList },
};

function actionMeta(action: string) {
  return ACTION_META[action] ?? { label: action, cls: "bg-gray-100 text-gray-600", Icon: ClipboardList };
}

function fmtDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", weekday: "short" }),
    time: d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }),
  };
}

export function ActivityClient({
  logs, members,
}: {
  logs: ActivityLog[];
  members: { id: string; name: string }[];
}) {
  const [member, setMember] = useState<string>("all");
  const [type, setType] = useState<"all" | "login" | "operation">("all");

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (member !== "all" && l.memberId !== member) return false;
      const isLogin = l.action === "login" || l.action === "logout";
      if (type === "login" && !isLogin) return false;
      if (type === "operation" && isLogin) return false;
      return true;
    });
  }, [logs, member, type]);

  // 日付ごとにグループ化
  const groups = useMemo(() => {
    const map = new Map<string, ActivityLog[]>();
    for (const l of filtered) {
      const key = l.createdAt.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(l);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto pb-10">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <History size={20} className="text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">操作・ログイン履歴</h1>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">ユーザーごとの操作とログインを確認できます（直近500件）</p>
      </div>

      {/* フィルタ */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <UserRound size={15} className="text-gray-400 flex-shrink-0" />
          <select
            value={member}
            onChange={(e) => setMember(e.target.value)}
            className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">全員</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {([["all", "すべて"], ["login", "ログイン"], ["operation", "操作"]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setType(key)}
              className={cn(
                "flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-sm font-semibold transition whitespace-nowrap",
                type === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🗒️</p>
          <p className="text-sm font-semibold text-gray-600">履歴がありません</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map(([day, items]) => (
            <div key={day}>
              <p className="text-xs font-bold text-gray-400 mb-2 px-1">
                {new Date(day + "T00:00:00+09:00").toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}
              </p>
              <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-50">
                {items.map((l) => {
                  const meta = actionMeta(l.action);
                  const { time } = fmtDateTime(l.createdAt);
                  return (
                    <div key={l.id} className="flex items-start gap-3 px-4 py-3">
                      <span className="text-xs text-gray-400 tabular-nums w-10 flex-shrink-0 pt-0.5">{time}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold", meta.cls)}>
                            <meta.Icon size={9} /> {meta.label}
                          </span>
                          <span className="text-xs font-semibold text-gray-700">{l.memberName ?? "不明"}</span>
                        </div>
                        {l.summary && <p className="text-sm text-gray-800 mt-0.5">{l.summary}</p>}
                        {(l.ip || l.userAgent) && (
                          <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1 min-w-0">
                            <Smartphone size={10} className="flex-shrink-0" />
                            <span className="truncate">{[l.ip, l.userAgent].filter(Boolean).join(" ・ ")}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

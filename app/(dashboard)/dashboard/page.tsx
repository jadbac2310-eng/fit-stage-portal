import Link from "next/link";
import { CheckSquare, ArrowRight, Database, BookOpen } from "lucide-react";
import { getTodos } from "@/lib/todos";
import { getMembers } from "@/lib/members";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [todos, members] = await Promise.all([getTodos(), getMembers()]);
  const pendingCount   = todos.filter((t) => !t.completed).length;
  const completedCount = todos.filter((t) => t.completed).length;

  const sections = [
    {
      href:        "/todo",
      icon:        CheckSquare,
      iconBg:      "bg-blue-100",
      iconColor:   "text-blue-600",
      label:       "タスク",
      description: "タスク管理",
      badge:       pendingCount > 0 ? `${pendingCount}件未対応` : "すべて完了",
      badgeColor:  pendingCount > 0 ? "text-amber-600 bg-amber-50" : "text-green-600 bg-green-50",
    },
    {
      href:        "/wiki",
      icon:        BookOpen,
      iconBg:      "bg-green-100",
      iconColor:   "text-green-600",
      label:       "Wiki",
      description: "社内ナレッジベース",
      badge:       null,
      badgeColor:  "",
    },
    {
      href:        "/master",
      icon:        Database,
      iconBg:      "bg-orange-100",
      iconColor:   "text-orange-600",
      label:       "マスタ管理",
      description: "担当者・各種マスタ",
      badge:       `${members.length}名`,
      badgeColor:  "text-gray-500 bg-gray-100",
    },
  ];

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6 hidden md:block">
        <h1 className="text-xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="text-sm text-gray-500 mt-0.5">FitStage 管理者ポータル</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 mb-1">未対応タスク</p>
          <p className="text-3xl font-bold text-gray-900">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 mb-1">完了済み</p>
          <p className="text-3xl font-bold text-green-600">{completedCount}</p>
        </div>
      </div>

      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
        セクション
      </h2>

      <div className="space-y-2">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.href}
              href={s.href}
              className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition group"
            >
              <div className={`w-10 h-10 ${s.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <Icon size={20} className={s.iconColor} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">{s.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {s.badge && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.badgeColor}`}>
                    {s.badge}
                  </span>
                )}
                <ArrowRight size={16} className="text-gray-400 group-hover:text-blue-500 transition" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

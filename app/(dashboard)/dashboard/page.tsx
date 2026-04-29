import Link from "next/link";
import { CheckSquare, ArrowRight, Database, BookOpen } from "lucide-react";
import { getTodos } from "@/lib/todos";
import { getCurrentMember } from "@/lib/members";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [todos, currentMember] = await Promise.all([
    getTodos(),
    getCurrentMember(),
  ]);

  const myPendingCount    = todos.filter((t) => !t.completed && t.assignedTo?.id === currentMember?.id).length;
  const totalPendingCount = todos.filter((t) => !t.completed).length;

  const sections = [
    {
      href:        "/todo",
      icon:        CheckSquare,
      iconBg:      "bg-blue-100",
      iconColor:   "text-blue-600",
      label:       "タスク",
      description: "タスク管理",
    },
    {
      href:        "/wiki",
      icon:        BookOpen,
      iconBg:      "bg-green-100",
      iconColor:   "text-green-600",
      label:       "Wiki",
      description: "社内ナレッジベース",
    },
    {
      href:        "/master",
      icon:        Database,
      iconBg:      "bg-orange-100",
      iconColor:   "text-orange-600",
      label:       "マスタ管理",
      description: "各種マスタデータの管理",
    },
  ];

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6 hidden md:block">
        <h1 className="text-xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="text-sm text-gray-500 mt-0.5">FIT STAGE ポータル</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 mb-1">自分の未対応</p>
          <p className="text-3xl font-bold text-gray-900">{myPendingCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 mb-1">全体の未対応</p>
          <p className="text-3xl font-bold text-amber-500">{totalPendingCount}</p>
        </div>
      </div>

      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
        メニュー
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
              <ArrowRight size={16} className="text-gray-400 group-hover:text-blue-500 transition flex-shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

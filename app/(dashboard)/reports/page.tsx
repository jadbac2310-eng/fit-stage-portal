import Link from "next/link";
import { ArrowRight, ClipboardList, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default function ReportsPage() {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-5 hidden md:block">
        <h1 className="text-xl font-bold text-gray-900">レポート</h1>
        <p className="text-sm text-gray-500 mt-0.5">トレーニングレポートの記入・送付</p>
      </div>

      <div className="space-y-2">
        <Link
          href="/reports/record"
          className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition group"
        >
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <ClipboardList size={20} className="text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm">レポート記入</p>
            <p className="text-xs text-gray-500 mt-0.5">顧客ごとに過去を見ながら記入（自動保存）</p>
          </div>
          <ArrowRight size={16} className="text-gray-400 group-hover:text-blue-500 transition flex-shrink-0" />
        </Link>

        <Link
          href="/reports/monthly"
          className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition group"
        >
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Sparkles size={20} className="text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm">月次レポート送付</p>
            <p className="text-xs text-gray-500 mt-0.5">月末にお客さまへPDFで送付・送付管理</p>
          </div>
          <ArrowRight size={16} className="text-gray-400 group-hover:text-blue-500 transition flex-shrink-0" />
        </Link>
      </div>
    </div>
  );
}

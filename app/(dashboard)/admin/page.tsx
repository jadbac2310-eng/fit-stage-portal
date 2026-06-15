import Link from "next/link";
import { ArrowRight, PiggyBank, Receipt, LineChart } from "lucide-react";
import { getCurrentIsAdmin } from "@/lib/members";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const isAdmin = await getCurrentIsAdmin();

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-4xl">🔒</p>
        <p className="text-sm font-semibold text-gray-600">管理者のみ閲覧できます</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-5 hidden md:block">
        <h1 className="text-xl font-bold text-gray-900">管理者機能</h1>
        <p className="text-sm text-gray-500 mt-0.5">管理者向けの機能一覧</p>
      </div>

      <div className="space-y-2">
        <Link
          href="/admin/dashboard"
          className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition group"
        >
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <LineChart size={20} className="text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm">経営ダッシュボード</p>
            <p className="text-xs text-gray-500 mt-0.5">全体の売上・支払・利益を月別に確認</p>
          </div>
          <ArrowRight size={16} className="text-gray-400 group-hover:text-blue-500 transition flex-shrink-0" />
        </Link>

        <Link
          href="/commissions"
          className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition group"
        >
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <PiggyBank size={20} className="text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm">歩合管理</p>
            <p className="text-xs text-gray-500 mt-0.5">月別トレーナー・営業歩合の確認</p>
          </div>
          <ArrowRight size={16} className="text-gray-400 group-hover:text-blue-500 transition flex-shrink-0" />
        </Link>

        <Link
          href="/invoices"
          className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition group"
        >
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Receipt size={20} className="text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm">請求書</p>
            <p className="text-xs text-gray-500 mt-0.5">顧客ごとの月次請求書を発行</p>
          </div>
          <ArrowRight size={16} className="text-gray-400 group-hover:text-blue-500 transition flex-shrink-0" />
        </Link>
      </div>
    </div>
  );
}

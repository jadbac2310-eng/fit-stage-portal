import Link from "next/link";
import { Users, Image, Tag, ArrowRight } from "lucide-react";
import { getMembers } from "@/lib/members";
import { getMaterialsCount } from "@/lib/materials";
import { getKeywordsCount } from "@/lib/keywords";

export const dynamic = "force-dynamic";

export default async function MasterPage() {
  const [members, materialsCount, keywordsCount] = await Promise.all([
    getMembers(),
    getMaterialsCount(),
    getKeywordsCount(),
  ]);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-5 hidden md:block">
        <h1 className="text-xl font-bold text-gray-900">マスタ管理</h1>
        <p className="text-sm text-gray-500 mt-0.5">各種マスタデータの管理</p>
      </div>

      <div className="space-y-2">
        <Link
          href="/master/members"
          className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition group"
        >
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Users size={20} className="text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm">担当者マスタ</p>
            <p className="text-xs text-gray-500 mt-0.5">スタッフ・担当者の管理</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-gray-400">{members.length}名</span>
            <ArrowRight size={16} className="text-gray-400 group-hover:text-blue-500 transition" />
          </div>
        </Link>

        <Link
          href="/master/materials"
          className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition group"
        >
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Image size={20} className="text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm">素材マスタ</p>
            <p className="text-xs text-gray-500 mt-0.5">ロゴ・画像素材の管理</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-gray-400">{materialsCount}件</span>
            <ArrowRight size={16} className="text-gray-400 group-hover:text-purple-500 transition" />
          </div>
        </Link>
        <Link
          href="/master/keywords"
          className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition group"
        >
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Tag size={20} className="text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm">キーワードマスタ</p>
            <p className="text-xs text-gray-500 mt-0.5">SEOキーワードの一覧・管理</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-gray-400">{keywordsCount.toLocaleString()}件</span>
            <ArrowRight size={16} className="text-gray-400 group-hover:text-green-500 transition" />
          </div>
        </Link>
      </div>
    </div>
  );
}

"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";
import { Search, ChevronLeft, ChevronRight, Tag, ExternalLink } from "lucide-react";
import type { Keyword } from "@/lib/keywords";

function difficultyColor(v: number | null) {
  if (v === null) return "text-gray-400";
  if (v <= 30) return "text-green-600 font-semibold";
  if (v <= 60) return "text-yellow-600 font-semibold";
  return "text-red-600 font-semibold";
}

function competitionLabel(v: number | null) {
  if (v === null) return "-";
  if (v <= 33)  return <span className="text-green-600">低</span>;
  if (v <= 66)  return <span className="text-yellow-600">中</span>;
  return <span className="text-red-600">高</span>;
}

export function KeywordsClient({
  keywords, total, page, pageSize,
  search, category, used, categories,
}: {
  keywords:   Keyword[];
  total:      number;
  page:       number;
  pageSize:   number;
  search:     string;
  category:   string;
  used:       boolean | undefined;
  categories: string[];
}) {
  const router   = useRouter();
  const pathname = usePathname();

  const push = useCallback((patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { search, category, used: used === undefined ? undefined : String(used), ...patch };
    if (merged.search)   p.set("search",   merged.search);
    if (merged.category) p.set("category", merged.category);
    if (merged.used !== undefined) p.set("used", merged.used);
    if (patch.page)      p.set("page", patch.page);
    router.push(`${pathname}?${p.toString()}`);
  }, [router, pathname, search, category, used]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="mb-5 hidden md:block">
        <h1 className="text-xl font-bold text-gray-900">キーワードマスタ</h1>
        <p className="text-sm text-gray-500 mt-0.5">全 {total.toLocaleString()} 件</p>
      </div>

      {/* フィルター */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="search"
            defaultValue={search}
            placeholder="キーワードを検索"
            className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            onKeyDown={(e) => {
              if (e.key === "Enter") push({ search: (e.target as HTMLInputElement).value, page: "1" });
            }}
            onBlur={(e) => push({ search: e.target.value, page: "1" })}
          />
        </div>

        {categories.length > 0 && (
          <select
            value={category}
            onChange={(e) => push({ category: e.target.value, page: "1" })}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">カテゴリ: すべて</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}

        <select
          value={used === undefined ? "" : String(used)}
          onChange={(e) => push({ used: e.target.value || undefined, page: "1" })}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">使用状況: すべて</option>
          <option value="false">未使用</option>
          <option value="true">使用済み</option>
        </select>
      </div>

      {/* テーブル */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-[36%] whitespace-nowrap">キーワード</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">ブログ</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">カテゴリ</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">検索Vol.</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">難易度</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">CPC</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">競合</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {keywords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-sm text-gray-400">
                    該当するキーワードがありません
                  </td>
                </tr>
              ) : keywords.map((kw) => (
                <tr key={kw.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{kw.keyword}</td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    {kw.article_slug ? (
                      <a
                        href={`https://www.fitstage.jp/blog/${kw.article_slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-xs text-green-600 hover:text-green-700 font-medium"
                      >
                        済<ExternalLink size={10} />
                      </a>
                    ) : (
                      <span className="text-xs text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {kw.category ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                        <Tag size={10} />{kw.category}
                      </span>
                    ) : <span className="text-gray-300">-</span>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700 whitespace-nowrap">
                    {kw.search_volume !== null ? kw.search_volume.toLocaleString() : <span className="text-gray-300">-</span>}
                  </td>
                  <td className={`px-4 py-3 text-right tabular-nums whitespace-nowrap ${difficultyColor(kw.seo_difficulty)}`}>
                    {kw.seo_difficulty !== null ? kw.seo_difficulty : <span className="text-gray-300">-</span>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700 whitespace-nowrap">
                    {kw.cpc !== null ? `¥${kw.cpc.toFixed(2)}` : <span className="text-gray-300">-</span>}
                  </td>
                  <td className="px-4 py-3 text-center text-xs whitespace-nowrap">
                    {competitionLabel(kw.competition)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ページネーション */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              {((page - 1) * pageSize + 1).toLocaleString()}–{Math.min(page * pageSize, total).toLocaleString()} 件 / {total.toLocaleString()} 件
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => push({ page: String(page - 1) })}
                disabled={page <= 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs text-gray-500 px-2">{page} / {totalPages}</span>
              <button
                onClick={() => push({ page: String(page + 1) })}
                disabled={page >= totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

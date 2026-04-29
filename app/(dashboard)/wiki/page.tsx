import Link from "next/link";
import { FolderOpen, ChevronRight } from "lucide-react";
import { getWikiPages, getWikiFolders } from "@/lib/wiki";
import { NewFolderButton } from "./new-folder-button";
import { wikiFolder } from "@/lib/paths";

export const dynamic = "force-dynamic";

export default async function WikiPage() {
  const [pages, folders] = await Promise.all([getWikiPages(), getWikiFolders()]);

  const pagesByFolder = pages.reduce<Record<string, typeof pages>>((acc, p) => {
    if (!acc[p.folder]) acc[p.folder] = [];
    acc[p.folder].push(p);
    return acc;
  }, {});

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-5 hidden md:flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Wiki</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {folders.length}フォルダ · {pages.length}件のページ
          </p>
        </div>
        <NewFolderButton />
      </div>

      {folders.length === 0 ? (
        <div className="text-center py-16">
          <FolderOpen size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-600">フォルダがありません</p>
          <p className="text-xs text-gray-400 mt-1">フォルダを作成してページを追加してください</p>
          <div className="mt-5 flex justify-center">
            <NewFolderButton />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {folders.map((folder) => {
            const items = pagesByFolder[folder] ?? [];
            return (
              <Link
                key={folder}
                href={wikiFolder(folder)}
                className="flex items-center gap-4 bg-white rounded-2xl border border-gray-200 px-4 py-3.5 hover:border-blue-300 hover:shadow-sm transition group"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <FolderOpen size={18} className="text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{folder}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {items.length > 0 ? `${items.length}件のページ` : "ページなし"}
                  </p>
                </div>
                <ChevronRight size={14} className="text-gray-400 group-hover:text-blue-500 transition flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      )}

      <div className="md:hidden fixed bottom-6 right-4">
        <NewFolderButton mobile />
      </div>
    </div>
  );
}

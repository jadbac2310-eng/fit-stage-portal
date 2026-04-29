import Link from "next/link";
import { BookOpen, Bot, ChevronLeft, ChevronRight, Clock, Plus } from "lucide-react";
import { getWikiPagesByFolder } from "@/lib/wiki";
import { getCurrentIsAdmin } from "@/lib/members";
import { DeleteFolderButton } from "./delete-folder-button";
import { Avatar } from "@/components/ui/avatar";
import { wikiAgent, wikiPage } from "@/lib/paths";

export const dynamic = "force-dynamic";

export default async function WikiFolderPage({
  params,
}: {
  params: Promise<{ folder: string }>;
}) {
  const { folder } = await params;
  const decodedFolder = decodeURIComponent(folder);
  const [pages, isAdmin] = await Promise.all([
    getWikiPagesByFolder(decodedFolder),
    getCurrentIsAdmin(),
  ]);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-5">
        <Link
          href="/wiki"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition mb-4"
        >
          <ChevronLeft size={15} /> Wiki
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{decodedFolder}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{pages.length}件のページ</p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            {isAdmin && <DeleteFolderButton folder={decodedFolder} pageCount={pages.length} />}
            <Link
              href={wikiAgent({ folder: decodedFolder })}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition"
            >
              <Bot size={15} /> エージェントで記事追加
            </Link>
          </div>
        </div>
      </div>

      {pages.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-600">ページがありません</p>
          <p className="text-xs text-gray-400 mt-1">エージェントにページ作成を依頼してください</p>
          <Link
            href={wikiAgent({ folder: decodedFolder })}
            className="mt-5 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition"
          >
            <Bot size={15} /> エージェントで記事追加
          </Link>
        </div>
      ) : (
        <div className="space-y-1.5">
          {pages.map((page) => (
            <Link
              key={page.slug}
              href={wikiPage(decodedFolder, page.slug)}
              className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 px-4 py-3 hover:border-blue-300 hover:shadow-sm transition group"
            >
              <BookOpen size={16} className="text-gray-400 flex-shrink-0" />
              <span className="flex-1 text-sm font-medium text-gray-900 truncate">
                {page.title}
              </span>
              <div className="flex items-center gap-2 flex-shrink-0">
                {page.authorName && (
                  <Avatar name={page.authorName} src={page.authorAvatarUrl ?? undefined} size="sm" title={page.authorName} />
                )}
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock size={11} />
                  {new Date(page.updatedAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}
                </span>
              </div>
              <ChevronRight size={14} className="text-gray-400 group-hover:text-blue-500 transition flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}

      <Link
        href={wikiAgent({ folder: decodedFolder })}
        className="md:hidden fixed bottom-6 right-4 w-14 h-14 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-full shadow-lg shadow-blue-200 flex items-center justify-center transition z-30"
        aria-label="エージェントで記事追加"
      >
        <Plus size={26} />
      </Link>
    </div>
  );
}

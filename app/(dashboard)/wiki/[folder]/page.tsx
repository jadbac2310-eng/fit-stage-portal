import Link from "next/link";
import { BookOpen, Bot, ChevronLeft, Clock, Plus } from "lucide-react";
import { getWikiPagesByFolder } from "@/lib/wiki";
import { getCurrentIsAdmin } from "@/lib/members";
import { DeleteFolderButton } from "./delete-folder-button";
import { MemberBadge } from "@/components/ui/member-badge";
import { wikiAgent, wikiPage } from "@/lib/paths";

function toExcerpt(markdown: string, maxLen = 120): string {
  return markdown
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]+)\]\(.*?\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/^[-*>]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/\n+/g, " ")
    .trim()
    .slice(0, maxLen);
}

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
        <div className="space-y-2">
          {pages.map((page) => {
            const excerpt = toExcerpt(page.content);
            return (
              <Link
                key={page.slug}
                href={wikiPage(decodedFolder, page.slug)}
                className="block bg-white rounded-2xl border border-gray-200 px-4 py-4 hover:border-blue-300 hover:shadow-sm transition group"
              >
                <p className="text-sm font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition">
                  {page.title}
                </p>
                {excerpt && (
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-2">
                    {excerpt}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  {page.authorName && (
                    <MemberBadge name={page.authorName} avatarUrl={page.authorAvatarUrl ?? undefined} />
                  )}
                  <span className="flex items-center gap-1 text-xs text-gray-400 ml-auto">
                    <Clock size={11} />
                    {new Date(page.updatedAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}
                  </span>
                </div>
              </Link>
            );
          })}
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

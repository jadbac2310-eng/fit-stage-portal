import Link from "next/link";
import { BookOpen, Bot, ChevronLeft, Clock, Plus } from "lucide-react";
import { getWikiPagesByFolder } from "@/lib/wiki";
import { getCurrentIsAdmin } from "@/lib/members";
import { DeleteFolderButton } from "./delete-folder-button";
import { MemberBadge } from "@/components/ui/member-badge";
import { wikiAgent, wikiPage } from "@/lib/paths";
import { cn } from "@/lib/cn";
import { CHAPTERS, chapterOf } from "../handbook";
import { serif } from "../fonts";

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

const SERIF = { fontFamily: "var(--font-handbook-serif), 'Noto Serif JP', serif" };

export const dynamic = "force-dynamic";

/** 章の扉。章の番号・英語の小見出し・ひとことを添えて、ページを番号付きで並べる。 */
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
  const ch = chapterOf(decodedFolder);
  const Icon = ch.icon;
  const idx = CHAPTERS.findIndex((c) => c.folder === decodedFolder);
  const no = idx >= 0 ? String(idx + 1).padStart(2, "0") : null;

  return (
    <div className={cn(serif.variable, "p-4 md:p-6 max-w-2xl mx-auto")}>
      <div className="mb-6">
        <Link
          href="/wiki"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition mb-5"
        >
          <ChevronLeft size={15} /> ビジョン・ルール
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-full border border-[#C9A84C]/60 flex items-center justify-center flex-shrink-0 text-[#a8883a] bg-white">
              <Icon size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] tracking-[0.25em] text-[#a8883a] font-semibold">
                {no ? `${no} — ` : ""}{ch.label}
              </p>
              <h1 className="text-2xl font-semibold text-gray-900 leading-tight mt-0.5" style={SERIF}>
                {decodedFolder}
              </h1>
              {ch.lead && <p className="text-xs text-gray-500 mt-1">{ch.lead}</p>}
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 flex-shrink-0">
            {isAdmin && <DeleteFolderButton folder={decodedFolder} pageCount={pages.length} />}
            {isAdmin && (
              <Link
                href={wikiAgent({ folder: decodedFolder })}
                className="flex items-center gap-2 bg-[#0f0f0f] hover:bg-black text-[#C9A84C] font-semibold px-4 py-2.5 rounded-xl text-sm transition"
              >
                <Bot size={15} /> エージェントで記事追加
              </Link>
            )}
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#C9A84C]/50" />
          <p className="text-[11px] tracking-widest text-gray-400">{pages.length} PAGES</p>
        </div>
      </div>

      {pages.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-600">まだページがありません</p>
          {isAdmin && (
            <>
              <p className="text-xs text-gray-400 mt-1">エージェントにページ作成を依頼してください</p>
              <Link
                href={wikiAgent({ folder: decodedFolder })}
                className="mt-5 inline-flex items-center gap-2 bg-[#0f0f0f] hover:bg-black text-[#C9A84C] text-sm font-semibold px-5 py-2.5 rounded-xl transition"
              >
                <Bot size={15} /> エージェントで記事追加
              </Link>
            </>
          )}
        </div>
      ) : (
        <ol className="space-y-2">
          {pages.map((page, i) => {
            const excerpt = toExcerpt(page.content);
            return (
              <li key={page.slug}>
                <Link
                  href={wikiPage(decodedFolder, page.slug)}
                  className="flex gap-4 bg-white rounded-2xl border border-gray-200 px-4 py-4 hover:border-[#C9A84C] hover:shadow-sm transition group"
                >
                  <span
                    className="text-lg leading-none text-[#C9A84C] pt-0.5 w-7 flex-shrink-0 tabular-nums"
                    style={SERIF}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-gray-900 mb-1 leading-snug" style={SERIF}>
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
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      )}

      {isAdmin && (
        <Link
          href={wikiAgent({ folder: decodedFolder })}
          className="md:hidden fixed bottom-6 right-4 w-14 h-14 bg-[#0f0f0f] hover:bg-black active:scale-95 text-[#C9A84C] rounded-full shadow-lg shadow-gray-400/40 flex items-center justify-center transition z-30"
          aria-label="エージェントで記事追加"
        >
          <Plus size={26} />
        </Link>
      )}
    </div>
  );
}

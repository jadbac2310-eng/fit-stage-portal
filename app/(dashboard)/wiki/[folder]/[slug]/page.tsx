import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Bot, ChevronLeft, Clock } from "lucide-react";
import { getWikiPage, getWikiPagesByFolder } from "@/lib/wiki";
import { getCurrentIsAdmin } from "@/lib/members";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { DeleteButton } from "./delete-button";
import { ShareButtons } from "./share-buttons";
import { MemberBadge } from "@/components/ui/member-badge";
import { wikiAgent, wikiFolder, wikiPage } from "@/lib/paths";
import { cn } from "@/lib/cn";
import { CHAPTERS, chapterOf } from "../../handbook";
import { serif } from "../../fonts";

const SERIF = { fontFamily: "var(--font-handbook-serif), 'Noto Serif JP', serif" };

export const dynamic = "force-dynamic";

/**
 * 読むページ。本のように、章の小見出し → 題名 → 金の罫 → 本文。
 * 下に「前のページ／次のページ」を置いて、章を順に読み進められるようにする。
 */
export default async function WikiDetailPage({
  params,
}: {
  params: Promise<{ folder: string; slug: string }>;
}) {
  const { folder, slug } = await params;
  const decodedFolder = decodeURIComponent(folder);
  const [page, siblings, isAdmin] = await Promise.all([
    getWikiPage(slug),
    getWikiPagesByFolder(decodedFolder),
    getCurrentIsAdmin(),
  ]);
  if (!page) notFound();

  const ch = chapterOf(decodedFolder);
  const idx = CHAPTERS.findIndex((c) => c.folder === decodedFolder);
  const no = idx >= 0 ? String(idx + 1).padStart(2, "0") : null;
  const pos = siblings.findIndex((p) => p.slug === page.slug);
  const prev = pos > 0 ? siblings[pos - 1] : null;
  const next = pos >= 0 && pos < siblings.length - 1 ? siblings[pos + 1] : null;

  return (
    <div className={cn(serif.variable, "p-4 md:p-6 max-w-2xl mx-auto")}>
      <div className="mb-6">
        <Link
          href={wikiFolder(decodedFolder)}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition mb-5"
        >
          <ChevronLeft size={15} /> {decodedFolder}
        </Link>

        <p className="text-[10px] tracking-[0.25em] text-[#a8883a] font-semibold">
          {no ? `${no} — ` : ""}{ch.label}
          {pos >= 0 && <span className="text-gray-400 font-normal tracking-normal ml-2">{pos + 1} / {siblings.length}</span>}
        </p>
        <h1 className="text-2xl md:text-[1.75rem] font-semibold text-gray-900 leading-snug mt-1" style={SERIF}>
          {page.title}
        </h1>
        <div className="mt-4 h-px w-16 bg-[#C9A84C]" />

        <div className="flex items-center gap-3 mt-4 flex-wrap">
          {page.authorName && (
            <MemberBadge name={page.authorName} avatarUrl={page.authorAvatarUrl ?? undefined} />
          )}
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Clock size={11} />
            {new Date(page.updatedAt).toLocaleDateString("ja-JP", {
              year: "numeric", month: "long", day: "numeric",
            })}
            更新
          </span>
        </div>

        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {isAdmin && (
            <Link
              href={wikiAgent({ edit: page.slug, folder: decodedFolder })}
              className="flex items-center gap-1.5 text-xs text-gray-700 hover:text-gray-900 font-medium bg-white hover:bg-gray-50 border border-gray-300 hover:border-[#C9A84C] px-3 py-1.5 rounded-lg transition"
            >
              <Bot size={13} /> エージェントで編集
            </Link>
          )}
          {isAdmin && <DeleteButton slug={page.slug} folder={decodedFolder} title={page.title} />}
          <ShareButtons title={page.title} content={page.content} />
        </div>
      </div>

      <article className="wiki-article bg-white rounded-2xl border border-gray-200 px-5 py-6 md:px-8 md:py-8">
        <MarkdownRenderer content={page.content} />
      </article>

      {(prev || next) && (
        <nav className="mt-6 grid grid-cols-2 gap-3" aria-label="前後のページ">
          {prev ? (
            <Link
              href={wikiPage(decodedFolder, prev.slug)}
              className="group bg-white rounded-2xl border border-gray-200 hover:border-[#C9A84C] px-4 py-3 transition"
            >
              <p className="flex items-center gap-1 text-[10px] tracking-widest text-gray-400">
                <ArrowLeft size={11} /> 前のページ
              </p>
              <p className="text-sm text-gray-800 mt-1 line-clamp-2 leading-snug" style={SERIF}>{prev.title}</p>
            </Link>
          ) : <span />}
          {next ? (
            <Link
              href={wikiPage(decodedFolder, next.slug)}
              className="group bg-white rounded-2xl border border-gray-200 hover:border-[#C9A84C] px-4 py-3 text-right transition"
            >
              <p className="flex items-center justify-end gap-1 text-[10px] tracking-widest text-gray-400">
                次のページ <ArrowRight size={11} />
              </p>
              <p className="text-sm text-gray-800 mt-1 line-clamp-2 leading-snug" style={SERIF}>{next.title}</p>
            </Link>
          ) : <span />}
        </nav>
      )}
    </div>
  );
}

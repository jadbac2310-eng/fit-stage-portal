import { notFound } from "next/navigation";
import Link from "next/link";
import { Bot, ChevronLeft, Clock, Tag } from "lucide-react";
import { getWikiPage } from "@/lib/wiki";
import { getCurrentIsAdmin } from "@/lib/members";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { DeleteButton } from "./delete-button";
import { MemberBadge } from "@/components/ui/member-badge";
import { wikiAgent, wikiFolder } from "@/lib/paths";

export const dynamic = "force-dynamic";

export default async function WikiDetailPage({
  params,
}: {
  params: Promise<{ folder: string; slug: string }>;
}) {
  const { folder, slug } = await params;
  const decodedFolder = decodeURIComponent(folder);
  const [page, isAdmin] = await Promise.all([getWikiPage(slug), getCurrentIsAdmin()]);
  if (!page) notFound();

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href={wikiFolder(decodedFolder)}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition mb-4"
        >
          <ChevronLeft size={15} /> {decodedFolder}
        </Link>

        <h1 className="text-xl font-bold text-gray-900 leading-snug">{page.title}</h1>

        <div className="flex items-center gap-2 mt-3">
          <Link
            href={wikiAgent({ edit: page.slug, folder: decodedFolder })}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium bg-blue-50 hover:bg-blue-100 border border-blue-300 hover:border-blue-400 px-3 py-1.5 rounded-lg transition"
          >
            <Bot size={13} /> エージェントで編集
          </Link>
          {isAdmin && <DeleteButton slug={page.slug} folder={decodedFolder} title={page.title} />}
        </div>

        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {page.category && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Tag size={11} /> {page.category}
            </span>
          )}
          {page.authorName && (
            <MemberBadge name={page.authorName} avatarUrl={page.authorAvatarUrl ?? undefined} />
          )}
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Clock size={11} />
            {new Date(page.updatedAt).toLocaleDateString("ja-JP", {
              year: "numeric", month: "long", day: "numeric",
            })}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <MarkdownRenderer content={page.content} />
      </div>
    </div>
  );
}

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getWikiPages, getWikiFolders } from "@/lib/wiki";
import { getCurrentIsAdmin } from "@/lib/members";
import { NewFolderButton } from "./new-folder-button";
import { wikiFolder, wikiPage } from "@/lib/paths";
import { cn } from "@/lib/cn";
import { CHAPTERS, COVER, chapterOf, orderFolders } from "./handbook";
import { serif } from "./fonts";

export const dynamic = "force-dynamic";

/**
 * ハンドブックの表紙と目次。
 *
 * 開いた瞬間は黒地に金の一文だけ（HPのロゴと同じ黒×金）。
 * スクロールすると白の目次。章の中のページ題名まで見えるので、
 * 「どこに何が書いてあるか」がこの1画面で分かる。
 */
export default async function WikiPage() {
  const [pages, folders, isAdmin] = await Promise.all([getWikiPages(), getWikiFolders(), getCurrentIsAdmin()]);

  const pagesByFolder = new Map<string, typeof pages>();
  for (const p of pages) {
    const arr = pagesByFolder.get(p.folder);
    if (arr) arr.push(p);
    else pagesByFolder.set(p.folder, [p]);
  }
  // ページがあるのにフォルダ表に無いもの（古いデータ）も落とさない
  const allFolders = orderFolders([...new Set([...folders, ...pagesByFolder.keys()])]);
  const chapterNo = new Map(CHAPTERS.map((c, i) => [c.folder, i + 1]));

  return (
    <div className={cn(serif.variable, "pb-10")}>
      {/* ── 表紙 ── */}
      <section className="bg-[#0f0f0f] text-white px-6 py-14 md:py-20">
        <div className="max-w-2xl mx-auto">
          <p className="text-[11px] tracking-[0.3em] text-[#C9A84C]/80 font-semibold">{COVER.kicker}</p>
          <h1
            className="mt-6 text-[1.7rem] md:text-4xl leading-[1.35] font-semibold text-[#C9A84C]"
            style={{ fontFamily: "var(--font-handbook-serif), 'Noto Serif JP', serif" }}
          >
            {COVER.headline}
          </h1>
          <p
            className="mt-5 text-base md:text-lg text-white/85 leading-relaxed"
            style={{ fontFamily: "var(--font-handbook-serif), 'Noto Serif JP', serif" }}
          >
            {COVER.mission}
          </p>
          <div className="mt-8 h-px w-16 bg-[#C9A84C]/70" />
          <p
            className="mt-4 text-sm text-white/60 tracking-wider"
            style={{ fontFamily: "var(--font-handbook-serif), 'Noto Serif JP', serif" }}
          >
            {COVER.tagline}
          </p>
        </div>
      </section>

      {/* ── 目次 ── */}
      <section className="px-4 md:px-6 py-8 md:py-12">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-[11px] tracking-[0.25em] text-[#a8883a] font-semibold">CONTENTS</p>
              <p className="text-xs text-gray-400 mt-1">{pages.length}ページ</p>
            </div>
            {isAdmin && <div className="hidden md:block"><NewFolderButton /></div>}
          </div>

          {allFolders.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">まだ章がありません</p>
          ) : (
            <div className="space-y-4">
              {allFolders.map((folder) => {
                const ch = chapterOf(folder);
                const Icon = ch.icon;
                const items = pagesByFolder.get(folder) ?? [];
                const no = chapterNo.get(folder);
                return (
                  <section key={folder} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <Link
                      href={wikiFolder(folder)}
                      className="flex items-center gap-4 px-5 pt-5 pb-4 hover:bg-gray-50 transition group"
                    >
                      <div className="w-10 h-10 rounded-full border border-[#C9A84C]/50 flex items-center justify-center flex-shrink-0 text-[#a8883a]">
                        <Icon size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] tracking-[0.25em] text-[#a8883a] font-semibold">
                          {no ? `${String(no).padStart(2, "0")} — ` : ""}{ch.label}
                        </p>
                        <h2
                          className="text-lg font-semibold text-gray-900 leading-tight mt-0.5"
                          style={{ fontFamily: "var(--font-handbook-serif), 'Noto Serif JP', serif" }}
                        >
                          {folder}
                        </h2>
                        {ch.lead && <p className="text-xs text-gray-500 mt-1">{ch.lead}</p>}
                      </div>
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-[#a8883a] transition flex-shrink-0" />
                    </Link>
                    {items.length > 0 && (
                      <ol className="border-t border-gray-100 divide-y divide-gray-100">
                        {items.map((p) => (
                          <li key={p.slug}>
                            <Link
                              href={wikiPage(folder, p.slug)}
                              className="flex items-center gap-3 px-5 py-3 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition"
                            >
                              <span className="w-1 h-1 rounded-full bg-[#C9A84C] flex-shrink-0" />
                              <span className="flex-1 min-w-0 truncate">{p.title}</span>
                            </Link>
                          </li>
                        ))}
                      </ol>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {isAdmin && (
        <div className="md:hidden fixed bottom-6 right-4">
          <NewFolderButton mobile />
        </div>
      )}
    </div>
  );
}

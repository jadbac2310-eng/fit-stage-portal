"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, LogOut } from "lucide-react";
import { getAncestors } from "./nav-config";
import { Avatar } from "@/components/ui/avatar";

/**
 * 上の帯（スマホ）と、その下の「いまどこ」の帯（スマホ・パソコン共通）。
 *
 * 2026-11-10 のデザイン変更で、会社のポータルらしい作りにした：
 * 濃紺の帯＋金の線、その下に「ホーム ＞ ページ名」と今日の日付。
 * パソコンでは左の濃紺のメニューにロゴがあるので、上の帯は出さず「いまどこ」の帯だけ出す。
 */
export function Header({
  userName,
  avatarUrl,
  todayLabel,
  onMenuOpen,
}: {
  userName?: string;
  avatarUrl?: string;
  /** 「2026年11月10日（月）」。サーバーで作って渡す（端末とサーバーで日付がずれないように） */
  todayLabel?: string;
  onMenuOpen?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const ancestors = getAncestors(pathname);
  const currentNode = ancestors[ancestors.length - 1];
  const title = currentNode?.label ?? "FIT STAGE ポータル";

  async function handleLogout() {
    if (!confirm("ログアウトしますか？")) return;
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* スマホ：濃紺の帯（スクロールしても上に残る） */}
      <header className="md:hidden sticky top-0 z-30 print:hidden bg-navy-900 text-white border-b-[3px] border-gold-500 px-3 py-2.5 flex items-center gap-2">
        <button
          onClick={onMenuOpen}
          className="p-1.5 -ml-1 text-white/90 hover:text-white transition flex-shrink-0"
          aria-label="メニューを開く"
        >
          <Menu size={22} />
        </button>

        {/* 会社のロゴ（白い字＋金の線） */}
        <Link href="/dashboard" className="flex-1 min-w-0" aria-label="FIT STAGE ポータル">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-wordmark-white.png" alt="FIT STAGE" width={900} height={312} className="h-8 w-auto" />
        </Link>

        <div className="flex items-center gap-1">
          {userName && <Avatar name={userName} src={avatarUrl} size="sm" />}
          <button
            onClick={handleLogout}
            className="p-2 text-white/70 hover:text-white transition-colors"
            aria-label="ログアウト"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* いまどこ（ホーム ＞ ページ名）と今日の日付。こちらはスクロールで流れる（画面を狭くしないため） */}
      <div className="print:hidden bg-white border-b border-[var(--portal-line)] px-3 md:px-5 py-1.5 flex items-center justify-between gap-3 text-[11px] text-gray-500">
        <p className="min-w-0 truncate">
          <Link href="/dashboard" className="hover:underline">ホーム</Link>
          {ancestors.filter((n) => n.href !== "/dashboard").map((n) => (
            <span key={n.href}>
              <span className="mx-1">＞</span>
              <Link href={n.href} className="hover:underline">{n.label}</Link>
            </span>
          ))}
          {ancestors.length === 0 && <><span className="mx-1">＞</span>{title}</>}
          {ancestors.length === 1 && ancestors[0].href === "/dashboard" && <><span className="mx-1">＞</span>ダッシュボード</>}
        </p>
        {todayLabel && <p className="flex-shrink-0 tabular-nums">{todayLabel}</p>}
      </div>
    </>
  );
}

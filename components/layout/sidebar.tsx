"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ExternalLink, LogOut, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { NAV_TREE, getActiveHref } from "./nav-config";
import { Avatar } from "@/components/ui/avatar";

export function Sidebar({
  userName,
  avatarUrl,
  isAdmin = false,
  mobile = false,
  onClose,
}: {
  userName?: string;
  avatarUrl?: string;
  isAdmin?:  boolean;
  mobile?:   boolean;
  onClose?:  () => void;
}) {
  const pathname = usePathname();
  const activeHref = getActiveHref(pathname);
  const router   = useRouter();

  async function handleLogout() {
    if (!confirm("ログアウトしますか？")) return;
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className={cn(
      // 濃紺の帯（会社のポータルらしい作り。2026-11-10）
      "flex-col bg-navy-900 text-white h-screen print:hidden",
      mobile ? "flex w-[82vw] max-w-xs" : "hidden md:flex sticky top-0 w-60",
    )}>
      <div className="p-4 border-b-[3px] border-gold-500 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          {/* 会社のロゴ（白い字＋金の線。尚樹が指定した画像を濃紺の上で見えるように白抜きにしたもの） */}
          <Link href="/dashboard" className="flex-1" aria-label="FIT STAGE ポータル">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-wordmark-white.png" alt="FIT STAGE" width={582} height={201} className="h-10 w-auto" />
          </Link>
          {mobile && (
            <button onClick={onClose} aria-label="閉じる" className="text-white/70 hover:text-white transition p-2 -mr-1">
              <X size={22} />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto">
        <ul>
          {NAV_TREE.filter((node) => !node.adminOnly || isAdmin).map((node) => {
            const Icon = node.icon;
            const isActive = node.href === activeHref;
            const className = cn(
              "flex items-center transition-colors font-medium border-b border-white/10",
              mobile ? "gap-3.5 py-3.5 px-4 text-[15px]" : "gap-2.5 py-2.5 px-4 text-sm",
              isActive
                ? "bg-navy-800 text-white font-bold shadow-[inset_4px_0_0_var(--portal-gold)]"
                : "text-white/85 hover:bg-white/10 hover:text-white active:bg-white/10",
            );
            const inner = (
              <>
                {Icon && <Icon size={mobile ? 22 : 17} className="flex-shrink-0" />}
                <span className="truncate">{node.label}</span>
                {node.external && <ExternalLink size={mobile ? 16 : 13} className="flex-shrink-0 ml-auto text-white/50" />}
              </>
            );
            return (
              <li key={node.href}>
                {node.external ? (
                  <a href={node.href} target="_blank" rel="noopener noreferrer" className={className}>
                    {inner}
                  </a>
                ) : (
                  <Link href={node.href} className={className}>
                    {inner}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-3 border-t border-white/15 flex-shrink-0 space-y-1">
        {userName && (
          <div className="flex items-center gap-2.5 px-3 py-2">
            <Avatar name={userName} src={avatarUrl} size="sm" />
            <span className="text-sm font-medium text-white truncate">{userName}</span>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors w-full"
        >
          <LogOut size={18} />
          ログアウト
        </button>
      </div>
    </aside>
  );
}

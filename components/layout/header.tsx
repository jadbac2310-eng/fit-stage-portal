"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, LogOut } from "lucide-react";
import { getAncestors } from "./nav-config";
import { Avatar } from "@/components/ui/avatar";

export function Header({
  userName,
  avatarUrl,
  onMenuOpen,
}: {
  userName?: string;
  avatarUrl?: string;
  onMenuOpen?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const ancestors = getAncestors(pathname);
  const currentNode = ancestors[ancestors.length - 1];
  const title = currentNode?.label ?? "FitStage Admin";

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="md:hidden sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="px-4 py-3 flex items-center gap-2">
        <button
          onClick={onMenuOpen}
          className="p-1.5 -ml-1.5 text-gray-500 hover:text-gray-800 transition flex-shrink-0"
          aria-label="メニューを開く"
        >
          <Menu size={22} />
        </button>

        <h1 className="font-semibold text-gray-900 text-base flex-1 truncate">
          {title}
        </h1>

        <div className="flex items-center gap-1.5">
          {userName && <Avatar name={userName} src={avatarUrl} size="sm" />}
          <button
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="ログアウト"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

    </header>
  );
}

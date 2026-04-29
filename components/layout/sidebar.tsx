"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, LogOut, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { NAV_TREE, type NavNode } from "./nav-config";
import { useState, useEffect } from "react";
import { Avatar } from "@/components/ui/avatar";

function NavItem({
  node,
  depth = 0,
  pathname,
}: {
  node: NavNode;
  depth?: number;
  pathname: string;
}) {
  const isActive = pathname === node.href;
  const isAncestor =
    pathname.startsWith(node.href + "/") && node.href !== "/dashboard";
  const hasChildren = node.children && node.children.length > 0;
  const [open, setOpen] = useState(isActive || isAncestor);

  useEffect(() => {
    if (isActive || isAncestor) setOpen(true);
  }, [pathname, isActive, isAncestor]);

  const Icon = node.icon;

  return (
    <li>
      <div className="flex items-center">
        <Link
          href={node.href}
          className={cn(
            "flex-1 flex items-center gap-2.5 py-2 px-3 rounded-xl transition-colors",
            depth === 0 ? "text-sm font-medium" : "text-[13px] font-normal",
            isActive
              ? "bg-blue-50 text-blue-700 font-medium"
              : isAncestor
              ? "text-gray-800 hover:bg-gray-100"
              : depth === 0
              ? "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
          )}
        >
          {Icon && depth === 0 && (
            <Icon size={17} className="flex-shrink-0" />
          )}
          <span className="truncate">{node.label}</span>
        </Link>
        {hasChildren && (
          <button
            onClick={() => setOpen(!open)}
            className="p-1.5 mr-1 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <ChevronRight
              size={14}
              className={cn("transition-transform", open && "rotate-90")}
            />
          </button>
        )}
      </div>

      {hasChildren && open && (
        <ul className="mt-0.5 ml-[22px] pl-3 border-l-2 border-gray-200 space-y-0.5">
          {node.children!.map((child) => (
            <NavItem
              key={child.href}
              node={child}
              depth={depth + 1}
              pathname={pathname}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

type DynamicNavItem = { label: string; href: string; children?: DynamicNavItem[] };

export function Sidebar({
  userName,
  avatarUrl,
  wikiNavItems = [],
  mobile = false,
  onClose,
}: {
  userName?: string;
  avatarUrl?: string;
  wikiNavItems?: DynamicNavItem[];
  mobile?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const navTree = NAV_TREE.map((node) => {
    if (node.href === "/wiki" && wikiNavItems.length) {
      return { ...node, children: wikiNavItems };
    }
    return node;
  });

  async function handleLogout() {
    if (!confirm("ログアウトしますか？")) return;
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className={cn(
      "flex-col w-60 border-r border-gray-200 bg-white h-screen",
      mobile ? "flex" : "hidden md:flex sticky top-0",
    )}>
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">F</span>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900 text-sm leading-tight">FIT STAGE</p>
            <p className="text-xs text-gray-400">ポータル</p>
          </div>
          {mobile && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-0.5">
          {navTree.map((node) => (
            <NavItem key={node.href} node={node} pathname={pathname} />
          ))}
        </ul>
      </nav>

      <div className="p-3 border-t border-gray-200 flex-shrink-0 space-y-1">
        {userName && (
          <div className="flex items-center gap-2.5 px-3 py-2">
            <Avatar name={userName} src={avatarUrl} size="sm" />
            <span className="text-sm font-medium text-gray-700 truncate">{userName}</span>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors w-full"
        >
          <LogOut size={18} />
          ログアウト
        </button>
      </div>
    </aside>
  );
}

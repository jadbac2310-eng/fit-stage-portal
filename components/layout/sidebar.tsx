"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { NAV_TREE, type NavNode, type NavGroup } from "./nav-config";
import { Avatar } from "@/components/ui/avatar";

// ─── 通常リンク ───────────────────────────────────────────
function NavLink({ node, indent = false }: { node: NavNode; indent?: boolean }) {
  const pathname = usePathname();
  const Icon = node.icon;
  const isActive =
    pathname === node.href ||
    (node.href !== "/dashboard" && pathname.startsWith(node.href + "/"));

  return (
    <Link
      href={node.href}
      className={cn(
        "flex items-center gap-2.5 py-2 px-3 rounded-xl transition-colors text-sm font-medium",
        indent && "ml-3 pl-3 border-l border-gray-200",
        isActive
          ? "bg-blue-50 text-blue-700"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
      )}
    >
      {Icon && <Icon size={16} className="flex-shrink-0" />}
      <span className="truncate">{node.label}</span>
    </Link>
  );
}

// ─── グループ ─────────────────────────────────────────────
function NavGroupSection({ group }: { group: NavGroup }) {
  const pathname = usePathname();
  const isChildActive = group.children.some(
    (c) => pathname === c.href || pathname.startsWith(c.href + "/"),
  );
  const [open, setOpen] = useState(isChildActive);
  const Icon = group.icon;

  return (
    <li>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 py-2 px-3 rounded-xl transition-colors text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
      >
        {Icon && <Icon size={16} className="flex-shrink-0" />}
        <span className="truncate flex-1 text-left">{group.label}</span>
        <ChevronDown
          size={14}
          className={cn("flex-shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <ul className="mt-0.5 space-y-0.5">
          {group.children.map((child) => (
            <li key={child.href}>
              <NavLink node={child} indent />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

// ─── サイドバー本体 ───────────────────────────────────────
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
  const router = useRouter();

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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="FIT STAGE" className="w-8 h-8 rounded-lg object-contain flex-shrink-0" />
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
          {NAV_TREE.map((item) => {
            if (item.kind === "group") {
              if (item.adminOnly && !isAdmin) return null;
              return <NavGroupSection key={item.label} group={item} />;
            }
            return (
              <li key={item.href}>
                <NavLink node={item} />
              </li>
            );
          })}
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

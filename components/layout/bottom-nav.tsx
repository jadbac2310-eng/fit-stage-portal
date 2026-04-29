"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CheckSquare, BookOpen, Database } from "lucide-react";
import { cn } from "@/lib/cn";

const navItems = [
  { label: "ホーム",   icon: LayoutDashboard, href: "/dashboard" },
  { label: "Todo",     icon: CheckSquare,     href: "/todo" },
  { label: "Wiki",     icon: BookOpen,        href: "/wiki" },
  { label: "マスタ",   icon: Database,        href: "/master" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-40 safe-area-bottom">
      <div className="flex items-stretch">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors",
                active ? "text-blue-600" : "text-gray-500"
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

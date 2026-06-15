"use client";

import { useState, useEffect, Suspense } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { TopProgress } from "./top-progress";
import { cn } from "@/lib/cn";

export function DrawerLayout({
  userName,
  avatarUrl,
  isAdmin = false,
  children,
}: {
  userName?: string;
  avatarUrl?: string;
  isAdmin?:  boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-gray-50 print:bg-white print:min-h-0">
      {/* 画面遷移の進捗バー */}
      <Suspense fallback={null}>
        <TopProgress />
      </Suspense>

      {/* デスクトップ: 常時表示サイドバー */}
      <Sidebar userName={userName} avatarUrl={avatarUrl} isAdmin={isAdmin} />

      {/* モバイル: ドロワー背景 */}
      <div
        className={cn(
          "md:hidden fixed inset-0 bg-black/40 z-40 transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setOpen(false)}
      />

      {/* モバイル: ドロワー本体 */}
      <div
        className={cn(
          "md:hidden fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Sidebar
          userName={userName}
          avatarUrl={avatarUrl}
          isAdmin={isAdmin}
          mobile
          onClose={() => setOpen(false)}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          userName={userName}
          avatarUrl={avatarUrl}
          onMenuOpen={() => setOpen(true)}
        />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

import {
  LayoutDashboard,
  Database,
  BookOpen,
  Dumbbell,
  CreditCard,
  CalendarDays,
  ShieldCheck,
  PiggyBank,
  FileSignature,
  type LucideIcon,
} from "lucide-react";

export type NavNode = {
  label:      string;
  href:       string;
  icon?:      LucideIcon;
  adminOnly?: boolean;
};

export const NAV_TREE: NavNode[] = [
  { label: "ダッシュボード", href: "/dashboard",  icon: LayoutDashboard },
  { label: "スケジュール",   href: "/schedule",    icon: CalendarDays },
  { label: "Wiki",           href: "/wiki",        icon: BookOpen },
  { label: "レッスン",       href: "/lessons",     icon: Dumbbell },
  { label: "歩合",           href: "/commissions", icon: PiggyBank },
  { label: "プラン管理",     href: "/plans",       icon: CreditCard },
  { label: "入会申し込み",   href: "/master/applications", icon: FileSignature },
  { label: "マスタ管理",     href: "/master",      icon: Database },
  { label: "管理者機能",     href: "/admin",       icon: ShieldCheck, adminOnly: true },
];

/**
 * 今いるページに当てはまる項目を、浅い順に返す。
 *
 * 「入会申し込み（/master/applications）」のように、別の項目（/master）の
 * 下にあるページも目次に出しているため、1ページに複数当てはまることがある。
 * 並び順ではなくパスの深さで並べ替えて、末尾がいちばん深い項目になるようにする。
 */
export function getAncestors(pathname: string): NavNode[] {
  return NAV_TREE
    .filter(
      (node) =>
        pathname === node.href ||
        (node.href !== "/dashboard" && pathname.startsWith(node.href + "/")),
    )
    .sort((a, b) => a.href.length - b.href.length);
}

/** 目次で選択中にする項目。いちばん深く当てはまるもの1つだけ */
export function getActiveHref(pathname: string): string | undefined {
  const ancestors = getAncestors(pathname);
  return ancestors[ancestors.length - 1]?.href;
}

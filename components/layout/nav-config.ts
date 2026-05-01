import {
  LayoutDashboard,
  CheckSquare,
  Database,
  BookOpen,
  type LucideIcon,
} from "lucide-react";

export type NavNode = {
  label: string;
  href: string;
  icon?: LucideIcon;
};

export const NAV_TREE: NavNode[] = [
  { label: "ダッシュボード", href: "/dashboard", icon: LayoutDashboard },
  { label: "Todo",           href: "/todo",      icon: CheckSquare },
  { label: "Wiki",           href: "/wiki",      icon: BookOpen },
  { label: "マスタ管理",     href: "/master",    icon: Database },
];

export function getAncestors(pathname: string): NavNode[] {
  return NAV_TREE.filter(
    (node) =>
      pathname === node.href ||
      (node.href !== "/dashboard" && pathname.startsWith(node.href + "/")),
  );
}

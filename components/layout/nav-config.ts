import {
  LayoutDashboard,
  CheckSquare,
  Database,
  BookOpen,
  Dumbbell,
  CreditCard,
  PiggyBank,
  type LucideIcon,
} from "lucide-react";

export type NavNode = {
  label:      string;
  href:       string;
  icon?:      LucideIcon;
  adminOnly?: boolean;
};

export const NAV_TREE: NavNode[] = [
  { label: "ダッシュボード", href: "/dashboard",   icon: LayoutDashboard },
  { label: "Todo",           href: "/todo",         icon: CheckSquare },
  { label: "Wiki",           href: "/wiki",         icon: BookOpen },
  { label: "レッスン",       href: "/lessons",      icon: Dumbbell },
  { label: "プラン管理",     href: "/plans",        icon: CreditCard },
  { label: "歩合管理",       href: "/commissions",  icon: PiggyBank, adminOnly: true },
  { label: "マスタ管理",     href: "/master",       icon: Database },
];

export function getAncestors(pathname: string): NavNode[] {
  return NAV_TREE.filter(
    (node) =>
      pathname === node.href ||
      (node.href !== "/dashboard" && pathname.startsWith(node.href + "/")),
  );
}

import {
  LayoutDashboard,
  Database,
  BookOpen,
  Dumbbell,
  CreditCard,
  CalendarDays,
  ShieldCheck,
  PiggyBank,
  Receipt,
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
  { label: "請求書",         href: "/invoices",    icon: Receipt, adminOnly: true },
  { label: "プラン管理",     href: "/plans",       icon: CreditCard },
  { label: "マスタ管理",     href: "/master",      icon: Database },
  { label: "管理者機能",     href: "/admin",       icon: ShieldCheck, adminOnly: true },
];

export function getAncestors(pathname: string): NavNode[] {
  return NAV_TREE.filter(
    (node) =>
      pathname === node.href ||
      (node.href !== "/dashboard" && pathname.startsWith(node.href + "/")),
  );
}

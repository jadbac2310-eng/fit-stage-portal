import {
  LayoutDashboard,
  CheckSquare,
  Database,
  BookOpen,
  Dumbbell,
  CreditCard,
  PiggyBank,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export type NavNode = {
  kind?:      "node";
  label:      string;
  href:       string;
  icon?:      LucideIcon;
};

export type NavGroup = {
  kind:       "group";
  label:      string;
  icon?:      LucideIcon;
  adminOnly?: boolean;
  children:   NavNode[];
};

export type NavItem = NavNode | NavGroup;

export const NAV_TREE: NavItem[] = [
  { label: "ダッシュボード", href: "/dashboard",  icon: LayoutDashboard },
  { label: "Todo",           href: "/todo",        icon: CheckSquare },
  { label: "Wiki",           href: "/wiki",        icon: BookOpen },
  { label: "レッスン",       href: "/lessons",     icon: Dumbbell },
  { label: "プラン管理",     href: "/plans",       icon: CreditCard },
  { label: "マスタ管理",     href: "/master",      icon: Database },
  {
    kind:      "group",
    label:     "管理者機能",
    icon:      ShieldCheck,
    adminOnly: true,
    children: [
      { label: "歩合管理", href: "/commissions", icon: PiggyBank },
    ],
  },
];

export function getAncestors(pathname: string): NavNode[] {
  const nodes: NavNode[] = [];
  for (const item of NAV_TREE) {
    if (item.kind === "group") {
      for (const child of item.children) {
        if (pathname === child.href || pathname.startsWith(child.href + "/")) {
          nodes.push(child);
        }
      }
    } else {
      if (
        pathname === item.href ||
        (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"))
      ) {
        nodes.push(item as NavNode);
      }
    }
  }
  return nodes;
}

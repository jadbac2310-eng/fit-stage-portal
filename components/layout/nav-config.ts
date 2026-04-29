import {
  LayoutDashboard,
  CheckSquare,
  Database,
  Users,
  Image,
  BookOpen,
  type LucideIcon,
} from "lucide-react";

export type NavNode = {
  label: string;
  href: string;
  icon?: LucideIcon;
  children?: NavNode[];
};

export const NAV_TREE: NavNode[] = [
  {
    label: "ダッシュボード",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Todo",
    href: "/todo",
    icon: CheckSquare,
  },
  {
    label: "Wiki",
    href: "/wiki",
    icon: BookOpen,
  },
  {
    label: "マスタ管理",
    href: "/master",
    icon: Database,
    children: [
      {
        label: "担当者マスタ",
        href: "/master/members",
        icon: Users,
      },
      {
        label: "素材マスタ",
        href: "/master/materials",
        icon: Image,
      },
    ],
  },
];

export const TOP_LEVEL_NAV = NAV_TREE;

export function getAncestors(pathname: string): NavNode[] {
  const result: NavNode[] = [];
  function walk(nodes: NavNode[], ancestors: NavNode[]): boolean {
    for (const node of nodes) {
      const path = [...ancestors, node];
      if (pathname === node.href || pathname.startsWith(node.href + "/")) {
        result.push(...path);
        if (node.children) {
          walk(node.children, path);
        }
        return true;
      }
    }
    return false;
  }
  walk(NAV_TREE, []);
  return result;
}

export function getParentNode(pathname: string): NavNode | null {
  const ancestors = getAncestors(pathname);
  return ancestors.length >= 2 ? ancestors[ancestors.length - 2] : null;
}

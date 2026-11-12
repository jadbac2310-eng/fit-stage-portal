import {
  LayoutDashboard,
  Database,
  BookOpen,
  Dumbbell,
  Ticket,
  CalendarDays,
  ShieldCheck,
  PiggyBank,
  FileSignature,
  Building2,
  Search,
  TrendingUp,
  ListChecks,
  Sparkles,
  MoonStar,
  Hammer,
  Users,
  Receipt,
  Wallet,
  LineChart,
  type LucideIcon,
} from "lucide-react";

export type NavNode = {
  label:      string;
  href:       string;
  icon?:      LucideIcon;
  adminOnly?: boolean;
  /** 外部サイト（別タブで開く。目次の選択中・パンくずには使わない） */
  external?:  boolean;
};

export type NavGroup = { title: string; items: NavNode[] };

/**
 * 目次の並び（2026-11-12 に目的ごとのまとまりに整理）。
 * 前は16項目が1列に並んでいて、探しにくかった。よく使うものを上に、設定は下に。
 * 目次（sidebar.tsx）とダッシュボードの「メニュー」（menu-tiles.tsx）の両方がこれを使う。
 */
export const NAV_GROUPS: NavGroup[] = [
  { title: "毎日つかう", items: [
    { label: "ダッシュボード", href: "/dashboard",  icon: LayoutDashboard },
    { label: "スケジュール",   href: "/schedule",    icon: CalendarDays },
    { label: "レッスン",       href: "/lessons",     icon: Dumbbell },
    { label: "回数券",         href: "/plans",       icon: Ticket },
    { label: "やること",       href: "/tasks",       icon: ListChecks },
  ] },
  { title: "お客さま・営業", items: [
    { label: "顧客",           href: "/master/customers",    icon: Users },
    { label: "入会申し込み",   href: "/master/applications", icon: FileSignature },
    { label: "ホテル営業",     href: "/sales",               icon: Building2 },
  ] },
  { title: "お金", items: [
    { label: "歩合",           href: "/commissions",     icon: PiggyBank },
    { label: "請求書",         href: "/invoices",        icon: Receipt,   adminOnly: true },
    { label: "入金",           href: "/admin/payments",  icon: Wallet,    adminOnly: true },
    { label: "単発の仕事",     href: "/side-jobs",       icon: Hammer,    adminOnly: true },
    { label: "経営の数字",     href: "/admin/dashboard", icon: LineChart, adminOnly: true },
  ] },
  { title: "会社", items: [
    { label: "ビジョン・ルール", href: "/wiki",      icon: BookOpen },
    { label: "今日の一手",     href: "/fortune",     icon: MoonStar },
    { label: "アシスタント",   href: "/assistant",   icon: Sparkles },
  ] },
  { title: "設定", items: [
    { label: "マスタ管理",     href: "/master",      icon: Database },
    { label: "SEO",            href: "/seo",         icon: Search,      adminOnly: true },
    { label: "管理者機能",     href: "/admin",       icon: ShieldCheck, adminOnly: true },
    // 代表個人の米国株ポータル（別リポジトリ invest-portal / Vercel）。事業データとは分離、管理者のみ表示
    { label: "米国株ポータル", href: "https://invest-portal-ten.vercel.app", icon: TrendingUp, adminOnly: true, external: true },
  ] },
];

/** 見せてよい項目だけにしたまとまり（空になったまとまりは出さない） */
export function visibleNavGroups(isAdmin: boolean): NavGroup[] {
  return NAV_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((n) => !n.adminOnly || isAdmin) }))
    .filter((g) => g.items.length > 0);
}

/** 全項目を1列にしたもの（パンくず・選択中の判定用） */
export const NAV_TREE: NavNode[] = NAV_GROUPS.flatMap((g) => g.items);

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
        !node.external &&
        (pathname === node.href ||
        (node.href !== "/dashboard" && pathname.startsWith(node.href + "/"))),
    )
    .sort((a, b) => a.href.length - b.href.length);
}

/** 目次で選択中にする項目。いちばん深く当てはまるもの1つだけ */
export function getActiveHref(pathname: string): string | undefined {
  const ancestors = getAncestors(pathname);
  return ancestors[ancestors.length - 1]?.href;
}

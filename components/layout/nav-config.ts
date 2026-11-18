import {
  LayoutDashboard,
  Bot,
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
  /** 英語の名前（英語に切り替えたとき） */
  en?:        string;
  href:       string;
  icon?:      LucideIcon;
  adminOnly?: boolean;
  /** 外部サイト（別タブで開く。目次の選択中・パンくずには使わない） */
  external?:  boolean;
};

export type NavGroup = { title: string; /** 英語の見出し */ en?: string; items: NavNode[] };

/** 目次・パンくずの名前（英語に切り替えているときは英語） */
export function navLabel(node: { label: string; en?: string }, lang: "ja" | "en"): string {
  return lang === "en" && node.en ? node.en : node.label;
}
export function navGroupTitle(group: NavGroup, lang: "ja" | "en"): string {
  return lang === "en" && group.en ? group.en : group.title;
}

/**
 * 目次の並び（2026-11-12 に目的ごとのまとまりに整理）。
 * 前は16項目が1列に並んでいて、探しにくかった。よく使うものを上に、設定は下に。
 * 目次（sidebar.tsx）とダッシュボードの「メニュー」（menu-tiles.tsx）の両方がこれを使う。
 */
export const NAV_GROUPS: NavGroup[] = [
  { title: "毎日つかう", en: "Daily", items: [
    { label: "ダッシュボード", en: "Dashboard", href: "/dashboard",  icon: LayoutDashboard },
    { label: "スケジュール", en: "Schedule",   href: "/schedule",    icon: CalendarDays },
    { label: "レッスン", en: "Lessons",       href: "/lessons",     icon: Dumbbell },
    { label: "回数券", en: "Session passes",         href: "/plans",       icon: Ticket },
    { label: "やること", en: "To-do",       href: "/tasks",       icon: ListChecks },
  ] },
  { title: "お客さま・営業", en: "Customers & sales", items: [
    { label: "顧客", en: "Customers",           href: "/master/customers",    icon: Users },
    { label: "入会申し込み", en: "Applications",   href: "/master/applications", icon: FileSignature },
    { label: "ホテル営業", en: "Hotel sales",     href: "/sales",               icon: Building2 },
  ] },
  { title: "お金", en: "Money", items: [
    { label: "歩合", en: "Commission",           href: "/commissions",     icon: PiggyBank },
    { label: "請求書", en: "Invoices",         href: "/invoices",        icon: Receipt,   adminOnly: true },
    { label: "入金", en: "Payments",           href: "/admin/payments",  icon: Wallet,    adminOnly: true },
    { label: "単発の仕事", en: "One-off jobs",     href: "/side-jobs",       icon: Hammer,    adminOnly: true },
    { label: "経営の数字", en: "Business numbers",     href: "/admin/dashboard", icon: LineChart, adminOnly: true },
  ] },
  { title: "会社", en: "Company", items: [
    { label: "ビジョン・ルール", en: "Vision & rules", href: "/wiki",      icon: BookOpen },
    { label: "今日の一手", en: "Today's move",     href: "/fortune",     icon: MoonStar },
    { label: "アシスタント", en: "Assistant",   href: "/assistant",   icon: Sparkles },
    { label: "AI部署", en: "AI office",         href: "/ai-office",   icon: Bot,         adminOnly: true },
  ] },
  { title: "設定", en: "Settings", items: [
    { label: "マスタ管理", en: "Master data",     href: "/master",      icon: Database },
    { label: "SEO", en: "SEO",            href: "/seo",         icon: Search,      adminOnly: true },
    { label: "管理者機能", en: "Admin",     href: "/admin",       icon: ShieldCheck, adminOnly: true },
    // 代表個人の米国株ポータル（別リポジトリ invest-portal / Vercel）。事業データとは分離、管理者のみ表示
    { label: "米国株ポータル", en: "US stocks", href: "https://invest-portal-ten.vercel.app", icon: TrendingUp, adminOnly: true, external: true },
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

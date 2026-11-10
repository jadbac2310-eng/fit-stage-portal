import Link from "next/link";
import { NAV_TREE } from "@/components/layout/nav-config";
import { SectionBox } from "@/components/ui/section-box";
import { cn } from "@/lib/cn";

/**
 * 「メニュー」。目次と同じ行き先を、四角いタイルで並べる（会社のポータルらしい作り。2026-11-10）。
 * 行き先は目次（NAV_TREE）から作るので、目次に足せばここにも出る。
 * いちばんよく使うスケジュールだけ金色にしてある。
 */
export function MenuTiles({ isAdmin }: { isAdmin: boolean }) {
  const items = NAV_TREE.filter((n) => n.href !== "/dashboard" && (!n.adminOnly || isAdmin));
  return (
    <SectionBox title="メニュー">
      <div className="grid grid-cols-4 gap-1.5 p-2.5">
        {items.map((n) => {
          const Icon = n.icon;
          const cls = cn(
            "aspect-square flex flex-col items-center justify-center gap-1.5 px-1 text-center text-[11px] font-bold leading-tight transition active:opacity-80",
            n.href === "/schedule" ? "bg-gold-500 text-white hover:bg-gold-600"
              : n.external ? "bg-white text-blue-700 border border-blue-700 hover:bg-blue-50"
              : "bg-navy-900 text-white hover:bg-navy-800",
          );
          const inner = (<>{Icon && <Icon size={22} strokeWidth={1.7} />}<span>{n.label}</span></>);
          return n.external
            ? <a key={n.href} href={n.href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>
            : <Link key={n.href} href={n.href} className={cls}>{inner}</Link>;
        })}
      </div>
    </SectionBox>
  );
}

/** 「目的別で探す」。よくやる作業へ1回で行くリンク */
export function QuickLinks({ isAdmin }: { isAdmin: boolean }) {
  const links: { label: string; href: string }[] = isAdmin
    ? [
        { label: "入金を記録する", href: "/admin/payments" },
        { label: "請求書を出す", href: "/invoices" },
        { label: "お客さまを追加", href: "/master/customers" },
        { label: "入会申し込みを見る", href: "/master/applications" },
        { label: "回数券を追加", href: "/plans" },
        { label: "単発の仕事を入れる", href: "/side-jobs" },
      ]
    : [
        { label: "レッスンを追加", href: "/lessons/regular" },
        { label: "体験を追加", href: "/lessons/trial" },
        { label: "自分の歩合を見る", href: "/commissions" },
        { label: "入会申し込みを見る", href: "/master/applications" },
      ];
  return (
    <SectionBox title="目的別で探す">
      <div className="grid grid-cols-2 gap-1.5 p-2.5">
        {links.map((l) => (
          <Link key={l.href} href={l.href}
            className="flex items-center justify-between gap-2 bg-blue-50 border border-[var(--portal-line)] px-2.5 py-2.5 text-xs font-bold text-gray-900 hover:bg-blue-100 transition">
            <span className="min-w-0 truncate">{l.label}</span>
            <span aria-hidden className="w-4 h-4 flex-shrink-0 rounded-full border border-blue-700 text-blue-700 flex items-center justify-center text-[11px] leading-none">›</span>
          </Link>
        ))}
      </div>
    </SectionBox>
  );
}

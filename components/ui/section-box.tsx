import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * ポータルの「箱」。見出しは ■ 見出し ＋ 濃紺の下線、右に「一覧へ」のリンク。
 *
 * 2026-11-10 のデザイン変更（会社のポータルらしい作り）で、画面のまとまりはこの箱で作ることにした。
 * 中身の余白は画面ごとに違うので、既定では付けない（表をぴったり入れるため）。余白が要るときは padded。
 */
export function SectionBox({
  title, action, children, className, padded = false, id,
}: {
  title: React.ReactNode;
  /** 見出しの右に出すリンク（「スケジュールへ」など） */
  action?: { label: string; href: string };
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
  id?: string;
}) {
  return (
    <section id={id} className={cn("bg-white border border-[var(--portal-line)]", className)}>
      <SectionHeading title={title} action={action} />
      <div className={padded ? "p-3" : undefined}>{children}</div>
    </section>
  );
}

/** 箱の見出しだけ（箱を自分で組むとき用） */
export function SectionHeading({ title, action }: { title: React.ReactNode; action?: { label: string; href: string } }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 border-b-2 border-[var(--portal-navy)]">
      <span aria-hidden className="w-2.5 h-2.5 bg-[var(--portal-gold)] flex-shrink-0" />
      <h2 className="text-sm font-bold text-gray-900 min-w-0 truncate">{title}</h2>
      {action && (
        <Link href={action.href} className="ml-auto text-xs text-blue-600 underline underline-offset-2 flex-shrink-0">
          {action.label}
        </Link>
      )}
    </div>
  );
}

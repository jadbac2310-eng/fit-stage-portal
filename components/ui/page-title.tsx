import { cn } from "@/lib/cn";

/**
 * ページの題（会社のポータルらしい作り。2026-11-10）。
 * 左に濃紺の太い線、下に細い線。右にボタンなどを置ける。
 */
export function PageTitle({
  title, sub, right, className,
}: {
  title: React.ReactNode;
  /** 題の下の小さい説明 */
  sub?: React.ReactNode;
  /** 右に置くもの（「追加」ボタンなど） */
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-end justify-between gap-3 border-b border-[var(--portal-line)] pb-2", className)}>
      <div className="min-w-0 border-l-[5px] border-[var(--portal-navy)] pl-2.5">
        <h1 className="text-lg md:text-xl font-bold text-gray-900 leading-tight">{title}</h1>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </div>
  );
}

/**
 * 切り替えのタブ（四角。選んだものが濃紺）。
 * 前は灰色の丸い入れ物に白い丸ボタン、という形だった。使い方：
 *   <div className={tabsWrap}> <button className={tabButton(active)}>…</button> </div>
 */
export const tabsWrap = "flex border border-[var(--portal-navy)] bg-white";
export function tabButton(active: boolean, size: "md" | "sm" = "md"): string {
  return cn(
    "flex-1 flex items-center justify-center gap-1.5 font-bold transition border-l border-[var(--portal-navy)] first:border-l-0",
    size === "md" ? "py-2 text-sm" : "py-1.5 px-1 text-[11px] whitespace-nowrap",
    active ? "bg-navy-900 text-white" : "bg-white text-blue-700 hover:bg-blue-50",
  );
}
/** タブの中の件数の丸 */
export function tabCount(active: boolean): string {
  return cn(
    "text-[11px] min-w-[1.1rem] h-[1.1rem] px-1 inline-flex items-center justify-center rounded-full font-bold",
    active ? "bg-gold-500 text-white" : "bg-blue-100 text-blue-700",
  );
}

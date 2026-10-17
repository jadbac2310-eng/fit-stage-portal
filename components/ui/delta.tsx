import { cn } from "@/lib/cn";
import { deltaPercent } from "@/lib/month-compare";

/**
 * 前月比。数字の横に「+12%」とだけ出す。
 *
 * 画面をごちゃごちゃさせないため、出すのはこの％だけ。先月の実額は別の行か内訳で見せる。
 *
 * 色は「増えたら嬉しい数字」（売上・歩合・本数・成約など）にだけ付ける。
 * 支払や経費はレッスンが増えれば一緒に増えるので、赤くすると誤解をまねく。
 * そういう数字は goodWhenUp を付けずに灰色のままにする。
 */
export function Delta({ now, prev, goodWhenUp, onColor, className }: {
  now: number;
  prev?: number | null;
  goodWhenUp?: boolean;
  /** 濃い色の背景の上に出すとき */
  onColor?: boolean;
  className?: string;
}) {
  const pct = deltaPercent(now, prev);
  if (pct == null) return null;   // 比べる相手が無い（先月0件など）ときは出さない

  const tone = pct === 0 || !goodWhenUp
    ? (onColor ? "text-white/70" : "text-gray-400")
    : pct > 0
      ? (onColor ? "text-white" : "text-green-600")
      : (onColor ? "text-white/70" : "text-rose-600");

  return (
    <span className={cn("ml-2 text-xs font-semibold tabular-nums", tone, className)}>
      {pct === 0 ? "±0%" : `${pct > 0 ? "+" : ""}${pct}%`}
    </span>
  );
}

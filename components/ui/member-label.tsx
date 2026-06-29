import { Avatar } from "./avatar";
import { cn } from "@/lib/cn";

/**
 * 担当者名＋アイコンをセットで表示する共通コンポーネント。
 * 担当者名を出すところは原則これを使う（名前だけの表示をなくす）。
 */
export function MemberLabel({
  name,
  avatarUrl,
  size = "xs",
  className,
  textClassName,
  suffix,
}: {
  name?: string | null;
  avatarUrl?: string;
  size?: "xs" | "sm" | "md";
  className?: string;
  textClassName?: string;
  suffix?: string; // 「(トレーナー)」など名前の後ろに付ける補足
}) {
  if (!name) return null;
  return (
    <span className={cn("inline-flex items-center gap-1.5 min-w-0 align-middle", className)}>
      <Avatar name={name} src={avatarUrl} size={size} />
      <span className={cn("truncate", textClassName)}>
        {name}{suffix ? <span className="text-gray-400">{suffix}</span> : null}
      </span>
    </span>
  );
}

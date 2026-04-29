import { cn } from "@/lib/cn";
import { Avatar } from "./avatar";

interface MemberBadgeProps {
  name: string;
  avatarUrl?: string;
  suffix?: string;
  className?: string;
}

export function MemberBadge({ name, avatarUrl, suffix, className }: MemberBadgeProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm text-gray-500", className)}>
      <Avatar name={name} src={avatarUrl} size="sm" />
      <span className="truncate">{name}{suffix}</span>
    </span>
  );
}

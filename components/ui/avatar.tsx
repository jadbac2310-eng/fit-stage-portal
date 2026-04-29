import { User } from "lucide-react";
import { cn } from "@/lib/cn";

const sizeClasses = {
  xs: { wrap: "w-5 h-5",   text: "text-[10px]", icon: 12 },
  sm: { wrap: "w-7 h-7",   text: "text-xs",     icon: 14 },
  md: { wrap: "w-9 h-9",   text: "text-sm",     icon: 16 },
  lg: { wrap: "w-12 h-12", text: "text-base",   icon: 20 },
} as const;

type Size = keyof typeof sizeClasses;

export function Avatar({
  name,
  src,
  size = "md",
  className,
  title,
}: {
  name: string;
  src?: string;
  size?: Size;
  className?: string;
  title?: string;
}) {
  const { wrap, text, icon } = sizeClasses[size];
  const initials = name.split(/\s+/).map((s) => s[0]).filter(Boolean).slice(0, 2).join("");

  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} title={title} className={cn(wrap, "rounded-full object-cover flex-shrink-0", className)} />;
  }

  return (
    <div title={title} className={cn(wrap, "rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 font-bold text-blue-700", text, className)}>
      {initials || <User size={icon} className="text-blue-400" />}
    </div>
  );
}

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { setLangAction } from "@/app/lang-actions";
import { useLang } from "@/components/i18n/lang-provider";

/** 「日本語｜EN」の切り替え。押したら cookie を書いて画面を読み直す */
export function LangSwitch({ dark = false, className }: { dark?: boolean; className?: string }) {
  const lang = useLang();
  const router = useRouter();
  const [pending, start] = useTransition();
  const btn = (value: "ja" | "en", label: string) => (
    <button
      type="button"
      disabled={pending}
      aria-pressed={lang === value}
      onClick={() => start(async () => { if (lang !== value) { await setLangAction(value); router.refresh(); } })}
      className={cn(
        "px-2 py-0.5 text-[11px] font-bold transition",
        lang === value
          ? dark ? "bg-gold-500 text-navy-900" : "bg-navy-900 text-white"
          : dark ? "text-white/70 hover:text-white" : "text-gray-500 hover:text-gray-900",
      )}
    >
      {label}
    </button>
  );
  return (
    <div className={cn("inline-flex border", dark ? "border-white/30" : "border-[var(--portal-line)]", pending && "opacity-60", className)} aria-label="Language">
      {btn("ja", "日本語")}
      {btn("en", "EN")}
    </div>
  );
}

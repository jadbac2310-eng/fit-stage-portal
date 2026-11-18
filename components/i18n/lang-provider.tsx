"use client";

import { createContext, useContext, useMemo } from "react";
import { makeT, type Lang, type T } from "@/lib/i18n";

/** 画面の部品に言語を渡す（ダッシュボードの枠でサーバーから受け取った言語を入れる） */
const LangContext = createContext<Lang>("ja");

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export function useLang(): Lang {
  return useContext(LangContext);
}

/** t("日本語", "English") */
export function useT(): T {
  const lang = useLang();
  return useMemo(() => makeT(lang), [lang]);
}

"use server";

import { cookies } from "next/headers";
import { LANG_COOKIE, toLang } from "@/lib/i18n";

/** 言語を切り替える（端末ごと。1年残す） */
export async function setLangAction(lang: string): Promise<void> {
  (await cookies()).set(LANG_COOKIE, toLang(lang), { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}

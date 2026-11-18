import { cookies } from "next/headers";
import { LANG_COOKIE, makeT, toLang, type Lang, type T } from "./i18n";

/** いまの画面の言語（cookie。無ければ日本語） */
export async function getLang(): Promise<Lang> {
  try {
    return toLang((await cookies()).get(LANG_COOKIE)?.value);
  } catch {
    return "ja"; // cookie を読めない場所（cron など）では日本語
  }
}

export async function getT(): Promise<T> {
  return makeT(await getLang());
}

/**
 * ポータルの言語（日本語／英語）の切り替え（2026-11-18 尚樹「英語と日本語を切り替えられるように」）。
 *
 * 英語にするのは、スタッフ（英語で使うトレーナー）が使う画面だけ。管理者だけの画面（請求書・入金・経営の数字・AI部署・SEO など）は日本語のまま。
 * お客さまの名前・メモなど、人が入力した中身は訳さない。
 *
 * 書き方：日本語と英語を並べて書く。 t("今日の予定", "Today's schedule")
 *   サーバー部品 … const t = await getT();         （lib/i18n-server.ts）
 *   画面の部品   … const t = useT();               （components/i18n/lang-provider.tsx）
 * 辞書ファイルに分けないのは、日本語を直すときに英語も隣で一緒に直せるようにするため。
 * 選んだ言語は端末ごとに cookie（portal_lang）に1年残る。切り替えは目次の下と上の帯のボタン。
 */
export type Lang = "ja" | "en";
export const LANG_COOKIE = "portal_lang";

export type T = (ja: string, en: string) => string;

export function makeT(lang: Lang): T {
  return (ja, en) => (lang === "en" ? en : ja);
}

export function toLang(v: string | undefined | null): Lang {
  return v === "en" ? "en" : "ja";
}

const WD_JA = ["日", "月", "火", "水", "木", "金", "土"];
const WD_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** 曜日（0=日曜） */
export function weekdayLabel(lang: Lang, day: number): string {
  return (lang === "en" ? WD_EN : WD_JA)[day] ?? "";
}

/** 日付の表示に使うロケール */
export function dateLocale(lang: Lang): string {
  return lang === "en" ? "en-US" : "ja-JP";
}

/** レッスンのコース名（データとして入っている日本語）を英語にする。知らないものはそのまま */
const COURSE_EN: Record<string, string> = {
  "回数券": "Session pass", "月2回": "2x / month", "月4回": "4x / month", "月8回": "8x / month",
  "都度": "Pay per session", "オンラインパーソナル": "Online", "無料": "Free", "無料（トレーナーに支払う）": "Free (coach paid)", "体験レッスン": "Trial",
};
export function courseLabel(course: string | undefined | null, lang: Lang): string {
  if (!course) return "";
  return lang === "en" ? COURSE_EN[course] ?? course : course;
}

/** レッスンの状況（LESSON_STATUS_LABEL の英語） */
export const LESSON_STATUS_EN: Record<string, string> = {
  scheduled: "Scheduled", completed: "Done", cancelled: "Cancelled", cancelled_same_day: "Late cancel",
};
/** 実施形態（DELIVERY_MODE_OPTIONS の英語） */
export const DELIVERY_MODE_EN: Record<string, string> = { store: "Studio", onsite: "On-site", online: "Online" };
/** 会場の種類（venueKindOptions の英語） */
export const VENUE_KIND_EN: Record<string, string> = {
  none: "None", store: "FIT STAGE", gym: "Rental gym", fct: "FCT", avenir: "Avenir",
};

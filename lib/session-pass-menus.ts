// 回数券のメニュー（店舗／出張）。回数券を追加するときのボタンに使う。2026-11-08
//
// プランマスタの回数券表は「人数×回数」で1つしか金額を持てない。
// 店舗の8回券（¥72,000）と出張の8回券（¥76,800）が同じ「1名・8回」になってしまい、
// 店舗の券を足すと出張の金額が入っていた。なので、メニューごとの金額をここに持つ。
//
// 金額はHPの料金表と同じにすること（税込）。HPの料金を変えたら、ここも一緒に直す。
//   店舗：fit-stage の store/esaka/index.html など（3店舗共通）
//   出張：fit-stage の price/index.html

export type PassMenuGroup = "store" | "outcall";

export interface PassMenu {
  group: PassMenuGroup;
  /** 例：「1名60分」 */
  label: string;
  personCount: 1 | 2;
  /** 回数 → 金額（税込。2名は2名合計） */
  prices: { count: number; amount: number }[];
  /** 有効期限の目安（初回利用日から）。画面に添えるだけ */
  validity: string;
}

export const PASS_MENU_GROUP_LABEL: Record<PassMenuGroup, string> = {
  store:   "店舗",
  outcall: "出張",
};

export const PASS_MENUS: PassMenu[] = [
  { group: "store", label: "1名60分", personCount: 1, validity: "2回・4回券は1か月、8回券は2か月",
    prices: [{ count: 2, amount: 19200 }, { count: 4, amount: 36800 }, { count: 8, amount: 72000 }] },
  { group: "store", label: "1名90分", personCount: 1, validity: "2回・4回券は1か月、8回券は2か月",
    prices: [{ count: 2, amount: 26200 }, { count: 4, amount: 50200 }, { count: 8, amount: 98000 }] },
  { group: "store", label: "2名60分", personCount: 2, validity: "2回・4回券は1か月、8回券は2か月",
    prices: [{ count: 2, amount: 26200 }, { count: 4, amount: 50200 }, { count: 8, amount: 98000 }] },
  { group: "store", label: "2名90分", personCount: 2, validity: "2回・4回券は1か月、8回券は2か月",
    prices: [{ count: 2, amount: 35900 }, { count: 4, amount: 68800 }, { count: 8, amount: 134400 }] },
  { group: "outcall", label: "1名60分", personCount: 1, validity: "8回は3か月、16回は4か月、32回は6か月",
    prices: [{ count: 8, amount: 76800 }, { count: 16, amount: 148800 }, { count: 32, amount: 288000 }] },
  { group: "outcall", label: "2名60分", personCount: 2, validity: "8回は3か月、16回は4か月、32回は6か月",
    prices: [{ count: 8, amount: 104800 }, { count: 16, amount: 203200 }, { count: 32, amount: 393600 }] },
];

/** メモ欄に入れる名前。例：「店舗・1名90分」 */
export function passMenuName(m: PassMenu): string {
  return `${PASS_MENU_GROUP_LABEL[m.group]}・${m.label}`;
}

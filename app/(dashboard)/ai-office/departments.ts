/**
 * AI部署の一覧（組織図に出す順）。部署を増やすときはここに足す。
 * state は実際に動いているかどうか。動いていないものを「稼働中」にしない。
 */
export interface AiDepartment {
  key: string;
  name: string;
  /** 擬人化したときの呼び名・ひとこと */
  persona: string;
  /** アバターに出す1文字 */
  avatar: string;
  role: string;
  when: string;
  state: "active" | "planned";
}

export const AI_DEPARTMENTS: AiDepartment[] = [
  {
    key: "ops-check",
    name: "業務チェック部",
    persona: "入力の見張り役",
    avatar: "検",
    role: "レッスン・体験の入力を見て、完了忘れ・担当なし・二重登録・コース未設定・体験の結果未入力を拾う。直すのは人。",
    when: "毎朝9時（社長へ LINE）・この画面を開いたとき",
    state: "active",
  },
  {
    key: "portal-dev",
    name: "ポータル開発部",
    persona: "ポータルの大工",
    avatar: "開",
    role: "このポータルの改善と不具合直し。決まりは AGENTS.md に書いて引き継ぐ。",
    when: "社長が Claude Code のセッションで頼んだとき",
    state: "active",
  },
  {
    key: "hp-growth",
    name: "HP・集客部",
    persona: "検索の見張り役",
    avatar: "集",
    role: "サーチコンソールの数字を見て、店舗ページ・ブログの直し案を出す。HP を直すのは社長の OK のあと。",
    when: "週1回の報告（これから作る）",
    state: "planned",
  },
];

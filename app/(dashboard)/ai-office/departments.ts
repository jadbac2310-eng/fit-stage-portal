/**
 * AI部署の一覧（組織図に出す順）。部署を増やすときはここに足す。
 * state は実際に動いているかどうか。動いていないものを「稼働中」にしない。
 */
import type { AvatarLook } from "./business-avatar";

export interface AiDepartment {
  key: string;
  name: string;
  /** 擬人化した担当者（役職と名前。架空の人物。変えたいときはここを直す） */
  title: string;
  personName: string;
  /** ひとこと（どんな人か） */
  persona: string;
  look: AvatarLook;
  role: string;
  when: string;
  state: "active" | "planned";
}

export const AI_DEPARTMENTS: AiDepartment[] = [
  {
    key: "ops-check",
    name: "業務チェック部",
    title: "部長",
    personName: "正木 誠",
    persona: "几帳面な点検役。毎朝いちばんに出社",
    look: { hair: "side", accent: "#C9A84C" },
    role: "レッスン・体験の入力を見て、完了忘れ・担当なし・二重登録・コース未設定・体験の結果未入力を拾う。直すのは人。",
    when: "毎朝9時（社長へ LINE）・この画面を開いたとき",
    state: "active",
  },
  {
    key: "portal-dev",
    name: "ポータル開発部",
    title: "部長",
    personName: "築山 匠",
    persona: "ポータルを作る職人。頼まれたらすぐ動く",
    look: { hair: "short", accent: "#3B6FB6" },
    role: "このポータルの改善と不具合直し。決まりは AGENTS.md に書いて引き継ぐ。",
    when: "社長が Claude Code のセッションで頼んだとき",
    state: "active",
  },
  {
    key: "hp-growth",
    name: "HP・集客部",
    title: "部長",
    personName: "広瀬 遥",
    persona: "検索の数字を読む集客の担当",
    look: { hair: "bob", accent: "#B23A48" },
    role: "サーチコンソールの数字を見て、今週直すと効くところを3つまで提案する。HP を直すのは社長の OK のあと（HP のセッションへ）。",
    when: "毎週月曜9時（社長へ LINE）・この画面を開いたとき",
    state: "active",
  },
];

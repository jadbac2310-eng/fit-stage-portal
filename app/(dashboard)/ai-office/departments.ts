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

/**
 * 統括本部（社長のすぐ下。2026-11-17。「室長」はださいので本部長に）。各部署の報告を朝の1通にまとめ、大事な順に並べる（lib/chief-digest.ts）。
 * 名前は尚樹の指定（映画監督の名前をあだ名として使う。社内向けの呼び名）。
 */
export const CHIEF: Omit<AiDepartment, "key" | "state"> & { key: "chief"; fullTitle: string } = {
  key: "chief",
  fullTitle: "統括本部長",
  name: "統括本部",
  title: "本部長",
  personName: "スティーブン・スピルバーグ",
  persona: "全体を見て、社長に見せる順番を決める",
  look: { hair: "back", accent: "#C9A84C", suit: "#0F1B33" },
  role: "朝9時の知らせを社長あての1通にまとめて大事な順に並べる。社長の指示を受けて担当の部署に振り分け、止まっている指示を知らせる。決めるのは社長。",
  when: "毎朝9時（社長へ LINE を1通）・指示を受けたとき",
};

export const AI_DEPARTMENTS: AiDepartment[] = [
  {
    key: "ops-check",
    name: "業務チェック部",
    title: "部長",
    personName: "クリストファー・ノーラン",
    persona: "時間と細部にうるさい点検役",
    look: { hair: "side", accent: "#C9A84C" },
    role: "レッスン・体験の入力を見て、完了忘れ・担当なし・二重登録・コース未設定・体験の結果未入力を拾う。直すのは人。",
    when: "毎朝（統括本部長の朝の1通に入る）・この画面を開いたとき",
    state: "active",
  },
  {
    key: "portal-dev",
    name: "ポータル開発部",
    title: "部長",
    personName: "黒澤明",
    persona: "細部まで作り込む職人。頼まれたらすぐ動く",
    look: { hair: "short", accent: "#3B6FB6" },
    role: "このポータルの改善と不具合直し。決まりは AGENTS.md に書いて引き継ぐ。",
    when: "社長が Claude Code のセッションで頼んだとき",
    state: "active",
  },
  {
    key: "hp-growth",
    name: "HP・集客部",
    title: "部長",
    personName: "スティーヴ・ムック",
    persona: "検索の数字を読む集客の担当",
    look: { hair: "short", accent: "#B23A48", suit: "#3A3F4B" },
    role: "サーチコンソールの数字を見て、今週直すと効くところを3つまで提案する。HP を直すのは社長の OK のあと（HP のセッションへ）。",
    when: "毎週月曜（統括本部長の朝の1通に入る）・この画面を開いたとき",
    state: "active",
  },
];

/**
 * AI部署の一覧（組織図に出す順）。部署を増やすときはここに足す。
 * state は実際に動いているかどうか。動いていないものを「稼働中」にしない。
 */
import type { AvatarLook } from "./business-avatar";

export interface AiDepartment {
  key: string;
  name: string;
  /** ひと目でわかる説明（20字前後） */
  plain: string;
  /** 部署の色（カードの上の線・アイコンの札） */
  color: string;
  /** 部署のアイコン（lucide の名前。ai-office-view.tsx の ICONS） */
  icon: "chief" | "check" | "dev" | "growth";
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
  plain: "社長への報告をまとめて、指示を部署に回す",
  color: "#C9A84C",
  icon: "chief",
  title: "本部長",
  personName: "スティーブン・スピルバーグ",
  persona: "現場を仕切る総監督。見せる順番にこだわる",
  look: { hair: "short", hairColor: "#8A8F98", beard: "full", glasses: "round", cap: "#17284B", accent: "#C9A84C", suit: "#0F1B33", bg: "#F6EED7", mouth: "grin" },
  role: "朝9時の知らせを社長あての1通にまとめて大事な順に並べる。社長の指示を受けて担当の部署に振り分け、止まっている指示を知らせる。決めるのは社長。",
  when: "毎朝9時（社長へ LINE を1通）・指示を受けたとき",
};

export const AI_DEPARTMENTS: AiDepartment[] = [
  {
    key: "ops-check",
    name: "業務チェック部",
    plain: "入力ミス・入れ忘れを毎朝見つける",
    color: "#2F7D5B",
    icon: "check",
    title: "部長",
    personName: "クリストファー・ノーラン",
    persona: "時間と細部にうるさい点検役。見逃しは許さない",
    look: { hair: "side", hairColor: "#5B4A3A", brow: "stern", mouth: "flat", accent: "#2F7D5B", suit: "#2E3440", bg: "#E1F0E8" },
    role: "レッスン・体験の入力を見て、完了忘れ・担当なし・二重登録・コース未設定・体験の結果未入力を拾う。直すのは人。",
    when: "毎朝（統括本部長の朝の1通に入る）・この画面を開いたとき",
    state: "active",
  },
  {
    key: "portal-dev",
    name: "ポータル開発部",
    plain: "このポータルを作る・直す",
    color: "#3B6FB6",
    icon: "dev",
    title: "部長",
    personName: "黒澤明",
    persona: "細部まで作り込む職人気質。頼まれたらすぐ動く",
    look: { hair: "back", hairColor: "#4A4A4A", glasses: "dark", brow: "stern", mouth: "smile", accent: "#3B6FB6", suit: "#17284B", bg: "#E2EAF6" },
    role: "このポータルの改善と不具合直し。決まりは AGENTS.md に書いて引き継ぐ。",
    when: "社長が Claude Code のセッションで頼んだとき",
    state: "active",
  },
  {
    key: "hp-growth",
    name: "HP・集客部",
    plain: "HPの検索順位を見て、直す所を提案",
    color: "#B23A48",
    icon: "growth",
    title: "部長",
    personName: "スティーヴ・ムック",
    persona: "数字が大好きなムードメーカー。ノーネクタイ派",
    look: { hair: "curly", hairColor: "#3B2A20", beard: "stubble", brow: "up", mouth: "grin", suit: "#3A3F4B", bg: "#F6E3E6" },
    role: "サーチコンソールの数字を見て、今週直すと効くところを3つまで提案する。HP を直すのは社長の OK のあと（HP のセッションへ）。",
    when: "毎週月曜（統括本部長の朝の1通に入る）・この画面を開いたとき",
    state: "active",
  },
];

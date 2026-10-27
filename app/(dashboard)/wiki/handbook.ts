import type { LucideIcon } from "lucide-react";
import { Compass, Building2, ScrollText, ListChecks, Sprout, FolderOpen } from "lucide-react";

/**
 * ビジョン・ルール（ハンドブック）の章立て。
 *
 * フォルダは誰でも作れるので、決まった章は順番と英語の小見出しをここで持ち、
 * それ以外のフォルダは後ろに「その他」として並べる。
 * 色は HP と同じ 金（#C9A84C）を差し色に使い、章ごとには分けない（分けると安っぽくなる）。
 */
export interface Chapter {
  /** フォルダ名（= wiki_pages.folder） */
  folder: string;
  /** 表紙・目次で添える英語の小見出し */
  label: string;
  /** ひとこと */
  lead: string;
  icon: LucideIcon;
}

export const CHAPTERS: Chapter[] = [
  { folder: "ビジョン",   label: "VISION",      lead: "私たちは何者で、どこへ向かうのか", icon: Compass },
  { folder: "会社のこと", label: "COMPANY",     lead: "基本情報・サービス・店舗・トレーナー", icon: Building2 },
  { folder: "ルール",     label: "RULES",       lead: "お客さまとの約束、仲間との約束", icon: ScrollText },
  { folder: "手順",       label: "HOW WE WORK", lead: "迷ったときに開く、やり方", icon: ListChecks },
  { folder: "育成",       label: "GROWTH",      lead: "トレーナーとして、どう伸びていくか", icon: Sprout },
];

export const FALLBACK_CHAPTER: Omit<Chapter, "folder"> = {
  label: "OTHERS", lead: "", icon: FolderOpen,
};

export function chapterOf(folder: string): Chapter {
  return CHAPTERS.find((c) => c.folder === folder) ?? { folder, ...FALLBACK_CHAPTER };
}

/** 決まった章を先に、それ以外は元の順で後ろに */
export function orderFolders(folders: string[]): string[] {
  const rank = new Map(CHAPTERS.map((c, i) => [c.folder, i]));
  return [...folders].sort((a, b) => (rank.get(a) ?? 99) - (rank.get(b) ?? 99));
}

/** 表紙に載せる言葉。HPの会社概要と同じ（ここだけ変えると食い違うので、変えるなら両方） */
export const COVER = {
  kicker: "FIT STAGE HANDBOOK",
  headline: "「ジムに通う」から「ジムを持つ」へ。",
  tagline: "未来へ続く、健やかさ。",
  mission: "「動ける環境」を持てない人をゼロにしていく。",
};

/**
 * 星まわり（六星占術の考え方をもとにした運気の計算）。純粋な計算だけ。DBもAPIも触らない。
 *
 * 仕組み（複数の解説サイトと Wikipedia で裏取り済み）：
 *   ・運命星 … 生まれた「日」の六十干支の番号（甲子=1 … 癸亥=60）を10ずつ区切る。
 *              1〜10 土星人／11〜20 金星人／21〜30 火星人／31〜40 天王星人／41〜50 木星人／51〜60 水星人
 *   ・＋／− … 生まれた「年」の十二支。子寅辰午申戌＝プラス、丑卯巳未酉亥＝マイナス。
 *              立春（2月4日ごろ）より前の生まれは前の年で見る。
 *   ・運気の周期 … 種子→緑生→立花→健弱→達成→乱気→再会→財成→安定→陰影→停止→減退 の12段階が
 *              十二支に1つずつ対応する。どの支が「陰影」かは星と＋−で決まる（下の INYO_BRANCH）。
 *              年は年の十二支、月は月の十二支（1月=丑 … 12月=子）、日は日の十二支で見る。
 *   ・霊合星人 … 生まれ年の十二支が、自分の周期の「停止」にあたる人。
 *
 * 「六星占術」は細木数子さんの占いの名前（商標）。画面では「星まわり」と呼び、
 * 説明文に「六星占術の考え方をもとにしています」と添える。
 */

export const STARS = ["土星", "金星", "火星", "天王星", "木星", "水星"] as const;
export type Star = (typeof STARS)[number];
export type Polarity = "+" | "-";

export const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;
const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;

export const PHASES = [
  "種子", "緑生", "立花", "健弱", "達成", "乱気", "再会", "財成", "安定", "陰影", "停止", "減退",
] as const;
export type Phase = (typeof PHASES)[number];

/** 殺界の区分。陰影・停止・減退が大殺界、健弱が小殺界、乱気が中殺界 */
export type PhaseKind = "good" | "small" | "middle" | "big";
export const PHASE_KIND: Record<Phase, PhaseKind> = {
  種子: "good", 緑生: "good", 立花: "good", 健弱: "small", 達成: "good", 乱気: "middle",
  再会: "good", 財成: "good", 安定: "good", 陰影: "big", 停止: "big", 減退: "big",
};

/** 「陰影」にあたる十二支（index）。星と＋−で決まる。senjutsu.jp の大殺界早見表より */
const INYO_BRANCH: Record<Star, Record<Polarity, number>> = {
  土星:   { "+": 9,  "-": 10 }, // 酉 / 戌
  金星:   { "+": 7,  "-": 8 },  // 未 / 申
  火星:   { "+": 5,  "-": 6 },  // 巳 / 午
  天王星: { "+": 3,  "-": 4 },  // 卯 / 辰
  木星:   { "+": 1,  "-": 2 },  // 丑 / 寅
  水星:   { "+": 11, "-": 0 },  // 亥 / 子
};

export interface StarType {
  star: Star;
  polarity: Polarity;
  /** 「火星人＋」のような表示名 */
  label: string;
  /** 生まれた日の干支番号（1〜60） */
  seisu: number;
  /** 生まれた日の干支（例: 丙午） */
  kanshi: string;
  /** 生まれ年の十二支（立春で切る） */
  yearBranch: number;
  /** 霊合星人か */
  reigo: boolean;
}

// ─── 暦の計算 ───────────────────────────────────────────

/** グレゴリオ暦の年月日 → ユリウス通日 */
export function toJDN(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

/** その日の干支番号（0=甲子 … 59=癸亥）。2000-01-01 が戊午(54)になることで検算済み */
export function dayKanshiIndex(y: number, m: number, d: number): number {
  return (((toJDN(y, m, d) + 49) % 60) + 60) % 60;
}

export function kanshiName(index: number): string {
  return `${STEMS[index % 10]}${BRANCHES[index % 12]}`;
}

/** 立春の日（2月何日か）。1901〜2100年の近似式 */
export function risshunDay(year: number): number {
  // 00年は前の世紀の100年目として計算する（2000年は20世紀の式で y=100）
  const y = year % 100 === 0 ? 100 : year % 100;
  const D = year >= 2001 ? 3.87 : 4.6295;
  return Math.floor(y * 0.2422 + D) - Math.floor((y - 1) / 4);
}

/** 年の十二支（index）。1984年＝甲子 */
export function yearBranchOf(year: number): number {
  return (((year - 4) % 12) + 12) % 12;
}

/** 月の十二支（index）。1月=丑, 2月=寅 … 11月=亥, 12月=子 */
export function monthBranchOf(month: number): number {
  return month % 12;
}

export function parseDate(iso: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, m: mo, d };
}

// ─── 運命星 ─────────────────────────────────────────────

export function starTypeOf(birth: string): StarType | null {
  const p = parseDate(birth);
  if (!p) return null;
  const idx = dayKanshiIndex(p.y, p.m, p.d);
  const seisu = idx + 1;
  const star = STARS[Math.floor(idx / 10)];
  // 立春より前の生まれは前の年の十二支で見る
  const beforeRisshun = p.m === 1 || (p.m === 2 && p.d < risshunDay(p.y));
  const yearBranch = yearBranchOf(beforeRisshun ? p.y - 1 : p.y);
  const polarity: Polarity = yearBranch % 2 === 0 ? "+" : "-";
  const reigo = yearBranch === stopBranchOf(star, polarity);
  return {
    star, polarity, seisu, yearBranch, reigo,
    label: `${star}人${polarity === "+" ? "＋" : "−"}`,
    kanshi: kanshiName(idx),
  };
}

function stopBranchOf(star: Star, polarity: Polarity): number {
  return (INYO_BRANCH[star][polarity] + 1) % 12;
}

// ─── 運気 ───────────────────────────────────────────────

/** その十二支のとき、この星の人はどの運気か */
export function phaseForBranch(t: Pick<StarType, "star" | "polarity">, branch: number): Phase {
  const inyo = INYO_BRANCH[t.star][t.polarity];
  // 陰影が index 9 なので、そこからのずれで決める
  return PHASES[(((branch - inyo + 9) % 12) + 12) % 12];
}

export function yearPhase(t: Pick<StarType, "star" | "polarity">, year: number): Phase {
  return phaseForBranch(t, yearBranchOf(year));
}

export function monthPhase(t: Pick<StarType, "star" | "polarity">, month: number): Phase {
  return phaseForBranch(t, monthBranchOf(month));
}

export function dayPhase(t: Pick<StarType, "star" | "polarity">, y: number, m: number, d: number): Phase {
  return phaseForBranch(t, dayKanshiIndex(y, m, d) % 12);
}

/** 12年ぶんの年運（fromYear から） */
export function yearCycle(t: Pick<StarType, "star" | "polarity">, fromYear: number, count = 12): { year: number; phase: Phase }[] {
  return Array.from({ length: count }, (_, i) => ({ year: fromYear + i, phase: yearPhase(t, fromYear + i) }));
}

/** 1年ぶんの月運（毎年同じ） */
export function monthCycle(t: Pick<StarType, "star" | "polarity">): { month: number; phase: Phase }[] {
  return Array.from({ length: 12 }, (_, i) => ({ month: i + 1, phase: monthPhase(t, i + 1) }));
}

/**
 * 相性（地運）。相手の生まれ年の十二支が、自分の周期でどの運気にあたるか。
 * 「自分から見た相手」を返す。逆向きは引数を入れ替える。
 */
export function relationPhase(me: Pick<StarType, "star" | "polarity">, other: Pick<StarType, "yearBranch">): Phase {
  return phaseForBranch(me, other.yearBranch);
}

/** 大殺界の3年（次に来る、または今の）を返す */
export function nextBigDecline(t: Pick<StarType, "star" | "polarity">, fromYear: number): { from: number; to: number } {
  for (let y = fromYear; y < fromYear + 12; y++) {
    if (yearPhase(t, y) === "陰影") return { from: y, to: y + 2 };
  }
  // fromYear が陰影より後の大殺界の途中なら、その大殺界
  for (let y = fromYear - 2; y < fromYear; y++) {
    if (yearPhase(t, y) === "陰影") return { from: y, to: y + 2 };
  }
  return { from: fromYear, to: fromYear + 2 };
}

import { starTypeOf, dayPhase, monthPhase, yearPhase, type StarType, type Phase } from "./rokusei";
import { PHASE_TEXT, tipOfDay, phaseBadge } from "./rokusei-content";

const JST = 9 * 60 * 60 * 1000;

/** 今日（日本時間）の年・月・日 */
export function jstYmd(now: Date | number = Date.now()): { y: number; m: number; d: number; dayNumber: number } {
  const t = typeof now === "number" ? now : now.getTime();
  const d = new Date(t + JST);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), dayNumber: Math.floor((t + JST) / 86400000) };
}

function hashOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export interface StarToday {
  type: StarType;
  today: Phase;
  month: Phase;
  year: Phase;
  /** 今日の運気の絵文字と呼び名 */
  emoji: string;
  name: string;
  summary: string;
  /** 今日のひとつ（行動） */
  tip: string;
  /** 殺界のバッジ（無ければ null） */
  badge: string | null;
}

/**
 * その人の「今日の星まわり」。ダッシュボードと星まわりページの両方で使う。
 * 生年月日が無ければ null。
 */
export function starToday(birthDate: string | undefined, memberId: string | undefined, now: Date | number = Date.now()): StarToday | null {
  if (!birthDate) return null;
  const type = starTypeOf(birthDate);
  if (!type) return null;
  const { y, m, d, dayNumber } = jstYmd(now);
  const today = dayPhase(type, y, m, d);
  const text = PHASE_TEXT[today];
  return {
    type, today,
    month: monthPhase(type, m),
    year: yearPhase(type, y),
    emoji: text.emoji, name: text.name, summary: text.summary,
    tip: tipOfDay(today, hashOf(`${memberId ?? "-"}:${dayNumber}`)),
    badge: phaseBadge(today),
  };
}

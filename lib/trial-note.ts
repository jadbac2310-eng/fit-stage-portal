/**
 * 体験レッスンの備考の整形。
 *
 * カウンセリング申込フォーム（consultation-webhook）から入る備考は
 *   フリガナ: カクシ　ハルナ
 *   目的・お悩み: 健康維持・運動不足解消 / Health maintenance, 姿勢改善（猫背・反り腰など） / Posture improvement
 *   医師の運動制限: いいえ（制限なし） / No (No restrictions)
 * のような「ラベル: 値」の羅列で、値には英訳が併記されている。
 * そのまま出すと一覧がテキストの壁になるため、項目に分解し英訳を落として表示する。
 *
 * 手入力の申し送りメモ（ラベル無しの自由記述）も混ざるので、その場合は素通しする。
 */

export interface TrialNoteItem {
  label: string;
  value: string;
}

export interface ParsedTrialNote {
  /** 「ラベル: 値」として読めた項目 */
  items: TrialNoteItem[];
  /** ラベルが付いていない行（手書きのメモなど） */
  freeText: string;
}

const JP = "\\u3040-\\u30ff\\u3400-\\u9fff\\uff66-\\uff9f";
const JAPANESE = new RegExp(`[${JP}]`);

// 「 / 」に続く非日本語の並び（英訳）を、次の値の頭（", 日本語"）か文末まで削る。
// 英訳自体が "Pain relief (Shoulder, Back pain, etc.)" のようにカンマを含むため、
// 単純にカンマで区切ってから処理すると英訳が途中で切れてしまう。
const ENGLISH_TAIL = new RegExp(` / [^${JP}]*?(?=,\\s*[${JP}]|$)`, "g");

/**
 * 「日本語 / English」の併記から日本語だけを残す。
 * カンマ区切りの複数値にも対応する（各値ごとに英訳を落とし、読点で連結する）。
 * 併記が無い値（日付・自由記述・英語のみの入力など）はそのまま返す。
 */
export function stripBilingual(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.includes(" / ") || !JAPANESE.test(trimmed)) return trimmed;

  const stripped = trimmed.replace(ENGLISH_TAIL, "");
  // 英訳を削ったあとに残るカンマは値の区切りなので、読点に揃える
  return stripped.replace(/\s*,\s*/g, "、").trim();
}

/** 備考を「ラベル: 値」の項目と自由記述に分解する。 */
export function parseTrialNote(note?: string): ParsedTrialNote {
  const items: TrialNoteItem[] = [];
  const free: string[] = [];
  if (!note) return { items, freeText: "" };

  for (const rawLine of note.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    // 全角コロンも区切りとして扱う。ラベルは短い見出しのみを対象にし、
    // 「10:15」のような時刻や長い文章を誤ってラベル扱いしないようにする。
    const m = line.match(/^([^:：]{1,20})[:：]\s*(.+)$/);
    if (m && JAPANESE.test(m[1])) {
      items.push({ label: m[1].trim(), value: stripBilingual(m[2]) });
    } else {
      free.push(line);
    }
  }

  return { items, freeText: free.join("\n") };
}

/**
 * 一覧でそのまま1行表示してよい短い備考か。
 * 申し送りメモ程度なら折りたたまずに出したいので、その判定に使う。
 */
export function isShortNote(note?: string): boolean {
  if (!note) return true;
  const trimmed = note.trim();
  return trimmed.length <= 60 && !trimmed.includes("\n");
}

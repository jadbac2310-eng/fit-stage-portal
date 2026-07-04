// 1レッスンあたりの単価
export const LESSON_PRICE: Record<string, number> = {
  "月2回":     9350,   // 18,700 / 2
  "月4回":     9100,   // 36,400 / 4
  "月8回":     9350,   // 74,800 / 8
  "回数券":    9300,   // 回数券レッスン1回あたり（必要に応じて調整）
  "都度":       9900,
  // 旧コース名（既存レッスンの互換用）
  "回数券8回":  9600,
  "回数券16回": 9300,
  "回数券32回": 9000,
  "体験レッスン": 6600,
};

// 体験レッスンのコース名（歩合計算・プランマスタでの単価キーとして使用）
export const TRIAL_LESSON_COURSE_NAME = "体験レッスン";

// トレーナー歩合率 (50%)
export const TRAINER_RATE = 0.50;

// 営業歩合率
export const SALES_RATE = {
  individual: 0.10,  // 個人 10%
  corporate:  0.12,  // 法人 12%
} as const;

// 成約ボーナス
export const CONTRACT_BONUS = {
  individual: 10_000,  // 個人 10,000円
  corporate:  25_000,  // 法人 25,000円
} as const;

/** コースからレッスン単価を返す（未登録は 0） */
export function getLessonFee(course: string | undefined | null): number {
  if (!course) return 0;
  return LESSON_PRICE[course] ?? 0;
}

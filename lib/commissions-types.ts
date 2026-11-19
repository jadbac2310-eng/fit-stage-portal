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
  "体験レッスン2名": 9900,     // 店舗の体験・ペア（2名合計。HPの料金・確定メールと同じ額）
  "出張体験レッスン": 9900,   // 出張の体験（2026-11-18〜。通常の出張1名60分と同じ額）
  "出張体験レッスン2名": 13500, // 出張の体験・2名（通常の出張2名60分と同じ額。2名合計）
};

// 体験レッスンのコース名（歩合計算・プランマスタでの単価キーとして使用）
export const TRIAL_LESSON_COURSE_NAME = "体験レッスン";

/**
 * 出張の体験は 9,900円（2026-11-18 尚樹「出張の場合は体験も全部とりあえず9,900円」）。
 * 店舗の体験は 6,600円のまま。HPの料金（/price/・/service/personal/ ほか）と同じにする。
 * プランマスタに「出張体験レッスン」という単発の行を足せば、そちらの金額が優先される。
 */
export const ONSITE_TRIAL_COURSE_NAME = "出張体験レッスン";
/**
 * 出張の体験・2名は 13,500円（2名合計。2026-11-18 尚樹「通常の13,500に」）。
 * 2名かどうかは、備考の「利用人数: 2名」で見分ける（lib/trial-note.ts の isPairTrialNote）。
 */
export const ONSITE_TRIAL_PAIR_COURSE_NAME = "出張体験レッスン2名";

/**
 * この日時より後に「登録した」出張の体験から 9,900円にする（日本時間 2026-11-18 0:00）。
 * それより前に登録した体験は 6,600円でご案内済みなので、過去の売上・歩合・請求は変えない。
 */
export const ONSITE_TRIAL_FROM = "2026-11-17T15:00:00.000Z";

/** 出張の体験料金（9,900円）で扱う体験かどうか。実施形態が「出張」で、切り替え日以降に登録したもの */
export function isOnsiteTrialPrice(trial: { deliveryMode?: string | null; createdAt?: string | null }): boolean {
  if (trial.deliveryMode !== "onsite" || !trial.createdAt) return false;
  const t = new Date(trial.createdAt).getTime();
  return Number.isFinite(t) && t >= new Date(ONSITE_TRIAL_FROM).getTime();
}

/**
 * 店舗の体験・2名（ペア）は 9,900円（2名合計。2026-11-18 尚樹「なおす」）。
 * 確定メールとHPは前から 9,900円なのに、売上・歩合・請求だけ 1名と同じ 6,600円で計上していたのを直した。
 * 2名かどうかは、備考の「利用人数: 2名」で見分ける（lib/trial-note.ts の isPairTrialNote）。
 * プランマスタに「体験レッスン2名」という単発の行を足せば、そちらの金額が優先される。
 */
export const STORE_PAIR_TRIAL_COURSE_NAME = "体験レッスン2名";

/**
 * 実施日がこの日時以降の体験から、店舗のペアを 9,900円で計上する（日本時間 2026-11-01 0:00）。
 * 10月までの月は 6,600円で締めて支払い済みなので、過去の売上・歩合・請求は変えない。
 */
export const STORE_PAIR_TRIAL_FROM = "2026-10-31T15:00:00.000Z";

/** 店舗のペア料金（9,900円）で扱う体験かどうか。実施形態が「店舗」で、実施日が切り替え日以降のもの（2名かどうかは別に見る） */
export function isStorePairTrialPeriod(trial: { deliveryMode?: string | null; scheduledAt?: string | null }): boolean {
  if ((trial.deliveryMode ?? "store") !== "store" || !trial.scheduledAt) return false;
  const t = new Date(trial.scheduledAt).getTime();
  return Number.isFinite(t) && t >= new Date(STORE_PAIR_TRIAL_FROM).getTime();
}

// トレーナー歩合率 (50%)
export const TRAINER_RATE = 0.50;

// 営業歩合率
export const SALES_RATE = {
  individual: 0.10,  // 個人 10%
  corporate:  0.12,  // 法人 12%
} as const;

// 成約ボーナス（2026-11-30 までに体験を受けたお客さまの成約まで。12月からは無し）
export const CONTRACT_BONUS = {
  individual: 10_000,  // 個人 10,000円
  corporate:  25_000,  // 法人 25,000円
} as const;

/**
 * 成約ボーナスをやめる日（2026-11-19 尚樹「成約ボーナスいらん。12月からやめよ」）。
 * 体験の日（日本時間）がこの日より前なら今までどおり出し、この日以降は出さない。
 * 過去の月の明細は変わらない。営業のごほうびは「入会させたお客さまの売上の10%（法人12%）がずっと」に一本化。
 */
export const CONTRACT_BONUS_END = "2026-12-01";

/** その体験の成約ボーナス（体験の日が CONTRACT_BONUS_END 以降なら 0） */
export function contractBonusFor(customerType: "individual" | "corporate", trialScheduledAt: string): number {
  const jstDate = new Date(new Date(trialScheduledAt).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  if (jstDate >= CONTRACT_BONUS_END) return 0;
  return CONTRACT_BONUS[customerType];
}

/** コースからレッスン単価を返す（未登録は 0） */
export function getLessonFee(course: string | undefined | null): number {
  if (!course) return 0;
  return LESSON_PRICE[course] ?? 0;
}

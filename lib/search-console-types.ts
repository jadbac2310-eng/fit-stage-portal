/**
 * サーチコンソールの型と、画面側でも使う絞り込み。
 *
 * API を叩く側（lib/search-console.ts）と分けてある。
 * 一緒にすると、画面が Google 認証ライブラリまで抱え込んでしまい、
 * スマホに送るデータが一気に増える（ビルドも通らない）。
 */

export interface SearchRow {
  /** キーワード または ページURL */
  key:         string;
  clicks:      number;
  impressions: number;
  /** クリック率（%） */
  ctr:         number;
  /** 平均掲載順位 */
  position:    number;
}

export interface SearchTotals {
  clicks:      number;
  impressions: number;
  ctr:         number;
  position:    number;
}

export interface SearchPeriod {
  /** 実際に集計した期間（サーチコンソールは数日遅れるので、画面に出して誤解を防ぐ） */
  from: string;
  to:   string;
}

export interface SearchDailyRow {
  /** MM/DD */
  date:        string;
  clicks:      number;
  impressions: number;
}

export interface SearchOverview {
  period:     SearchPeriod;
  /** どのサイトの数字か（www あり/なしの取り違えに気付けるように画面へ出す） */
  site?:      string;
  totals:     SearchTotals;
  prevTotals: SearchTotals;
  queries:    SearchRow[];
  pages:      SearchRow[];
  daily:      SearchDailyRow[];
  /** 読めなかったときの理由（権限不足など）。画面にそのまま出して直せるようにする */
  error?:     string;
}


/**
 * あと一歩のキーワード。
 *
 * 11〜20位は「2ページ目」。表示はされているのにほとんどクリックされない。
 * ここを10位以内に押し上げるのが、いちばん費用対効果が高い。
 * 表示回数が少なすぎるものは直しても効かないので下限を置く。
 */
export const ALMOST_FROM = 10.5;
export const ALMOST_TO   = 20.5;
const ALMOST_MIN_IMPRESSIONS = 10;

export function almostThere(rows: SearchRow[], minImpressions = ALMOST_MIN_IMPRESSIONS): SearchRow[] {
  return rows
    .filter((r) => r.position >= ALMOST_FROM && r.position <= ALMOST_TO && r.impressions >= minImpressions)
    .sort((a, b) => b.impressions - a.impressions);
}

/**
 * 表示はされているのにクリックされていないキーワード。
 *
 * 10位以内に入っているのにクリック率が低いのは、順位ではなく
 * タイトルや説明文が読まれていないということ。書き換えれば今日から効く。
 */
export const WEAK_CTR = 2;
const WEAK_MIN_IMPRESSIONS = 20;

export function weakCtr(rows: SearchRow[], minImpressions = WEAK_MIN_IMPRESSIONS): SearchRow[] {
  return rows
    .filter((r) => r.position <= ALMOST_FROM && r.impressions >= minImpressions && r.ctr < WEAK_CTR)
    .sort((a, b) => b.impressions - a.impressions);
}

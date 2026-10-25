/**
 * ブラウザに送るレッスンを「選べる月のぶん」だけに絞る。
 *
 * 歩合・明細の画面は月を選んで1か月ぶんを見るもので、選択肢は直近12か月しかない。
 * なのに開くたびに開業からの全レッスンを端末へ送っていた。
 * 件数が増えるほど、画面が出るまでの待ちと通信量がそのまま増えていく。
 *
 * 余白を1か月足してあるのは、請求の締日が月初でない契約で、
 * 12か月目のぶんを数えるのに前月のレッスンが要ることがあるため。
 */

/** 直近12か月を選べる画面に渡す範囲（余白1か月を含む） */
export const SELECTABLE_MONTHS = 12;

/** その月の1日（YYYY-MM-01）。これ以降のものだけ残す */
export function monthsAgoStart(now: Date, months: number): string {
  const d = new Date(now.getFullYear(), now.getMonth() - months, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * 日付が「直近 months か月」に入るものだけ残す。
 *
 * 日付は ISO 文字列の先頭10文字を文字列のまま比べる（件数ぶん Date を作らずに済む）。
 * 保存はUTCなので日本時間とは最大9時間ずれるが、上の余白1か月が吸収する。
 * ここは「送る量を減らすためのざっくりした線引き」で、
 * 何月ぶんとして数えるかは今までどおり各画面の計算が決める。
 */
export function withinRecentMonths<T>(
  rows: T[],
  dateOf: (row: T) => string | undefined,
  months: number = SELECTABLE_MONTHS,
  now: Date = new Date(),
): T[] {
  const from = monthsAgoStart(now, months);
  return rows.filter((r) => {
    const iso = dateOf(r);
    return iso != null && iso.slice(0, 10) >= from;
  });
}

/**
 * その月のぶんを計算するのに最低限いる、いちばん古い日（YYYY-MM-DD）。
 *
 * 請求の締日が月初でない契約があるので、前月ぶんも読めるように1か月さかのぼる。
 * 「2026-10」→「2026-09-01」。
 */
export function monthReadStart(month: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return "1970-01-01";
  const d = new Date(Number(m[1]), Number(m[2]) - 1 - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

/** 直近12か月を見る画面が読むべき、いちばん古い日（余白1か月を含む） */
export function recentReadStart(now: Date = new Date()): string {
  return monthsAgoStart(now, SELECTABLE_MONTHS);
}

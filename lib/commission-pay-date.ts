/**
 * コミッションの支払日。
 *
 * 月末じめの翌月払い。支払日は人によって違う（杉元さんは15日、ほかは25日）ので、
 * 担当者ごとに持たせる。未設定は既定の25日。
 *
 * 明細に「いつ振り込むか」を出すためだけでなく、
 * 「来月15日に払うぶんから引く」という前払いの差し引きを、
 * どの対象月に付けるか迷わないようにするためにも使う。
 */

export const DEFAULT_COMMISSION_PAY_DAY = 25;

/** 1〜31 に収める。おかしな値が入っていても既定に寄せる */
export function normalizePayDay(day?: number | null): number {
  if (day == null || !Number.isFinite(day)) return DEFAULT_COMMISSION_PAY_DAY;
  const n = Math.trunc(day);
  if (n < 1 || n > 31) return DEFAULT_COMMISSION_PAY_DAY;
  return n;
}

function lastDayOfMonth(year: number, month1to12: number): number {
  return new Date(year, month1to12, 0).getDate();
}

/**
 * 対象月（YYYY-MM）のコミッションを振り込む日を返す（YYYY-MM-DD）。
 *
 * 翌月の指定日。31日払いで2月のように日が足りない月は、その月の末日にする。
 */
export function commissionPayDate(month: string, payDay?: number | null): string {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return "";
  const year = Number(m[1]);
  const mon  = Number(m[2]);
  // 翌月（12月なら翌年1月）
  const payYear = mon === 12 ? year + 1 : year;
  const payMon  = mon === 12 ? 1 : mon + 1;
  const day = Math.min(normalizePayDay(payDay), lastDayOfMonth(payYear, payMon));
  return `${payYear}-${String(payMon).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** 「2026年11月15日」 */
export function payDateLabel(month: string, payDay?: number | null): string {
  const iso = commissionPayDate(month, payDay);
  if (!iso) return "";
  const [y, mm, dd] = iso.split("-");
  return `${y}年${Number(mm)}月${Number(dd)}日`;
}

/** 「11/15」。一覧のように狭いところ用 */
export function payDateShort(month: string, payDay?: number | null): string {
  const iso = commissionPayDate(month, payDay);
  if (!iso) return "";
  const [, mm, dd] = iso.split("-");
  return `${Number(mm)}/${Number(dd)}`;
}

/**
 * 画面の案内文。「翌月25日払い」。
 *
 * 人によって違うので、既定と違う人がいればその人の名前を添える。
 * 「25日だと思って振り込んだら杉元さんだけ遅れていた」を防ぐため。
 */
export function payDayNotice(
  members: { name: string; commissionPayDay?: number }[],
  /** 自分の分だけ見ている人（管理者でない人）には、自分の支払日だけ出す */
  self?: { name: string; commissionPayDay?: number } | null,
): string {
  if (self) return `月末じめ 翌月${normalizePayDay(self.commissionPayDay)}日払い`;

  const counts = new Map<number, string[]>();
  for (const m of members) {
    const d = normalizePayDay(m.commissionPayDay);
    const arr = counts.get(d);
    if (arr) arr.push(m.name);
    else counts.set(d, [m.name]);
  }
  if (counts.size === 0) return `月末じめ 翌月${DEFAULT_COMMISSION_PAY_DAY}日払い`;

  // いちばん人数の多い支払日を「ふつう」とし、それ以外を例外として名前で出す
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1].length - a[1].length || a[0] - b[0]);
  const [mainDay] = sorted[0];
  const exceptions = sorted.slice(1).map(([d, names]) => `${names.join("・")}は${d}日`);
  const base = `月末じめ 翌月${mainDay}日払い`;
  return exceptions.length > 0 ? `${base}（${exceptions.join("／")}）` : base;
}

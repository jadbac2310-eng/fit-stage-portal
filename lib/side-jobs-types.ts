// 単発の仕事（マシン設置などの請負）の型と、DBに触らない計算だけ。
// クライアントコンポーネントからも読むので、ここでは supabase を import しない。

export interface SideJob {
  id:        string;
  doneOn:    string;   // YYYY-MM-DD。この日付の属する月で集計する
  title:     string;
  client?:   string;
  amount:    number;   // いただいた金額（税込）＝売上
  cost:      number;   // 外注先に払う金額（税込）＝外注費
  vendor?:   string;
  note?:     string;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
}

/** 入力を楽にするための候補 */
export const SIDE_JOB_TITLES = ["マシン設置", "ホームジム設営", "オフィスジム導入", "イベント・講習", "その他"] as const;
export const SIDE_JOB_VENDORS = ["アヴニール"] as const;

/** 選択月（YYYY-MM）の単発の仕事だけを取り出す */
export function sideJobsInMonth(jobs: SideJob[], month: string): SideJob[] {
  return jobs.filter((j) => j.doneOn.slice(0, 7) === month);
}

/** 選択月の売上（いただいた金額）と外注費の合計 */
export function sideJobTotals(jobs: SideJob[], month: string): { revenue: number; cost: number } {
  return sideJobsInMonth(jobs, month).reduce(
    (s, j) => ({ revenue: s.revenue + j.amount, cost: s.cost + j.cost }),
    { revenue: 0, cost: 0 },
  );
}

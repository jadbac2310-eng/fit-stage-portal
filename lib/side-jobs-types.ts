// 単発の仕事（マシン設置などの請負）の型と、DBに触らない計算だけ。
// クライアントコンポーネントからも読むので、ここでは supabase を import しない。

import { paymentFee, type FeeablePayment } from "./payment-fees";

export interface SideJob {
  id:        string;
  doneOn:    string;   // YYYY-MM-DD。この日付の属する月で集計する
  title:     string;
  client?:   string;
  amount:    number;   // いただいた金額（税込）＝売上
  cost:      number;   // 外注先に払う金額（税込）＝外注費
  vendor?:   string;
  /** 受け取り方（入金の記録と同じ PAYMENT_METHODS）。カード・PayPayなら決済手数料がかかる */
  payMethod?: string;
  /** 入金日（YYYY-MM-DD）。空なら doneOn。決済手数料はこの日の月で引く（入金の記録と同じ考え方） */
  paidOn?:   string;
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

/** この仕事の決済手数料（円）。現金・振込なら 0 */
export function sideJobFee(j: Pick<SideJob, "amount" | "payMethod">): number {
  return paymentFee(j.amount, j.payMethod);
}

/**
 * 単発の仕事を「入金」の形にする。決済手数料（feeTotal）を入金の記録と同じ関数で出すため。
 * 手数料のかからない受け取り方も含めて返す（feeTotal 側で 0 になる）。
 */
export function sideJobPayments(jobs: SideJob[]): FeeablePayment[] {
  return jobs
    .filter((j) => j.payMethod)
    .map((j) => ({ amount: j.amount, method: j.payMethod, paidAt: j.paidOn ?? j.doneOn }));
}

/** 選択月の売上（いただいた金額）と外注費の合計 */
export function sideJobTotals(jobs: SideJob[], month: string): { revenue: number; cost: number } {
  return sideJobsInMonth(jobs, month).reduce(
    (s, j) => ({ revenue: s.revenue + j.amount, cost: s.cost + j.cost }),
    { revenue: 0, cost: 0 },
  );
}

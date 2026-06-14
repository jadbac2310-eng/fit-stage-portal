export type PlanPaymentType = "monthly" | "session_pass" | "single";

export const PLAN_PAYMENT_TYPE_LABEL: Record<PlanPaymentType, string> = {
  monthly:      "月額プラン",
  session_pass: "回数券",
  single:       "都度",
};

export interface PlanMaster {
  id: string;
  name: string;              // コース名（例: 月4回）。レッスンのコース名と一致する
  paymentType: PlanPaymentType;
  sessions: number;          // 単価算出の分母（月プラン=月回数 / 回数券・都度=1）
  amount: number;            // 標準金額。月プラン=月額総額 / 回数券・都度=1回単価
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** 標準の1回あたり単価（amount ÷ sessions） */
export function planUnitPrice(p: Pick<PlanMaster, "amount" | "sessions">): number {
  return p.sessions > 0 ? Math.round(p.amount / p.sessions) : 0;
}

/** コース名 → 1回単価 のマップを作る（コミッション計算のフォールバックに使用） */
export function buildLessonFeeMap(plans: PlanMaster[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const p of plans) map[p.name] = planUnitPrice(p);
  return map;
}

// ─── 回数券の標準金額（人数 × 回数 → 金額） ──────────────
export interface SessionPassPrice {
  id: string;
  personCount: number;
  totalCount: number;
  amount: number;            // 標準金額（総額）。1回単価 = amount ÷ totalCount
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** { 人数: { 回数: 金額 } } のネストマップを作る（回数券フォームのデフォルト入力に使用） */
export function buildSessionPassPriceMap(
  rows: SessionPassPrice[]
): Record<number, Record<number, number>> {
  const map: Record<number, Record<number, number>> = {};
  for (const r of rows) {
    (map[r.personCount] ??= {})[r.totalCount] = r.amount;
  }
  return map;
}

// 経費の型と、DBに触らない計算だけ。
// クライアントコンポーネントからも読むので、ここでは supabase を import しない。

export interface Expense {
  id:         string;
  incurredOn: string;   // YYYY-MM-DD。この日付の属する月で集計する
  category:   string;
  title:      string;
  amount:     number;
  note?:      string;
  createdById?: string;
  createdAt:  string;
  updatedAt:  string;
}

/** 入力を楽にするための候補 */
export const EXPENSE_CATEGORIES = [
  "家賃", "広告費", "備品・消耗品", "通信費", "水道光熱費", "交通費", "外注費", "その他",
] as const;

/** 選択月（YYYY-MM）の経費だけを取り出す。incurredOn はJSTで入力された日付として扱う */
export function expensesInMonth(expenses: Expense[], month: string): Expense[] {
  return expenses.filter((e) => e.incurredOn.slice(0, 7) === month);
}

/** 選択月の経費合計 */
export function expenseTotal(expenses: Expense[], month: string): number {
  return expensesInMonth(expenses, month).reduce((s, e) => s + e.amount, 0);
}

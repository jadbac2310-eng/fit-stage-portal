/**
 * スケジュール画面の「今月のレッスン件数」集計。
 * 画面から切り出した純粋関数（描画に依存しないので単体で検証できる）。
 */

/** 集計に必要な最小限のスケジュール項目（ScheduleItem がそのまま渡せる） */
export interface TallyItem {
  type: "regular" | "trial" | "personal" | "hourly";
  status: "scheduled" | "completed" | "cancelled" | "cancelled_same_day";
  scheduledAt: string;
  trainerId?: string;
  trainerName?: string;
  customerId?: string;
  customerName: string;
}

export type TallyBy = "trainer" | "customer";

export interface LessonTally {
  key: string;
  name: string;
  /** 実施済み（完了＋当日キャンセル） */
  done: number;
  /** これから実施する予定 */
  scheduled: number;
}

/** JST固定の "YYYY-MM"（サーバ=UTC・クライアント=JST で月がズレるのを防ぐ） */
export function monthKey(iso: string): string {
  const jst = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000);
  return `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * 指定月のレッスン件数を担当トレーナー別／顧客別に数える。
 * - 通常レッスンと体験レッスンのみ（個人予定・業務は稼働件数ではないので対象外）
 * - 白紙キャンセルは数えない。当日キャンセルは売上・歩合と同じく「実施」扱い
 * - 件数の多い順。同数なら名前順
 */
export function tallyLessons(items: TallyItem[], month: string, by: TallyBy): LessonTally[] {
  const map = new Map<string, LessonTally>();

  for (const it of items) {
    if (it.type !== "regular" && it.type !== "trial") continue;
    if (it.status === "cancelled") continue;
    if (monthKey(it.scheduledAt) !== month) continue;

    const key = (by === "trainer" ? it.trainerId : it.customerId) ?? "__unassigned__";
    const name = (by === "trainer" ? it.trainerName : it.customerName)
      || (by === "trainer" ? "担当未設定" : "（顧客不明）");

    const row = map.get(key) ?? { key, name, done: 0, scheduled: 0 };
    if (it.status === "completed" || it.status === "cancelled_same_day") row.done++;
    else row.scheduled++;
    map.set(key, row);
  }

  return Array.from(map.values()).sort(
    (a, b) => (b.done + b.scheduled) - (a.done + a.scheduled) || a.name.localeCompare(b.name, "ja"),
  );
}

/**
 * 全担当者・全顧客を合わせた合計（by に関係なく同じ値になる）。
 * total は実施済み＋予定＝その月のレッスン件数そのもの。
 */
export function tallyTotal(rows: LessonTally[]): { done: number; scheduled: number; total: number } {
  const sum = rows.reduce(
    (s, r) => ({ done: s.done + r.done, scheduled: s.scheduled + r.scheduled }),
    { done: 0, scheduled: 0 },
  );
  return { ...sum, total: sum.done + sum.scheduled };
}

/** 1行分の合計件数（実施済み＋予定） */
export function tallyRowTotal(row: LessonTally): number {
  return row.done + row.scheduled;
}

/**
 * 指定メンバーが担当する、その月のレッスン件数。
 * 担当が1件も無い月でも 0件の行を返す（見出しの数字を必ず出せるようにするため）。
 */
export function tallyForMember(items: TallyItem[], month: string, memberId: string): LessonTally {
  const found = tallyLessons(items, month, "trainer").find((r) => r.key === memberId);
  return found ?? { key: memberId, name: "", done: 0, scheduled: 0 };
}

/** 指定キーの行を先頭に移動する（自分の行を最初に見せるのに使う） */
export function pinTallyRow(rows: LessonTally[], key?: string): LessonTally[] {
  if (!key) return rows;
  const i = rows.findIndex((r) => r.key === key);
  return i <= 0 ? rows : [rows[i], ...rows.slice(0, i), ...rows.slice(i + 1)];
}

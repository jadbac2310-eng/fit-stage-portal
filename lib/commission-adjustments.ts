import { createAdminClient, fetchAllRows } from "./supabase";
import { currentMemberId, isMissingAuthorColumn } from "./audit";
import { ActionError } from "./action-result";
import type { CommissionAdjustment } from "./commission-adjustments-types";

export type { CommissionAdjustment } from "./commission-adjustments-types";
export { ADJUSTMENT_PRESETS, adjustmentTotalOf, adjustmentsFor, overDeducted } from "./commission-adjustments-types";

type DbRow = {
  id:         string;
  member_id:  string;
  month:      string;
  label:      string;
  amount:     number;
  note:       string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  members?:   { name: string } | null;
};

function fromDb(row: DbRow): CommissionAdjustment {
  return {
    id:          row.id,
    memberId:    row.member_id,
    memberName:  row.members?.name ?? undefined,
    month:       row.month,
    label:       row.label,
    amount:      row.amount,
    note:        row.note ?? undefined,
    createdById: row.created_by ?? undefined,
    updatedById: row.updated_by ?? undefined,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  };
}

// テーブル未作成（SQL未適用）でも歩合・明細の画面を落とさないための判定
function isMissingTable(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return err.code === "42P01" || err.code === "PGRST205"
    || /commission_adjustments|does not exist|could not find the table/i.test(err.message ?? "");
}

/**
 * 表が無い（または Supabase がまだ見つけられない）ときに出す文言。
 *
 * 「処理に失敗しました（コード: PGRST205）」だけだと、尚樹が何をすればいいか分からない。
 * 読むだけの画面は空で通すが、登録しようとしたときははっきり理由を出す。
 */
const MISSING_TABLE_MESSAGE =
  "「前払い・差し引き」の置き場所がまだデータベースにありません。"
  + "Supabase の SQL Editor で 20261024000002_commission_adjustments.sql を流してください"
  + "（流したのにこれが出る場合は、同じ画面で notify pgrst, 'reload schema'; だけ実行してください）";

const SELECT = "*, members(name)";

export async function getCommissionAdjustments(): Promise<CommissionAdjustment[]> {
  const client = createAdminClient();
  // 1000行ずつ全件読む。id を並び順の最後に足して、ページの境目で行がぶれないようにする
  const read = (select: string) => fetchAllRows((from, to) => client
    .from("commission_adjustments")
    .select(select)
    .order("month", { ascending: false })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .range(from, to));
  let { data, error } = await read(SELECT);
  // members への JOIN が解決できない環境でも、担当者名だけ空で描画は続ける
  if (error && !isMissingTable(error)) ({ data, error } = await read("*"));
  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
  return (data as unknown as DbRow[]).map(fromDb);
}

export async function addCommissionAdjustment(input: {
  memberId: string;
  month:    string;
  label:    string;
  amount:   number;
  note?:    string | null;
}): Promise<void> {
  const client = createAdminClient();
  const base = {
    member_id: input.memberId,
    month:     input.month,
    label:     input.label,
    amount:    input.amount,
    note:      input.note ?? null,
  };
  const creator = (await currentMemberId()) ?? null;
  let { error } = await client.from("commission_adjustments")
    .insert({ ...base, created_by: creator, updated_by: creator });
  if (error && isMissingAuthorColumn(error)) {
    ({ error } = await client.from("commission_adjustments").insert(base));
  }
  if (error && isMissingTable(error)) throw new ActionError(MISSING_TABLE_MESSAGE);
  if (error) throw error;
}

export async function updateCommissionAdjustment(
  id: string,
  input: Partial<{ memberId: string; month: string; label: string; amount: number; note: string | null }>,
): Promise<void> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.memberId !== undefined) patch.member_id = input.memberId;
  if (input.month    !== undefined) patch.month     = input.month;
  if (input.label    !== undefined) patch.label     = input.label;
  if (input.amount   !== undefined) patch.amount    = input.amount;
  if ("note" in input)              patch.note      = input.note ?? null;
  patch.updated_by = (await currentMemberId()) ?? null;

  const client = createAdminClient();
  let { error } = await client.from("commission_adjustments").update(patch).eq("id", id);
  if (error && isMissingAuthorColumn(error)) {
    const { updated_by, ...rest } = patch;
    void updated_by;
    ({ error } = await client.from("commission_adjustments").update(rest).eq("id", id));
  }
  if (error && isMissingTable(error)) throw new ActionError(MISSING_TABLE_MESSAGE);
  if (error) throw error;
}

export async function deleteCommissionAdjustment(id: string): Promise<void> {
  const { error } = await createAdminClient()
    .from("commission_adjustments").delete().eq("id", id);
  if (error && isMissingTable(error)) throw new ActionError(MISSING_TABLE_MESSAGE);
  if (error) throw error;
}

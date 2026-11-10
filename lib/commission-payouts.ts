import { createAdminClient } from "./supabase";
import { currentMemberId } from "./audit";
import type { CommissionPayout, PayoutStep } from "./commission-payouts-types";

export type { CommissionPayout, PayoutStep, PayoutTodo } from "./commission-payouts-types";

type DbRow = { member_id: string; month: string; statement_sent_at: string | null; paid_at: string | null };

/** 表がまだ無い（SQLを流していない）ときのエラーかどうか */
function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42P01" || error.code === "PGRST205" || /commission_payouts/.test(error.message ?? "") && /not (exist|find)|does not exist|schema cache/i.test(error.message ?? "");
}

/**
 * その月の「済んだか」を読む。
 * ready=false は、表がまだ無いとき（SQL未反映）。画面は印を付けられない旨を出し、知らせは全員「まだ」として扱う。
 */
export async function getCommissionPayouts(month: string): Promise<{ rows: CommissionPayout[]; ready: boolean }> {
  try {
    const { data, error } = await createAdminClient()
      .from("commission_payouts")
      .select("member_id, month, statement_sent_at, paid_at")
      .eq("month", month);
    if (error) return { rows: [], ready: !isMissingTable(error) };
    return {
      ready: true,
      rows: ((data ?? []) as DbRow[]).map((r) => ({
        memberId: r.member_id, month: r.month,
        statementSentAt: r.statement_sent_at ?? undefined, paidAt: r.paid_at ?? undefined,
      })),
    };
  } catch {
    return { rows: [], ready: false };
  }
}

/** 印を付ける／外す。付けた時刻を残す */
export async function setCommissionPayoutStep(memberId: string, month: string, step: PayoutStep, done: boolean): Promise<void> {
  const now = new Date().toISOString();
  const column = step === "statement" ? "statement_sent_at" : "paid_at";
  const by = await currentMemberId().catch(() => null);
  const { error } = await createAdminClient()
    .from("commission_payouts")
    .upsert({ member_id: memberId, month, [column]: done ? now : null, updated_by: by ?? null, updated_at: now }, { onConflict: "member_id,month" });
  if (error) {
    throw new Error(isMissingTable(error)
      ? "記録する表がまだありません。SQL（20261110000001_commission_payouts.sql）を Supabase で流してください"
      : error.message);
  }
}

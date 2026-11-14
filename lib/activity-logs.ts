import { createAdminClient } from "./supabase";
import { getCurrentMember } from "./members";

export interface ActivityLog {
  id:         string;
  memberId?:  string;
  memberName?: string;
  action:     string;
  entityType?: string;
  entityId?:  string;
  summary?:   string;
  ip?:        string;
  userAgent?: string;
  createdAt:  string;
}

type DbRow = {
  id:          string;
  member_id:   string | null;
  member_name: string | null;
  action:      string;
  entity_type: string | null;
  entity_id:   string | null;
  summary:     string | null;
  ip:          string | null;
  user_agent:  string | null;
  created_at:  string;
};

function fromDb(row: DbRow): ActivityLog {
  return {
    id:         row.id,
    memberId:   row.member_id ?? undefined,
    memberName: row.member_name ?? undefined,
    action:     row.action,
    entityType: row.entity_type ?? undefined,
    entityId:   row.entity_id ?? undefined,
    summary:    row.summary ?? undefined,
    ip:         row.ip ?? undefined,
    userAgent:  row.user_agent ?? undefined,
    createdAt:  row.created_at,
  };
}

/**
 * 操作を記録する。記録の失敗で本処理を止めないよう、例外は握りつぶす。
 * memberId/memberName を渡さない場合は現在のログインユーザーを解決する。
 */
export async function logActivity(input: {
  action:      string;
  entityType?: string;
  entityId?:   string;
  summary?:    string;
  memberId?:   string;
  memberName?: string;
  ip?:         string;
  userAgent?:  string;
}): Promise<void> {
  try {
    let { memberId, memberName } = input;
    if (!memberId) {
      const m = await getCurrentMember();
      memberId = m?.id;
      memberName = m?.name;
    }
    await createAdminClient().from("activity_logs").insert({
      member_id:   memberId ?? null,
      member_name: memberName ?? null,
      action:      input.action,
      entity_type: input.entityType ?? null,
      entity_id:   input.entityId ?? null,
      summary:     input.summary ?? null,
      ip:          input.ip ?? null,
      user_agent:  input.userAgent ?? null,
    });
  } catch {
    // ログ記録の失敗は無視（テーブル未作成・権限など）
  }
}

export async function getActivityLogs(opts?: { memberId?: string; limit?: number }): Promise<ActivityLog[]> {
  try {
    let q = createAdminClient()
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(opts?.limit ?? 300);
    if (opts?.memberId) q = q.eq("member_id", opts.memberId);
    const { data, error } = await q;
    if (error) return [];
    return (data as DbRow[]).map(fromDb);
  } catch {
    return [];
  }
}

/** 体験レッスンの「ご予約確定」メールを送った記録の種類（activity_logs.entity_type） */
export const TRIAL_CONFIRM_MAIL_ENTITY = "trial_confirm_mail";
/** お客様が確定メールの「予約を確認しました」を押した記録（2026-11-14〜） */
export const TRIAL_CONFIRMED_ENTITY = "trial_confirmed";

/** 確認した予約の日時を「11/27(金) 11:30」の形で（日時を変えたあとの確認と見分けるため、記録の文に入れる） */
export function trialSlotKey(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  const wd = ["日", "月", "火", "水", "木", "金", "土"][d.getUTCDay()];
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${wd}) ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

/** お客様が予約を確認した、を記録する（お客様はログインしていないので担当者は空） */
export async function recordTrialConfirmed(trialId: string, customerName: string, scheduledAt: string, userAgent?: string): Promise<boolean> {
  try {
    const { error } = await createAdminClient().from("activity_logs").insert({
      member_id: null, member_name: null,
      action: "update", entity_type: TRIAL_CONFIRMED_ENTITY, entity_id: trialId,
      summary: `お客様が予約を確認: ${customerName} 様（${trialSlotKey(scheduledAt)}）`,
      user_agent: userAgent?.slice(0, 300) ?? null,
    });
    return !error;
  } catch {
    return false;
  }
}

/**
 * 体験ごとに、お客様が最後に「予約を確認しました」を押した日時と、そのときの予約の日時（trialSlotKey）。
 * 一覧の「✓ 確認済」と、前日の「まだ確認が取れていない人」の知らせに使う。
 */
export async function getTrialConfirmations(): Promise<Record<string, { at: string; slot: string }>> {
  try {
    const { data, error } = await createAdminClient()
      .from("activity_logs")
      .select("entity_id, summary, created_at")
      .eq("entity_type", TRIAL_CONFIRMED_ENTITY)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error || !data) return {};
    const out: Record<string, { at: string; slot: string }> = {};
    for (const r of data as { entity_id: string | null; summary: string | null; created_at: string }[]) {
      if (!r.entity_id || out[r.entity_id]) continue;
      const slot = r.summary?.match(/（([^（）]+)）$/)?.[1] ?? "";
      out[r.entity_id] = { at: r.created_at, slot };
    }
    return out;
  } catch {
    return {};
  }
}

/** いまの予約の日時について確認が取れているか（日時を変える前の確認は数えない） */
export function isTrialConfirmed(c: { slot: string } | undefined, scheduledAt: string): boolean {
  return !!c && c.slot === trialSlotKey(scheduledAt);
}

/**
 * 体験レッスンごとに、確定メールを最後に送った日時と送った人。
 * 一覧で「送信済み 11/14 坂根」と出し、二重送信を防ぐために使う。
 */
export async function getTrialConfirmMailSent(): Promise<Record<string, { at: string; by?: string }>> {
  try {
    const { data, error } = await createAdminClient()
      .from("activity_logs")
      .select("entity_id, member_name, created_at")
      .eq("entity_type", TRIAL_CONFIRM_MAIL_ENTITY)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error || !data) return {};
    const out: Record<string, { at: string; by?: string }> = {};
    for (const r of data as { entity_id: string | null; member_name: string | null; created_at: string }[]) {
      if (r.entity_id && !out[r.entity_id]) out[r.entity_id] = { at: r.created_at, by: r.member_name ?? undefined };
    }
    return out;
  } catch {
    return {};
  }
}

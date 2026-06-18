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

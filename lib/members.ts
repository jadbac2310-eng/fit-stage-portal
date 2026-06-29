import { createAdminClient, createAuthClient } from "./supabase";

export interface Member {
  id: string;
  name: string;
  email?: string;
  role?: string;
  note?: string;
  avatarUrl?: string;
  authUserId?: string;
  isAdmin: boolean;
  commissionRate?: number; // トレーナー歩合率（％）。未設定は既定50%
  lineUserId?: string;
  lineLinkCode?: string;
  createdAt: string;
}

type DbRow = {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  note: string | null;
  avatar_url: string | null;
  auth_user_id: string | null;
  is_admin: boolean;
  commission_rate?: number | null;
  line_user_id?: string | null;
  line_link_code?: string | null;
  created_at: string;
};

function fromDb(row: DbRow): Member {
  return {
    id:         row.id,
    name:       row.name,
    email:      row.email        ?? undefined,
    role:       row.role         ?? undefined,
    note:       row.note         ?? undefined,
    avatarUrl:  row.avatar_url   ?? undefined,
    authUserId: row.auth_user_id ?? undefined,
    isAdmin:    row.is_admin,
    commissionRate: row.commission_rate ?? undefined,
    lineUserId:   row.line_user_id   ?? undefined,
    lineLinkCode: row.line_link_code ?? undefined,
    createdAt:  row.created_at,
  };
}

// line_user_id / line_link_code 列が未追加（マイグレーション未適用）でも落ちないための判定
function isMissingLineColumn(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return /line_user_id|line_link_code/i.test(err.message ?? "") || err.code === "PGRST204" || err.code === "42703";
}

export async function getMembers(): Promise<Member[]> {
  const { data, error } = await createAdminClient()
    .from("members")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  const members = (data as DbRow[]).map(fromDb);
  const president = members.filter((m) => m.role?.includes("社長"));
  const others    = members.filter((m) => !m.role?.includes("社長"));
  return [...president, ...others];
}

export async function getMember(id: string): Promise<Member | null> {
  const { data, error } = await createAdminClient()
    .from("members")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return fromDb(data as DbRow);
}

export async function getMemberByEmail(email: string): Promise<Member | null> {
  const { data, error } = await createAdminClient()
    .from("members")
    .select("*")
    .eq("email", email)
    .single();
  if (error || !data) return null;
  return fromDb(data as DbRow);
}

export async function addMember(
  data: Omit<Member, "id" | "createdAt">
): Promise<Member> {
  const { data: row, error } = await createAdminClient()
    .from("members")
    .insert({
      name:         data.name,
      email:        data.email      ?? null,
      role:         data.role       ?? null,
      note:         data.note       ?? null,
      avatar_url:   data.avatarUrl  ?? null,
      auth_user_id: data.authUserId ?? null,
      is_admin:     data.isAdmin,
      commission_rate: data.commissionRate ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return fromDb(row as DbRow);
}

export async function updateMember(
  id: string,
  data: Partial<Omit<Member, "id" | "createdAt" | "commissionRate">> & { commissionRate?: number | null }
): Promise<Member | null> {
  const patch: Record<string, unknown> = {};
  if (data.name       !== undefined) patch.name         = data.name;
  if (data.email      !== undefined) patch.email        = data.email      ?? null;
  if (data.role       !== undefined) patch.role         = data.role       ?? null;
  if (data.note       !== undefined) patch.note         = data.note       ?? null;
  if (data.avatarUrl  !== undefined) patch.avatar_url   = data.avatarUrl  ?? null;
  if (data.authUserId !== undefined) patch.auth_user_id = data.authUserId ?? null;
  if (data.isAdmin    !== undefined) patch.is_admin     = data.isAdmin;
  if (data.commissionRate !== undefined) patch.commission_rate = data.commissionRate ?? null;

  const { data: row, error } = await createAdminClient()
    .from("members")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return fromDb(row as DbRow);
}

export async function getMemberByAuthUserId(authUserId: string): Promise<Member | null> {
  // auth_user_id が万一重複していても落ちないよう、最初の1件を返す（.single() は複数件で例外）
  const { data, error } = await createAdminClient()
    .from("members")
    .select("*")
    .eq("auth_user_id", authUserId)
    .order("created_at", { ascending: true })
    .limit(1);
  if (error || !data || data.length === 0) return null;
  return fromDb(data[0] as DbRow);
}

export async function getCurrentMember(): Promise<Member | null> {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return getMemberByAuthUserId(user.id);
}

export async function getCurrentIsAdmin(): Promise<boolean> {
  const member = await getCurrentMember();
  return member?.isAdmin ?? false;
}

/** 管理者でなければ例外を投げる。変更系サーバーアクションのガードに使用 */
export async function requireAdmin(): Promise<void> {
  if (!(await getCurrentIsAdmin())) throw new Error("権限がありません（管理者のみ実行できます）");
}

// ─── LINE通知連携 ─────────────────────────────────────
const LINK_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 紛らわしい文字を除外
function genLinkCode(): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += LINK_CODE_CHARS[Math.floor(Math.random() * LINK_CODE_CHARS.length)];
  return s;
}

/** 連携コードから担当者を引く */
export async function getMemberByLinkCode(code: string): Promise<Member | null> {
  const { data, error } = await createAdminClient()
    .from("members").select("*").eq("line_link_code", code).limit(1);
  if (error || !data || data.length === 0) return null;
  return fromDb(data[0] as DbRow);
}

/** LINEユーザーIDから担当者を引く */
export async function getMemberByLineUserId(lineUserId: string): Promise<Member | null> {
  const { data, error } = await createAdminClient()
    .from("members").select("*").eq("line_user_id", lineUserId).limit(1);
  if (error || !data || data.length === 0) return null;
  return fromDb(data[0] as DbRow);
}

/** 担当者の連携コードを取得（無ければ生成して保存）。マイグレーション未適用なら null。 */
export async function ensureMemberLinkCode(id: string): Promise<string | null> {
  const member = await getMember(id);
  if (member?.lineLinkCode) return member.lineLinkCode;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = genLinkCode();
    const { error } = await createAdminClient().from("members").update({ line_link_code: code }).eq("id", id);
    if (!error) return code;
    if (isMissingLineColumn(error)) return null;          // 列未追加
    if (error.code !== "23505") throw error;               // 重複以外は致命的
  }
  return null;
}

/** 連携コードを再発行する */
export async function resetMemberLinkCode(id: string): Promise<string | null> {
  const { error } = await createAdminClient().from("members").update({ line_link_code: null }).eq("id", id);
  if (error && isMissingLineColumn(error)) return null;
  if (error) throw error;
  return ensureMemberLinkCode(id);
}

/** LINEユーザーIDを担当者に紐付け（null で連携解除） */
export async function setMemberLineUserId(id: string, lineUserId: string | null): Promise<boolean> {
  const { error } = await createAdminClient().from("members").update({ line_user_id: lineUserId }).eq("id", id);
  if (error) {
    if (isMissingLineColumn(error)) return false;
    throw error;
  }
  return true;
}

export async function deleteMember(id: string): Promise<void> {
  const { error } = await createAdminClient()
    .from("members")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

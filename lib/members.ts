import { createAdminClient, createAuthClient } from "./supabase";
import { ActionError } from "./action-result";
import { DEFAULT_COMMISSION_PAY_DAY, normalizePayDay } from "./commission-pay-date";

export interface Member {
  id: string;
  name: string;
  email?: string;
  role?: string;
  note?: string;
  avatarUrl?: string;
  authUserId?: string;
  isAdmin: boolean;
  /** 運営者本人。歩合の対象外にし、売上はまるごと利益に残す（利益＝オーナーの取り分） */
  isOwner: boolean;
  /** レッスン開始前のLINEリマインドを受け取るか（既定true） */
  lessonReminder: boolean;
  /** LINE通知そのものを受け取るか（既定true）。off にするとどの通知も送らない */
  lineNotify: boolean;
  commissionRate?: number; // トレーナー歩合率（％）。未設定は既定50%
  /** コミッションの支払日。月末じめ翌月のこの日に振り込む（杉元さんは15日、ほかは25日） */
  commissionPayDay?: number;
  invoiceNumber?: string;  // インボイス登録番号（コミッション明細に表示）
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
  is_owner?: boolean | null;
  lesson_reminder?: boolean | null;
  line_notify?: boolean | null;
  commission_rate?: number | null;
  commission_pay_day?: number | null;
  invoice_number?: string | null;
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
    isOwner:    row.is_owner ?? false,
    lessonReminder: row.lesson_reminder ?? true,
    lineNotify:     row.line_notify ?? true,
    commissionRate: row.commission_rate ?? undefined,
    commissionPayDay: row.commission_pay_day ?? undefined,
    invoiceNumber: row.invoice_number ?? undefined,
    lineUserId:   row.line_user_id   ?? undefined,
    lineLinkCode: row.line_link_code ?? undefined,
    createdAt:  row.created_at,
  };
}

// line_user_id / line_link_code 列が未追加（マイグレーション未適用）でも落ちないための判定。
// スキーマ関連エラーはメッセージに列名が出ないことがあるためコードでも判定する。
function isMissingLineColumn(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return /line_user_id|line_link_code/i.test(err.message ?? "") || err.code === "PGRST204" || err.code === "42703";
}

// commission_pay_day 列が未追加（マイグレーション未適用）でも担当者の登録・編集を止めないための判定
function isMissingPayDayColumn(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return /commission_pay_day/i.test(err.message ?? "") || err.code === "PGRST204" || err.code === "42703";
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
  const client = createAdminClient();
  const base = {
    name:         data.name,
    email:        data.email      ?? null,
    role:         data.role       ?? null,
    note:         data.note       ?? null,
    avatar_url:   data.avatarUrl  ?? null,
    auth_user_id: data.authUserId ?? null,
    is_admin:     data.isAdmin,
    commission_rate: data.commissionRate ?? null,
    invoice_number: data.invoiceNumber ?? null,
  };
  const payDay = { commission_pay_day: normalizePayDay(data.commissionPayDay ?? DEFAULT_COMMISSION_PAY_DAY) };
  let { data: row, error } = await client.from("members").insert({ ...base, ...payDay }).select().single();
  if (error && isMissingPayDayColumn(error)) {
    ({ data: row, error } = await client.from("members").insert(base).select().single());
  }
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
  if (data.isOwner    !== undefined) patch.is_owner     = data.isOwner;
  if (data.lessonReminder !== undefined) patch.lesson_reminder = data.lessonReminder;
  if (data.lineNotify     !== undefined) patch.line_notify     = data.lineNotify;
  if (data.commissionRate !== undefined) patch.commission_rate = data.commissionRate ?? null;
  if (data.commissionPayDay !== undefined) patch.commission_pay_day = normalizePayDay(data.commissionPayDay);
  if (data.invoiceNumber  !== undefined) patch.invoice_number  = data.invoiceNumber  ?? null;

  const client = createAdminClient();
  let { data: row, error } = await client.from("members").update(patch).eq("id", id).select().single();
  // line_notify 列が未適用の環境では、その列を外して再試行（担当者の編集自体は止めない）
  if (error && /line_notify/i.test(error.message ?? "")) {
    const { line_notify, ...rest } = patch;
    void line_notify;
    ({ data: row, error } = await client.from("members").update(rest).eq("id", id).select().single());
  }
  // commission_pay_day 列が未適用のときも同じく、その列だけ外して再試行
  if (error && isMissingPayDayColumn(error) && "commission_pay_day" in patch) {
    const { commission_pay_day, ...rest } = patch;
    void commission_pay_day;
    ({ data: row, error } = await client.from("members").update(rest).eq("id", id).select().single());
  }
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
  if (!(await getCurrentIsAdmin())) throw new ActionError("権限がありません（管理者のみ実行できます）");
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

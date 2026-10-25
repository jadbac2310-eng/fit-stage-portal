"use server";

import { revalidatePath } from "next/cache";
import { addMember, updateMember, deleteMember, getMember, getCurrentIsAdmin, getCurrentMember, requireAdmin } from "@/lib/members";
import { saveMemberAvatar, deleteMemberAvatar } from "@/lib/upload";
import { createAdminClient } from "@/lib/supabase";
import { logActivity } from "@/lib/activity-logs";
import { DEFAULT_COMMISSION_PAY_DAY, normalizePayDay } from "@/lib/commission-pay-date";
import { AVATAR_TYPES, AVATAR_MAX_SIZE } from "@/lib/upload";

/** 写真が保存できなかったときに、何が悪かったのか分かる文言にする */
function avatarFailureMessage(file: File): string {
  const mb = (file.size / 1024 / 1024).toFixed(1);
  if (!AVATAR_TYPES.includes(file.type)) {
    return `この写真の形式（${file.type || "不明"}）には対応していません。JPEG・PNG・WebP のいずれかを選んでください`;
  }
  if (file.size > AVATAR_MAX_SIZE) {
    return `写真が大きすぎます（${mb}MB）。5MB以下の写真を選んでください`;
  }
  return "写真を保存できませんでした。もう一度お試しください（何度も出る場合は別の写真でお試しください）";
}

/** 同じ場所に上書きしたか。上書きなら消してはいけない（消すと今入れた写真が消える） */
function sameStoragePath(oldUrl: string, newUrl: string): boolean {
  const strip = (u: string) => u.split("?")[0];
  return strip(oldUrl) === strip(newUrl);
}

/** コミッションの支払日（月末じめ翌月のこの日）。空欄や変な値は既定の25日に寄せる */
function readPayDay(formData: FormData): number {
  const raw = (formData.get("commissionPayDay") as string)?.trim();
  if (!raw) return DEFAULT_COMMISSION_PAY_DAY;
  return normalizePayDay(Number(raw));
}

export async function createMember(formData: FormData): Promise<{ error: string } | void> {
  await requireAdmin();
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;

  const email    = (formData.get("email")    as string)?.trim() || undefined;
  const role     = (formData.get("role")     as string)?.trim() || undefined;
  const note     = (formData.get("note")     as string)?.trim() || undefined;
  const invoiceNumber = (formData.get("invoiceNumber") as string)?.trim() || undefined;
  const commissionPayDay = readPayDay(formData);
  const password = (formData.get("password") as string)?.trim() || undefined;
  const callerIsAdmin = await getCurrentIsAdmin();
  const isAdmin = callerIsAdmin && formData.get("isAdmin") === "on";

  if (password && password.length < 6) {
    return { error: "パスワードは6文字以上で入力してください" };
  }

  const avatarFile = formData.get("avatar") as File | null;
  let avatarUrl: string | undefined;
  if (avatarFile && avatarFile.size > 0) {
    avatarUrl = (await saveMemberAvatar(avatarFile, crypto.randomUUID())) ?? undefined;
    // 保存できなかったときに黙って写真なしで登録すると、
    // 「何回やっても写真が付かない」のに理由が分からない状態になる
    if (!avatarUrl) return { error: avatarFailureMessage(avatarFile) };
  }

  let authUserId: string | undefined;
  if (email && password) {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (!error && data.user) {
      authUserId = data.user.id;
    } else if (error?.message?.includes("already been registered")) {
      // Auth user already exists — look up and link
      const { data: list } = await admin.auth.admin.listUsers();
      const existing = list?.users.find((u) => u.email === email);
      if (existing) authUserId = existing.id;
    } else if (error) {
      // 認証アカウントの作成に失敗したら担当者は作らず、エラーを返す
      return { error: `ログイン用アカウントの作成に失敗しました: ${error.message}` };
    }
  }

  const created = await addMember({ name, email, role, note, invoiceNumber, commissionPayDay, avatarUrl, authUserId, isAdmin, isOwner: false, lessonReminder: true, lineNotify: true });
  await logActivity({ action: "create", entityType: "member", entityId: created.id, summary: `担当者を追加: ${name}` });
  revalidatePath("/master/members");
}

export async function updateMemberAction(id: string, formData: FormData): Promise<{ error: string } | void> {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;

  const email       = (formData.get("email")    as string)?.trim() || undefined;
  const role        = (formData.get("role")     as string)?.trim() || undefined;
  const note        = (formData.get("note")     as string)?.trim() || undefined;
  const invoiceNumber = (formData.get("invoiceNumber") as string)?.trim() || undefined;
  const commissionPayDay = readPayDay(formData);
  const newPassword   = (formData.get("password") as string)?.trim() || undefined;
  const [existing, callerIsAdmin, currentMember] = await Promise.all([getMember(id), getCurrentIsAdmin(), getCurrentMember()]);
  if (!callerIsAdmin && currentMember?.id !== id) throw new Error("権限がありません");
  const isAdmin = callerIsAdmin ? formData.get("isAdmin") === "on" : existing?.isAdmin ?? false;
  // オーナー（歩合の対象外）の切り替えは管理者のみ
  const isOwner = callerIsAdmin ? formData.get("isOwner") === "on" : existing?.isOwner ?? false;
  // レッスンのリマインドは本人も切り替えられる（自分宛の通知なので）
  const lessonReminder = formData.get("lessonReminder") === "on";
  const lineNotify     = formData.get("lineNotify")     === "on";

  if (newPassword && newPassword.length < 6) {
    return { error: "パスワードは6文字以上で入力してください" };
  }

  const avatarFile = formData.get("avatar") as File | null;
  let avatarUrl: string | undefined;
  if (avatarFile && avatarFile.size > 0) {
    // 先に消すと、保存に失敗したときに元の写真まで無くなる。新しいのが入ってから消す
    avatarUrl = (await saveMemberAvatar(avatarFile, id)) ?? undefined;
    if (!avatarUrl) return { error: avatarFailureMessage(avatarFile) };
    if (existing?.avatarUrl && !sameStoragePath(existing.avatarUrl, avatarUrl)) {
      await deleteMemberAvatar(existing.avatarUrl);
    }
  }

  let authUserId = existing?.authUserId;
  if (newPassword) {
    const admin = createAdminClient();
    if (authUserId) {
      const { error } = await admin.auth.admin.updateUserById(authUserId, {
        ...(newPassword && { password: newPassword }),
        ...(email && { email }),
      });
      if (error) return { error: `ログイン用アカウントの更新に失敗しました: ${error.message}` };
    } else if (email) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: newPassword,
        email_confirm: true,
      });
      if (!error && data.user) {
        authUserId = data.user.id;
      } else if (error?.message?.includes("already been registered")) {
        const { data: list } = await admin.auth.admin.listUsers();
        const found = list?.users.find((u) => u.email === email);
        if (found) authUserId = found.id;
      } else if (error) {
        return { error: `ログイン用アカウントの作成に失敗しました: ${error.message}` };
      }
    }
  } else if (email && authUserId && email !== existing?.email) {
    const admin = createAdminClient();
    await admin.auth.admin.updateUserById(authUserId, { email });
  }

  await updateMember(id, {
    name,
    email,
    role,
    note,
    invoiceNumber,
    commissionPayDay,
    isAdmin,
    isOwner,
    lessonReminder,
    lineNotify,
    ...(avatarUrl  !== undefined && { avatarUrl }),
    ...(authUserId !== existing?.authUserId && { authUserId }),
  });
  await logActivity({ action: "update", entityType: "member", entityId: id, summary: `担当者を編集: ${name}` });
  revalidatePath("/master/members");
}

export async function deleteMemberAction(id: string) {
  if (!(await getCurrentIsAdmin())) throw new Error("権限がありません");
  const existing = await getMember(id);
  if (existing?.avatarUrl) await deleteMemberAvatar(existing.avatarUrl);
  if (existing?.authUserId) {
    await createAdminClient().auth.admin.deleteUser(existing.authUserId);
  }
  await deleteMember(id);
  await logActivity({ action: "delete", entityType: "member", entityId: id, summary: `担当者を削除: ${existing?.name ?? ""}` });
  revalidatePath("/master/members");
}

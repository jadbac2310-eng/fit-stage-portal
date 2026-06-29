"use server";

import { revalidatePath } from "next/cache";
import { addMember, updateMember, deleteMember, getMember, getCurrentIsAdmin, getCurrentMember, requireAdmin } from "@/lib/members";
import { saveMemberAvatar, deleteMemberAvatar } from "@/lib/upload";
import { createAdminClient } from "@/lib/supabase";
import { logActivity } from "@/lib/activity-logs";

export async function createMember(formData: FormData): Promise<{ error: string } | void> {
  await requireAdmin();
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;

  const email    = (formData.get("email")    as string)?.trim() || undefined;
  const role     = (formData.get("role")     as string)?.trim() || undefined;
  const note     = (formData.get("note")     as string)?.trim() || undefined;
  const password = (formData.get("password") as string)?.trim() || undefined;
  const callerIsAdmin = await getCurrentIsAdmin();
  const isAdmin = callerIsAdmin && formData.get("isAdmin") === "on";
  const crRaw = (formData.get("commissionRate") as string)?.trim();
  const commissionRate = crRaw ? parseInt(crRaw, 10) : undefined;

  if (password && password.length < 6) {
    return { error: "パスワードは6文字以上で入力してください" };
  }

  const avatarFile = formData.get("avatar") as File | null;
  let avatarUrl: string | undefined;
  if (avatarFile && avatarFile.size > 0) {
    avatarUrl = (await saveMemberAvatar(avatarFile, crypto.randomUUID())) ?? undefined;
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

  const created = await addMember({ name, email, role, note, avatarUrl, authUserId, isAdmin, commissionRate });
  await logActivity({ action: "create", entityType: "member", entityId: created.id, summary: `担当者を追加: ${name}` });
  revalidatePath("/master/members");
}

export async function updateMemberAction(id: string, formData: FormData): Promise<{ error: string } | void> {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;

  const email       = (formData.get("email")    as string)?.trim() || undefined;
  const role        = (formData.get("role")     as string)?.trim() || undefined;
  const note        = (formData.get("note")     as string)?.trim() || undefined;
  const newPassword   = (formData.get("password") as string)?.trim() || undefined;
  const [existing, callerIsAdmin, currentMember] = await Promise.all([getMember(id), getCurrentIsAdmin(), getCurrentMember()]);
  if (!callerIsAdmin && currentMember?.id !== id) throw new Error("権限がありません");
  const isAdmin = callerIsAdmin ? formData.get("isAdmin") === "on" : existing?.isAdmin ?? false;
  // 歩合は管理者のみ変更可。空欄なら null（既定50%に戻す）。
  const crRaw = (formData.get("commissionRate") as string)?.trim();
  const commissionRate = crRaw ? parseInt(crRaw, 10) : null;

  if (newPassword && newPassword.length < 6) {
    return { error: "パスワードは6文字以上で入力してください" };
  }

  const avatarFile = formData.get("avatar") as File | null;
  let avatarUrl: string | undefined;
  if (avatarFile && avatarFile.size > 0) {
    if (existing?.avatarUrl) await deleteMemberAvatar(existing.avatarUrl);
    avatarUrl = (await saveMemberAvatar(avatarFile, id)) ?? undefined;
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
    isAdmin,
    ...(callerIsAdmin && { commissionRate }),
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

"use server";

import { revalidatePath } from "next/cache";
import { addMember, updateMember, deleteMember, getMember, getCurrentIsAdmin, getCurrentMember } from "@/lib/members";
import { saveMemberAvatar, deleteMemberAvatar } from "@/lib/upload";
import { createAdminClient } from "@/lib/supabase";

export async function createMember(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;

  const email    = (formData.get("email")    as string)?.trim() || undefined;
  const role     = (formData.get("role")     as string)?.trim() || undefined;
  const note     = (formData.get("note")     as string)?.trim() || undefined;
  const password = (formData.get("password") as string)?.trim() || undefined;
  const callerIsAdmin = await getCurrentIsAdmin();
  const isAdmin = callerIsAdmin && formData.get("isAdmin") === "on";

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
    }
  }

  await addMember({ name, email, role, note, avatarUrl, authUserId, isAdmin });
  revalidatePath("/master/members");
}

export async function updateMemberAction(id: string, formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;

  const email       = (formData.get("email")    as string)?.trim() || undefined;
  const role        = (formData.get("role")     as string)?.trim() || undefined;
  const note        = (formData.get("note")     as string)?.trim() || undefined;
  const newPassword   = (formData.get("password") as string)?.trim() || undefined;
  const [existing, callerIsAdmin, currentMember] = await Promise.all([getMember(id), getCurrentIsAdmin(), getCurrentMember()]);
  if (!callerIsAdmin && currentMember?.id !== id) throw new Error("権限がありません");
  const isAdmin = callerIsAdmin ? formData.get("isAdmin") === "on" : existing?.isAdmin ?? false;

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
      await admin.auth.admin.updateUserById(authUserId, {
        ...(newPassword && { password: newPassword }),
        ...(email && { email }),
      });
    } else if (email) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: newPassword,
        email_confirm: true,
      });
      if (!error && data.user) authUserId = data.user.id;
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
    ...(avatarUrl  !== undefined && { avatarUrl }),
    ...(authUserId !== existing?.authUserId && { authUserId }),
  });
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
  revalidatePath("/master/members");
}

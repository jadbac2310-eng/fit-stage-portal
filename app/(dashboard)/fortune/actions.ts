"use server";

import { revalidatePath } from "next/cache";
import { getCurrentMember, updateMember } from "@/lib/members";
import { parseDate } from "@/lib/rokusei";
import { saveFortuneNote } from "@/lib/fortune-notes";

/** 自分の生年月日を入れる（星まわりを出すため）。本人だけ */
export async function setMyBirthDateAction(formData: FormData): Promise<{ error: string } | void> {
  const me = await getCurrentMember();
  if (!me) return { error: "ログインが必要です" };
  const raw = ((formData.get("birthDate") as string) ?? "").trim();
  if (!raw) {
    await updateMember(me.id, { birthDate: null });
  } else {
    const p = parseDate(raw);
    if (!p || p.y < 1900 || p.y > new Date().getFullYear()) return { error: "生年月日の形が違います" };
    await updateMember(me.id, { birthDate: raw.slice(0, 10) });
  }
  revalidatePath("/fortune");
  revalidatePath("/dashboard");
}

/** 代表からのひとこと（管理者だけ）。memberId が空なら全員へ */
export async function saveFortuneNoteAction(formData: FormData): Promise<{ error: string } | void> {
  const me = await getCurrentMember();
  if (!me?.isAdmin) return { error: "管理者だけが書けます" };
  const month = ((formData.get("month") as string) ?? "").trim();
  if (!/^\d{4}-\d{2}$/.test(month)) return { error: "月の形が違います" };
  const memberId = ((formData.get("memberId") as string) ?? "").trim() || null;
  const body = ((formData.get("body") as string) ?? "").slice(0, 400);
  try {
    await saveFortuneNote({ memberId, month, body, createdBy: me.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/fortune_notes/i.test(msg)) return { error: "ひとこと用の表がまだありません（SQL を流してください）" };
    return { error: `保存に失敗しました（${msg}）` };
  }
  revalidatePath("/fortune");
  revalidatePath("/dashboard");
}

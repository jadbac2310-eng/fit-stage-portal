"use server";

import { revalidatePath } from "next/cache";
import { getCurrentMember, updateMember } from "@/lib/members";
import { parseDate } from "@/lib/rokusei";

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

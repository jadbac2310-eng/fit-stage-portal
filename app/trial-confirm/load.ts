import { getTrialLesson } from "@/lib/trial-lessons";
import { getStores } from "@/lib/stores";
import { parseTrialNote } from "@/lib/trial-note";
import { verifyTrialConfirmToken } from "@/lib/trial-confirm-token";
import { findStore, jstSlotLabel } from "@/lib/trial-confirm-mail";
import { getTrialConfirmations, isTrialConfirmed } from "@/lib/activity-logs";
import type { TrialLesson } from "@/lib/trial-lessons-types";

/**
 * お客様用の確認ページ（/trial-confirm）で、リンクから予約を読む。
 * ページの表示と「確認しました」の記録（actions.ts）の両方が使う。
 */
export type TrialConfirmState =
  | { kind: "invalid" }                      // リンクが壊れている・予約が見つからない
  | { kind: "cancelled"; view: ConfirmView }
  | { kind: "changed"; view: ConfirmView }   // メールを送ったあとに日時が変わった
  | { kind: "past"; view: ConfirmView }
  | { kind: "done"; view: ConfirmView; lesson: TrialLesson }   // もう確認済み
  | { kind: "open"; view: ConfirmView; lesson: TrialLesson };  // これから確認する

/** 画面に出すもの（名前・日時・店舗だけ。連絡先などは出さない） */
export interface ConfirmView {
  name: string;
  slot: string;
  storeName?: string;
  address?: string;
  access?: string;
}

export async function loadTrialConfirm(token: string | undefined): Promise<TrialConfirmState> {
  const t = verifyTrialConfirmToken(token);
  if (!t) return { kind: "invalid" };
  const lesson = await getTrialLesson(t.trialId);
  if (!lesson) return { kind: "invalid" };

  const stores = await getStores().catch(() => []);
  const masterName = stores.find((s) => s.id === lesson.storeId)?.name;
  const wish = parseTrialNote(lesson.note).items.find((x) => x.label === "希望店舗")?.value;
  const store = findStore(masterName, wish, lesson.location);
  const view: ConfirmView = {
    name: lesson.customerName.trim().replace(/[\s　]+/g, " "),
    slot: jstSlotLabel(lesson.scheduledAt),
    storeName: store ? `FIT STAGE ${store.name}` : lesson.location?.trim() || undefined,
    address: store?.address,
    access: store?.access,
  };

  if (lesson.status === "cancelled") return { kind: "cancelled", view };
  if (new Date(lesson.scheduledAt).getTime() !== t.scheduledMs) return { kind: "changed", view };
  if (lesson.status === "completed" || new Date(lesson.scheduledAt).getTime() < Date.now()) return { kind: "past", view };
  const c = (await getTrialConfirmations())[lesson.id];
  if (isTrialConfirmed(c, lesson.scheduledAt)) return { kind: "done", view, lesson };
  return { kind: "open", view, lesson };
}

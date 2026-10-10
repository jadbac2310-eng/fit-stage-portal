import type { Member } from "./members";
import { scheduleLink } from "./line-login";
import { jstDateLabel, jstTimeStr, notifyAdminsByLine } from "./line-notify";

/**
 * 「誰かがレッスンを登録した」ことを管理者のLINEへ知らせる。
 *
 * トレーナーが自分でレッスンを入れるため、オーナーがポータルを開かないと
 * 予定が増えたことに気づけなかった。登録した本人には送らない。
 *
 * LINE公式アカウントの無料枠（月200通）を使うので、
 * 一括登録は何件でも1通にまとめる。止めたいときは LINE_NOTIFY_LESSON=off。
 */

export interface NotifiableLesson {
  customerName: string;
  scheduledAt: string;
  course?: string;
  trainerName?: string;
  location?: string;
}

/** 本文に出す日時の件数。これを超えたぶんは「ほか○件」にまとめる */
const MAX_LISTED = 8;

function whenLine(iso: string): string {
  return `${jstDateLabel(iso)} ${jstTimeStr(iso)}`;
}

export async function notifyLessonAdded(
  registrant: Member,
  kindLabel: "レッスン" | "体験レッスン",
  lessons: NotifiableLesson[],
): Promise<void> {
  if (lessons.length === 0) return;

  // 一括登録は顧客・コース・担当が同じなので、1件目を代表として出す
  const first = lessons[0];
  const whens = lessons.map((l) => l.scheduledAt).sort();
  const shown = whens.slice(0, MAX_LISTED).map(whenLine);
  if (whens.length > MAX_LISTED) shown.push(`ほか${whens.length - MAX_LISTED}件`);

  const body = [
    lessons.length === 1
      ? `📝 ${kindLabel}が登録されました`
      : `📝 ${kindLabel}が${lessons.length}件登録されました`,
    `${first.customerName} 様${first.course ? `（${first.course}）` : ""}`,
    ...shown,
    first.location ? `＠${first.location}` : null,
    // 自分の担当ぶんを自分で入れることが多いので、登録者と同じなら繰り返さない
    first.trainerName && first.trainerName !== registrant.name ? `トレーナー: ${first.trainerName}` : null,
    `登録: ${registrant.name}`,
  ].filter(Boolean).join("\n");

  await notifyAdminsByLine((m) => `${body}${scheduleLink(m)}`, {
    exceptMemberId: registrant.id,
    kind: "lesson",
  });
}

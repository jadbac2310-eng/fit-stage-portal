// 仮押さえ（コースは回数券・回数券がまだ付いていないレッスン）に、追加された回数券を付ける。
//
// 2026-11-19 尚樹：回数券を入れる前に先に日程を押さえることがある。トレーナーは回数券を足せないので、
// 「回数券がありません」と出したうえで仮押さえとして登録できるようにした。
// 管理者が回数券を足したら、その仮押さえに日付の早い順で回数券を付ける（付けたぶんだけ残りが減る）。

import { getPassPendingLessons, updateLesson } from "./lessons";
import { reserveSessionPass, releaseSessionPass } from "./session-passes";
import type { SessionPass } from "./session-passes-types";

/**
 * この日時より後に登録した仮押さえだけを対象にする（日本時間 2026-11-19 0:00）。
 * それより前のデータに「回数券なしの回数券レッスン」が残っていても、勝手に回数券を使わない。
 */
export const PASS_PENDING_FROM = "2026-11-18T15:00:00.000Z";

/** 追加した回数券を、そのお客様の仮押さえに日付の早い順で付ける。付けた件数を返す。 */
export async function attachPendingLessonsToPass(pass: Pick<SessionPass, "id" | "customerId" | "remainingCount">): Promise<number> {
  const pending = await getPassPendingLessons(pass.customerId, PASS_PENDING_FROM);
  let attached = 0;
  for (const lesson of pending.slice(0, Math.max(pass.remainingCount, 0))) {
    // 先に残りを確保してから付ける（付けたのに残りが減っていない、を作らない）
    try { await reserveSessionPass(pass.id, 1); } catch { break; }
    try {
      await updateLesson(lesson.id, { sessionPassId: pass.id });
      attached++;
    } catch (e) {
      await releaseSessionPass(pass.id, 1);
      throw e;
    }
  }
  return attached;
}

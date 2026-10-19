// 段階単価を、その月の実際のレッスンに当てはめる。
//
// ポイントは「請求まとめ先ごとに、まとめた人数ぶんを合算して数える」こと。
// 1人ずつ数えると、2人で4回やっても両方とも1〜2回目あつかいになり、
// いつまでも安い単価に下がらない。
//
// 数える期間は請求書と同じ（まとめ先の締日にそろえる）。
// 請求書が「4回まで9,200円」と書いている期間と、数える期間がずれないようにするため。
//
// ※ このファイルは invoices.ts を読む。逆に invoices.ts や commissions.ts からは読まない
//   （循環参照になるため）。あちらには計算ずみの「レッスンID → 単価」だけを渡す。

import type { Customer } from "./customers-types";
import type { Lesson } from "./lessons-types";
import { courseToPaymentType, isBillableLessonStatus } from "./lessons-types";
import { billingGroups, billingPeriod, type BillingPeriod } from "./invoices";
import { normalizeTiers, tierPriceAt } from "./session-tiers-types";

export type { SessionTier } from "./session-tiers-types";
export { normalizeTiers, tierPriceAt, tiersLabel } from "./session-tiers-types";

/**
 * 対象月の「レッスンID → 単価」を作る。
 *
 * 段階単価が設定されている請求まとめ先だけを対象にする。
 * 設定が無いお客さまは今までどおり（顧客ごとの都度単価）なので、ここには出てこない。
 */
/**
 * 全期間ぶんをまとめて作る。
 *
 * 画面によっては12か月ぶんを一度に集計するので、月ごとに呼び分けなくていいようにする。
 * 1つのレッスンが2つの期間に入ることはない（締日で区切った期間は重ならない）ので、
 * 月ごとの結果をそのまま足し合わせてよい。
 */
export function tieredLessonPricesAll(
  data: { customers: Customer[]; lessons: Lesson[] },
): Record<string, number> {
  const months = data.lessons.map((l) => l.scheduledAt.slice(0, 7)).filter(Boolean).sort();
  if (months.length === 0) return {};

  const step = (ym: string, by: number) => {
    const [y, m] = ym.split("-").map((x) => parseInt(x, 10));
    const d = new Date(Date.UTC(y, m - 1 + by, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  };

  // 締日があると、月末のレッスンは翌月分の期間に入る。前後1か月ぶん広げて取りこぼさないようにする
  const out: Record<string, number> = {};
  for (let ym = step(months[0], -1), last = step(months[months.length - 1], 1); ym <= last; ym = step(ym, 1)) {
    Object.assign(out, tieredLessonPrices(ym, data));
  }
  return out;
}

export function tieredLessonPrices(
  month: string,
  data: { customers: Customer[]; lessons: Lesson[] },
): Record<string, number> {
  const out: Record<string, number> = {};

  for (const { biller, members } of billingGroups(data.customers)) {
    const tiers = normalizeTiers(biller.sessionTiers);
    if (tiers.length === 0) continue;

    // 数える期間はまとめ先の締日にそろえる（請求書と同じ期間）
    const period: BillingPeriod = billingPeriod(month, biller.billingCutoffDay);
    const ids = new Set(members.map((m) => m.id));

    // まとめた人数ぶんをまとめて、日付順に何回目かを数える。
    // 同じ日時が並んでも順番がぶれないよう、最後は id で並べる。
    const inPeriod = data.lessons
      .filter((l) =>
        ids.has(l.customerId) &&
        courseToPaymentType(l.course) === "single" &&
        isBillableLessonStatus(l.status) &&
        l.scheduledAt.slice(0, 10) >= period.from &&
        l.scheduledAt.slice(0, 10) <= period.to)
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt) || a.id.localeCompare(b.id));

    inPeriod.forEach((l, i) => {
      const price = tierPriceAt(tiers, i + 1);
      if (price != null) out[l.id] = price;
    });
  }

  return out;
}

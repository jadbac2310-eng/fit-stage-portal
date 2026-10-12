import type { VenueKind } from "./lessons-types";

/**
 * 顧客ごとの会場の利用料（マスタの料金の上書き）。
 *
 * 同じ会場でもお客さんによって料金が違うことがあるため、
 * 顧客×会場の組み合わせで覚えておき、レッスン追加時の初期値に使う。
 */
export interface CustomerVenueFee {
  id:         string;
  customerId: string;
  /** "gym" | "fct" | "avenir"（店舗は利用料が無いので対象外） */
  venueKind:  VenueKind;
  venueId:    string;
  fee:        number;
  createdAt:  string;
  updatedAt:  string;
}

/**
 * この顧客・この会場で使う利用料。
 * 顧客ごとの上書きがあればそれ、無ければマスタの料金。
 */
export function resolveVenueFee(
  customerId: string | undefined,
  kind: VenueKind,
  venueId: string,
  masterFee: number,
  overrides: Pick<CustomerVenueFee, "customerId" | "venueKind" | "venueId" | "fee">[] = [],
): number {
  if (!customerId) return masterFee;
  const hit = overrides.find(
    (o) => o.customerId === customerId && o.venueKind === kind && o.venueId === venueId,
  );
  return hit ? hit.fee : masterFee;
}

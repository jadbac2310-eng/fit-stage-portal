// 段階単価の型と計算（DBにも invoices にも触らない純粋な部分）。
//
// 例) 株式会社井上塗装店（井上さん・中村さんの2名をまとめて請求）
//     2人合わせて 4回目まで 9,200円 ／ 5回目から 9,000円
//
// クライアントからも読むので、ここでは重い import をしない。

/** 段階単価の1段。「fromCount 回目から unitPrice 円」 */
export interface SessionTier {
  /** この回数目から（1始まり） */
  fromCount: number;
  /** 1回あたりの金額（税込） */
  unitPrice: number;
}

/**
 * 保存された値を安全な形に整える。
 * 手入力やJSONの壊れたデータでも落ちないようにし、回数の小さい順にそろえる。
 */
export function normalizeTiers(raw: unknown): SessionTier[] {
  if (!Array.isArray(raw)) return [];
  const out: SessionTier[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const o = r as { fromCount?: unknown; unitPrice?: unknown; from_count?: unknown; unit_price?: unknown };
    const from  = Number(o.fromCount ?? o.from_count);
    const price = Number(o.unitPrice ?? o.unit_price);
    if (!Number.isFinite(from) || !Number.isFinite(price)) continue;
    if (from < 1 || price < 0) continue;
    const fromCount = Math.floor(from);
    // 同じ回数が2つあるときは後ろ勝ち（入力し直したぶんを採用する）
    const dup = out.findIndex((t) => t.fromCount === fromCount);
    if (dup >= 0) out[dup] = { fromCount, unitPrice: Math.round(price) };
    else out.push({ fromCount, unitPrice: Math.round(price) });
  }
  return out.sort((a, b) => a.fromCount - b.fromCount);
}

/**
 * 何回目かに対する単価。
 * 「4回目まで9,200円／5回目から9,000円」は [{1,9200},{5,9000}] と持つ。
 * その回数以下でいちばん大きい段を使う。1段目より前（段が無い）なら null。
 */
export function tierPriceAt(tiers: SessionTier[], rank: number): number | null {
  let hit: number | null = null;
  for (const t of tiers) {
    if (t.fromCount <= rank) hit = t.unitPrice;
    else break;   // fromCount 昇順なので、超えたらそれ以降も超える
  }
  return hit;
}

/** 表示用。「4回目まで ¥9,200 ／ 5回目から ¥9,000」 */
export function tiersLabel(tiers: SessionTier[]): string {
  const t = normalizeTiers(tiers);
  if (t.length === 0) return "";
  return t.map((cur, i) => {
    const next = t[i + 1];
    const yen = `¥${cur.unitPrice.toLocaleString("ja-JP")}`;
    if (next) return `${next.fromCount - 1}回目まで ${yen}`;
    return cur.fromCount === 1 ? `1回ごと ${yen}` : `${cur.fromCount}回目から ${yen}`;
  }).join(" ／ ");
}

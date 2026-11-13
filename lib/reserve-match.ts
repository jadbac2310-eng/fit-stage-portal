/**
 * HPの体験予約フォームの「希望店舗」「希望トレーナー」を、ポータルの店舗マスタ・メンバーに合わせる
 * （2026-11-14 尚樹「先に埋めておいてほしい。変更があればこちらで直す」）。
 *
 * HP側の値は「曽根城山店」「坂根尚樹」「平田崇明」のように空白なし。マスタ側は「坂根 尚樹」
 * 「FIT STAGE 曽根城山店」のように空白や前置きが付いていることがあるので、空白・括弧書きを落として比べる。
 * 「指名なし」「迷っている・相談したい」などは何も返さない（空欄のまま）。
 */

function norm(s: string): string {
  return s
    .normalize("NFKC")
    .replace(/[（(][^）)]*[）)]/g, "")   // 「（ストレッチ専門）」などの添え書き
    .replace(/[\s　・･]/g, "")
    .replace(/^FITSTAGE/i, "")
    .toLowerCase();
}

/** 店舗名で店舗マスタを探す。完全一致 → 片方がもう片方を含む の順 */
export function matchStoreByName<T extends { id: string; name: string }>(name: string | undefined, stores: T[]): T | undefined {
  const t = norm(name ?? "");
  if (t.length < 2) return undefined;
  return stores.find((s) => norm(s.name) === t)
    ?? stores.find((s) => { const n = norm(s.name); return n.length >= 2 && (n.includes(t) || t.includes(n)); });
}

/** 希望トレーナーの名前でメンバーを探す。指名なしは undefined */
export function matchMemberByName<T extends { id: string; name: string }>(name: string | undefined, members: T[]): T | undefined {
  const t = norm(name ?? "");
  if (t.length < 2 || /指名なし|なし|未定|おまかせ|お任せ/.test(t)) return undefined;
  return members.find((m) => norm(m.name) === t)
    ?? members.find((m) => { const n = norm(m.name); return n.length >= 2 && (n.includes(t) || t.includes(n)); });
}

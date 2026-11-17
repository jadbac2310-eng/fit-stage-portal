/**
 * 統括（AI部署の室長）の「朝の1通」（2026-11-17 尚樹「俺の下に統括をつける」）。
 *
 * 朝9時の知らせは、コミッション・業務チェック部・HP・集客部・請求書・体験の追客…と、
 * それぞれ別の LINE で代表に届いていた。代表あての分だけを1通にまとめ、上から大事な順に並べる。
 * 中身は各部署が作った文をそのまま使う（統括は並べて見出しを付けるだけ。数字を作り直さない）。
 * 代表以外の人あての知らせは、今までどおり1通ずつ届く。純粋関数。
 */

export interface DigestInput {
  ref: string;
  text: string;
}

type Section = { key: string; label: string; from: string; order: number };

/** ref の頭で、どこからの知らせかと、並べる順番を決める（小さいほど上） */
const SECTIONS: { prefix: string; section: Section }[] = [
  { prefix: "commission-pay-today", section: { key: "money", label: "今日はコミッションの振込日", from: "経理", order: 1 } },
  { prefix: "commission-pay-eve",   section: { key: "money", label: "明日はコミッションの振込日", from: "経理", order: 2 } },
  { prefix: "invoice-send",         section: { key: "invoice", label: "請求書の送付日", from: "経理", order: 3 } },
  { prefix: "commission-statement", section: { key: "money", label: "コミッション明細を送る時期", from: "経理", order: 4 } },
  { prefix: "ops-check",            section: { key: "ops", label: "入力の気になるところ", from: "業務チェック部", order: 5 } },
  { prefix: "trial-followup",       section: { key: "trial", label: "体験の結果が未入力", from: "営業", order: 6 } },
  { prefix: "hourly-pending",       section: { key: "hourly", label: "予定のままの業務", from: "経理", order: 7 } },
  { prefix: "hp-growth",            section: { key: "growth", label: "今週の検索の報告", from: "HP・集客部", order: 8 } },
];
const OTHER: Section = { key: "other", label: "そのほかのお知らせ", from: "統括", order: 9 };

export function sectionOf(ref: string): Section {
  return SECTIONS.find((s) => ref.startsWith(s.prefix))?.section ?? OTHER;
}

/** LINE の1通は5000字まで。超えそうなら各知らせを短く切る */
const LINE_LIMIT = 4600;

/** 部署の文の1行目から、頭の絵文字と「○○部より：」を外す（見出しと重なるため。件数などの中身は残す） */
function body(text: string): string {
  const lines = text.split("\n");
  lines[0] = (lines[0] ?? "").replace(/^[^\p{L}\p{N}「（(]+/u, "").replace(/^[^：:\n]{0,20}より[：:]\s*/, "");
  // 各部署の文の最後の「▶ AI部署で見る」とURLは、まとめた1通の最後に1つだけ付けるので外す
  const out: string[] = [];
  for (let k = 0; k < lines.length; k++) {
    if (lines[k].startsWith("▶") && /^https?:\/\//.test(lines[k + 1] ?? "")) { k++; continue; }
    out.push(lines[k]);
  }
  return out.join("\n").replace(/\n+$/, "");
}

export function buildChiefDigest(items: DigestInput[], opts: { chiefName: string; dateLabel: string; pageUrl: string }): string | null {
  if (items.length === 0) return null;
  const sorted = [...items].sort((a, b) => sectionOf(a.ref).order - sectionOf(b.ref).order || a.ref.localeCompare(b.ref));

  const head = [
    `🗂 統括 ${opts.chiefName}より：${opts.dateLabel} の朝の報告`,
    "",
    "■ 今日、社長に見てほしいこと",
    ...sorted.slice(0, 3).map((it, i) => `${i + 1}. ${sectionOf(it.ref).label}（${sectionOf(it.ref).from}）`),
  ];
  if (sorted.length > 3) head.push(`ほか ${sorted.length - 3}件は下に`);

  const foot = ["", `▶ AI部署で見る\n${opts.pageUrl}`];
  const fixed = head.join("\n").length + foot.join("\n").length;
  const budget = Math.max(300, Math.floor((LINE_LIMIT - fixed) / sorted.length) - 40);

  const parts: string[] = [];
  for (const it of sorted) {
    const s = sectionOf(it.ref);
    let b = body(it.text).trim();
    if (b.length > budget) b = `${b.slice(0, budget).trimEnd()}\n…（続きはポータルで）`;
    parts.push("", `━━ ${s.label}（${s.from}）`, b);
  }
  return [...head, ...parts, ...foot].join("\n");
}

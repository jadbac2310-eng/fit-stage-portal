import type { Task } from "./tasks-types";

/**
 * 社長から AI部署への「指示」（2026-11-17 尚樹）。
 *
 * AI部署の画面で統括本部長に指示を書くと、担当の部署を決めて「会社のやること」に1件入れる。
 * 専用の表は作らず、やること（tasks）に題名の頭「【部署名】」を付けて入れる（やることの画面でもそのまま見える・直せる）。
 * 部署を決めるのは AI（短い分類だけ）。AI が使えないときは言葉で決める。
 *
 * 注意：指示を入れても AI が勝手に作業を始めるわけではない。
 *   ポータル開発部・HP・集客部 … 社長が Claude Code のセッションで「AI部署の指示をやって」と頼むと、そこで作業する（画面のコピーを貼る）。
 *   業務チェック部 … 決まったチェックを毎朝動かしているだけなので、チェックの中身を変える指示はポータル開発部の仕事になる。
 */

export type OrderDeptKey = "ops-check" | "hp-growth" | "portal-dev";

export const ORDER_DEPTS: { key: OrderDeptKey; name: string; category: string; hint: string }[] = [
  { key: "hp-growth",  name: "HP・集客部",     category: "サイト・SEO", hint: "HP（fitstage.jp）・ブログ・SEO・検索順位・集客・広告・Googleマップ・口コミ" },
  { key: "portal-dev", name: "ポータル開発部", category: "その他",     hint: "社内ポータルの画面・機能・不具合・通知・LINE・データの直し" },
  { key: "ops-check",  name: "業務チェック部", category: "その他",     hint: "レッスンや体験の入力の見直し・数字の点検・確認作業" },
];

export function deptByKey(key: string): (typeof ORDER_DEPTS)[number] | undefined {
  return ORDER_DEPTS.find((d) => d.key === key);
}

/** 「【HP・集客部】江坂店のページを直す」→ 部署と題名。指示でなければ null */
export function parseOrderTitle(title: string): { dept: (typeof ORDER_DEPTS)[number]; title: string } | null {
  const m = title.match(/^【(.+?)】\s*(.*)$/);
  if (!m) return null;
  const dept = ORDER_DEPTS.find((d) => d.name === m[1]);
  return dept ? { dept, title: m[2] } : null;
}

export function orderTitle(deptKey: OrderDeptKey, title: string): string {
  return `【${deptByKey(deptKey)!.name}】${title.trim()}`;
}

/** AI が使えないときの振り分け（言葉で決める） */
export function keywordDept(text: string): OrderDeptKey {
  if (/HP|ホームページ|サイト|ブログ|記事|SEO|検索|順位|集客|広告|マップ|口コミ|LP|fitstage\.jp/i.test(text)) return "hp-growth";
  if (/入力|点検|チェック|確認して|完了忘れ|担当なし|二重|数字が合/.test(text)) return "ops-check";
  return "portal-dev";
}

/** 指示の文から題名を作る（AI が使えないとき）。1行目の頭30字 */
export function fallbackTitle(text: string): string {
  const first = text.trim().split("\n")[0].replace(/[。．.]+$/, "");
  return first.length > 30 ? `${first.slice(0, 30)}…` : first;
}

/** 指示のやること（会社のやることの中で、題名が【部署名】で始まるもの） */
export function ordersOf(tasks: Task[]): { task: Task; dept: (typeof ORDER_DEPTS)[number]; title: string }[] {
  const out: { task: Task; dept: (typeof ORDER_DEPTS)[number]; title: string }[] = [];
  for (const t of tasks) {
    if (t.ownerMemberId) continue;
    const p = parseOrderTitle(t.title);
    if (p) out.push({ task: t, ...p });
  }
  return out;
}

/** 止まっている指示：完了でなく、最後に動いてから days 日以上たったもの */
export function stalledOrders(tasks: Task[], now: Date, days = 3) {
  const limit = now.getTime() - days * 24 * 3600 * 1000;
  return ordersOf(tasks)
    .filter((o) => o.task.status !== "完了" && new Date(o.task.updatedAt || o.task.createdAt).getTime() < limit)
    .sort((a, b) => (a.task.updatedAt || a.task.createdAt).localeCompare(b.task.updatedAt || b.task.createdAt));
}

function md(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

/** 朝の1通に入れる「止まっている指示」（統括本部長から） */
export function buildStalledMessage(tasks: Task[], now: Date, days = 3): string | null {
  const s = stalledOrders(tasks, now, days);
  if (s.length === 0) return null;
  const lines = [`📌 統括本部より：止まっている指示が ${s.length}件 あります（${days}日以上動きなし）`];
  for (const o of s.slice(0, 5)) {
    lines.push(`・【${o.dept.name}】${o.title}（${o.task.status}・${md(o.task.updatedAt || o.task.createdAt)}から）`);
  }
  if (s.length > 5) lines.push(`　ほか ${s.length - 5}件`);
  lines.push("", "進めるなら Claude Code のセッションで「AI部署の指示をやって」と頼んでください。いらなくなった指示は、やることで完了にしてください。");
  return lines.join("\n");
}

/** Claude Code のセッションに貼る文（画面の「コピー」） */
export function orderBrief(o: { dept: (typeof ORDER_DEPTS)[number]; title: string; task: Task }): string {
  return [
    `AI部署（${o.dept.name}）への社長の指示です。対応してください。`,
    `題名：${o.title}`,
    o.task.dueOn ? `期限：${o.task.dueOn}` : null,
    "",
    o.task.memo?.trim() ?? "",
    "",
    "終わったら、ポータルの「やること」でこの件を完了にするよう社長に伝えてください。",
  ].filter((l): l is string => l !== null).join("\n");
}

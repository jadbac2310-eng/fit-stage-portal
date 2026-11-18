import Link from "next/link";
import { ChevronRight, PhoneCall } from "lucide-react";
import type { FollowUp, FollowUpKind } from "@/lib/highlights-types";
import { makeT, type Lang } from "@/lib/i18n";

/**
 * 声をかけたい人。営業のカードの中に小さくまとめる。
 *
 * 前は独立した1枚で名前を5人ずつ出していたが、「よく分からない・要るか分からない」と
 * 言われたので、閉じた状態では人数と理由の内訳だけにして、開くと名前が出るようにした。
 * details なので JavaScript は要らない。
 */
const KIND_LABEL: Record<FollowUpKind, string> = {
  away:       "しばらく来ていない",
  planUnused: "月プランで今月まだ",
  passLow:    "回数券が残り少ない",
  noNext:     "次の予定がない",
};
const KIND_LABEL_EN: Record<FollowUpKind, string> = {
  away:       "Hasn't come in a while",
  planUnused: "Monthly plan, not used yet",
  passLow:    "Few sessions left on pass",
  noNext:     "No next session booked",
};
const KIND_ORDER: FollowUpKind[] = ["away", "planUnused", "passLow", "noNext"];

function FollowRow({ follow, lang }: { follow: FollowUp; lang: Lang }) {
  return (
    <Link
      href={`/lessons/regular?q=${encodeURIComponent(follow.customerName)}`}
      className="flex items-center gap-2 rounded-lg bg-gray-50 px-2.5 py-2 hover:bg-gray-100 transition"
    >
      <span className="text-sm font-semibold text-gray-800 truncate">{follow.customerName}</span>
      <span className="text-[11px] text-gray-500 truncate">{lang === "en" ? KIND_LABEL_EN[follow.kind] : follow.reason}</span>
      <ChevronRight size={13} className="ml-auto flex-shrink-0 text-gray-300" />
    </Link>
  );
}

export function FollowUpsSection({ follows, unassigned = [], lang = "ja" }: { follows: FollowUp[]; unassigned?: FollowUp[]; lang?: Lang }) {
  const t = makeT(lang);
  const kindLabel = lang === "en" ? KIND_LABEL_EN : KIND_LABEL;
  if (follows.length === 0 && unassigned.length === 0) return null;

  const counts = new Map<FollowUpKind, number>();
  for (const f of follows) counts.set(f.kind, (counts.get(f.kind) ?? 0) + 1);
  const breakdown = KIND_ORDER.filter((k) => counts.has(k)).map((k) => (lang === "en" ? `${kindLabel[k]}: ${counts.get(k)}` : `${kindLabel[k]}${counts.get(k)}`));

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      {follows.length > 0 ? (
        <details>
          <summary className="cursor-pointer list-none">
            <p className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
              <PhoneCall size={10} className="text-rose-500" /> {t("あなたの担当で声をかけたい人", "Clients to reach out to")}
              <span className="ml-auto text-xs font-bold text-blue-600">{t(`${follows.length}名を表示`, `Show ${follows.length}`)}</span>
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">{breakdown.join("・")}</p>
          </summary>
          <div className="space-y-1 mt-2">
            {follows.map((f) => <FollowRow key={f.customerId} follow={f} lang={lang} />)}
          </div>
        </details>
      ) : (
        <p className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
          <PhoneCall size={10} className="text-rose-500" /> {t("あなたの担当で声をかけたい人はいません", "No clients to reach out to")}
        </p>
      )}

      {unassigned.length > 0 && (
        <div className="mt-2 rounded-lg bg-amber-50 px-2.5 py-2">
          <p className="text-[11px] font-semibold text-amber-800">
            {t("担当営業が未設定（誰の画面にも出ません）", "No sales rep assigned (not shown to anyone)")}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {unassigned.map((u) => (
              <Link
                key={u.customerId}
                href={`/master/customers?q=${encodeURIComponent(u.customerName)}`}
                className="rounded-full border border-amber-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-amber-800 hover:bg-amber-100"
              >
                {u.customerName}
              </Link>
            ))}
          </div>
          <p className="text-[10px] text-amber-700 mt-1">{t("名前をタップすると顧客マスタで開けます。", "Tap a name to open the client record.")}</p>
        </div>
      )}
    </div>
  );
}

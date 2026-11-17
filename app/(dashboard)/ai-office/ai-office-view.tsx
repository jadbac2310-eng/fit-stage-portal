import Link from "next/link";
import { Clapperboard, ClipboardCheck, Wrench, TrendingUp } from "lucide-react";
import { PageTitle } from "@/components/ui/page-title";
import { SectionBox } from "@/components/ui/section-box";
import { groupFindings, OPS_CHECK_LABEL, opsSlotLabel, type OpsFinding } from "@/lib/ops-check";
import { AI_DEPARTMENTS, CHIEF, type AiDepartment } from "./departments";
import { BusinessAvatar } from "./business-avatar";
import { OrderPanel, type OrderRow } from "./order-panel";

/** AI部署の画面の見た目（データは page.tsx で読む。偽データでも描けるように分けている） */
export function AiOfficeView({ owner, findings, growthSlot, orders = [] }: {
  owner?: { name: string; avatarUrl?: string };
  /** null＝読み込めなかった */
  findings: OpsFinding[] | null;
  /** HP・集客部の報告（サーチコンソールを読むので、ページとは別に後から出す） */
  growthSlot?: React.ReactNode;
  /** 社長からの指示（会社のやることの【部署名】つき） */
  orders?: OrderRow[];
}) {
  const counts: Record<string, string> = {
    "ops-check": findings === null ? "読み込めませんでした" : findings.length === 0 ? "気になるところはありません" : `気になるところ ${findings.length}件`,
  };
  // 部署ごとの進行中の指示の件数
  const openOrders = orders.filter((o) => o.status !== "完了");
  const orderCount = (key: string) => openOrders.filter((o) => o.deptKey === key).length;

  // 部長たちのひとこと（今の状態に合わせて変わる。おもしろく、でも中身は本当のこと）
  const chiefLine = `カット！今朝の報告は社長あての1通にまとめてある。${openOrders.length ? `指示は${openOrders.length}件、各部署に回したぞ。` : "指示はいつでも受け付ける。"}`;
  const lineOf = (key: string): string => {
    const n = orderCount(key);
    if (key === "ops-check") {
      if (findings === null) return "今日は帳簿が読めなかった。もう一度開いてくれ。";
      return findings.length === 0 ? "異常なし。すべて時間どおりだ。" : `気になるところが${findings.length}件。今日のうちに片付けよう。`;
    }
    if (key === "portal-dev") return n > 0 ? `指示${n}件、作り込み中だ。細部で手は抜かん。` : "次の注文を待っている。言うてくれたらすぐ作る。";
    if (key === "hp-growth") return n > 0 ? `指示${n}件、数字を見ながら進めてる！` : "数字は正直！毎週月曜に今週の一手を出すよ。";
    return "";
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      <PageTitle title="AI部署" sub="FIT STAGE を手伝う AI の担当と、今日の報告です。決めるのは社長、AI は見つけて・下書きして・作るところまで。" />

      {/* 組織図 */}
      <section className="bg-white border border-[var(--portal-line)] px-3 py-5">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-3 border-2 border-[var(--portal-navy)] bg-navy-900 text-white px-4 py-3 min-w-[220px]">
            {owner?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={owner.avatarUrl} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-gold-500" />
            ) : (
              <span className="w-11 h-11 rounded-full bg-gold-500 text-navy-900 font-bold flex items-center justify-center">社</span>
            )}
            <div>
              <p className="text-[11px] text-gold-500 font-bold tracking-widest">社長</p>
              <p className="text-sm font-bold">{owner?.name ?? "代表"}</p>
            </div>
          </div>
          <div aria-hidden className="w-0.5 h-5 bg-[var(--portal-navy)]" />
          {/* 統括本部（社長のすぐ下） */}
          <div className="w-full max-w-md">
            <PersonCard d={CHIEF} active line={chiefLine} status={openOrders.length ? `進行中の指示 ${openOrders.length}件` : undefined} wide />
          </div>
          <div aria-hidden className="w-0.5 h-5 bg-[var(--portal-navy)]" />
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 md:pt-5">
          {/* 部署をつなぐ横の線（パソコンのみ） */}
          <div aria-hidden className="hidden md:block absolute top-0 left-[16.66%] right-[16.66%] h-0.5 bg-[var(--portal-navy)]" />
          {AI_DEPARTMENTS.map((d) => (
            <div key={d.key} className="relative">
              <div aria-hidden className="hidden md:block absolute -top-5 left-1/2 w-0.5 h-5 bg-[var(--portal-navy)]" />
              <PersonCard d={d} active={d.state === "active"} line={lineOf(d.key)} status={counts[d.key]} orders={orderCount(d.key)} />
            </div>
          ))}
        </div>
      </section>

      <OrderPanel chiefLabel={`${CHIEF.fullTitle} ${CHIEF.personName}`} orders={orders} />

      {growthSlot}

      {/* 業務チェック部の報告 */}
      <SectionBox title={`業務チェック部 ${headOf("ops-check")}の報告（いまの状態）`} padded>
        {findings === null ? (
          <p className="text-sm text-red-600">データを読み込めませんでした。少し待ってから開き直してください。</p>
        ) : findings.length === 0 ? (
          <p className="text-sm text-gray-600">気になるところはありません。</p>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">毎朝9時、統括本部長の朝の1通にも入ります。直したものは、この画面を開き直すと消えます。</p>
            {groupFindings(findings).map((g) => (
              <div key={g.kind}>
                <p className="text-sm font-bold text-gray-900">{OPS_CHECK_LABEL[g.kind].title}（{g.items.length}件）</p>
                <p className="text-xs text-gray-500 mb-1.5">{OPS_CHECK_LABEL[g.kind].why}</p>
                <ul className="border border-[var(--portal-line)] divide-y divide-[var(--portal-line)]">
                  {g.items.map((f) => <FindingRow key={`${f.kind}-${f.id}`} f={f} />)}
                </ul>
              </div>
            ))}
          </div>
        )}
      </SectionBox>
    </div>
  );
}

function FindingRow({ f }: { f: OpsFinding }) {
  return (
    <li>
      <Link href={`/schedule/${f.id}`} className="flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-0.5 px-3 py-2 hover:bg-gray-50 text-sm">
        <span className="w-full sm:w-28 flex-shrink-0 text-xs sm:text-sm text-gray-500 tabular-nums">{opsSlotLabel(f.scheduledAt)}</span>
        <span className="flex-1 min-w-0 truncate font-medium text-gray-900">
          {f.customerName} 様{f.isTrial && <span className="ml-1 text-xs text-purple-600">体験</span>}
        </span>
        <span className={f.trainerName ? "text-gray-600 flex-shrink-0" : "text-amber-700 font-semibold flex-shrink-0"}>
          {f.trainerName || "担当なし"}
        </span>
      </Link>
    </li>
  );
}

const ICONS = { chief: Clapperboard, check: ClipboardCheck, dev: Wrench, growth: TrendingUp } as const;

/** 部署（統括本部も）のカード：上に部署の色の線、アバターに部署のアイコン、部長のひとこと、やること・報告・今日の3行 */
function PersonCard({ d, active, line, status, orders = 0, wide = false }: {
  d: Pick<AiDepartment, "name" | "plain" | "color" | "icon" | "title" | "personName" | "persona" | "look" | "when">;
  active: boolean;
  line?: string;
  status?: string;
  orders?: number;
  wide?: boolean;
}) {
  const Icon = ICONS[d.icon];
  return (
    <div className="bg-white border border-[var(--portal-line)] h-full flex flex-col" style={{ borderTop: `4px solid ${active ? d.color : "#D1D5DB"}` }}>
      <div className="flex items-start gap-3 px-3 pt-3">
        <span className="relative flex-shrink-0">
          <BusinessAvatar look={d.look} dim={!active} title={`${d.name} ${d.title} ${d.personName}`} size={wide ? 80 : 72} />
          <span className="absolute -bottom-1 -right-1 w-7 h-7 flex items-center justify-center border-2 border-white" style={{ background: active ? d.color : "#9CA3AF" }}>
            <Icon size={15} color="#FFFFFF" strokeWidth={2.2} />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-base font-bold text-gray-900">{d.name}</p>
            <span className={`ml-auto text-[11px] font-bold px-1.5 py-0.5 border flex-shrink-0 ${active ? "text-green-700 bg-green-50 border-green-300" : "text-gray-500 bg-gray-50 border-gray-300"}`}>
              {active ? "稼働中" : "準備中"}
            </span>
          </div>
          <p className="text-xs font-semibold" style={{ color: active ? d.color : "#6B7280" }}>{d.plain}</p>
          <p className="text-xs text-gray-800 mt-1">{d.title}　<span className="font-bold">{d.personName}</span><span className="ml-1 text-[10px] font-bold text-gold-600">AI</span></p>
          <p className="text-[11px] text-gray-500">{d.persona}</p>
        </div>
      </div>
      {line && (
        <div className="mx-3 mt-2.5 relative bg-gray-50 border border-[var(--portal-line)] px-2.5 py-1.5 text-xs text-gray-800">
          <span aria-hidden className="absolute -top-[6px] left-6 w-2.5 h-2.5 bg-gray-50 border-l border-t border-[var(--portal-line)] rotate-45" />
          「{line}」
        </div>
      )}
      <dl className="mt-auto mx-3 mb-3 mt-2.5 text-xs border-t border-[var(--portal-line)] pt-2 space-y-1">
        <div className="flex gap-2"><dt className="w-14 flex-shrink-0 text-gray-500">報告</dt><dd className="text-gray-700">{d.when}</dd></div>
        {status && <div className="flex gap-2"><dt className="w-14 flex-shrink-0 text-gray-500">今日</dt><dd className="font-semibold text-navy-900">{status}</dd></div>}
        {orders > 0 && <div className="flex gap-2"><dt className="w-14 flex-shrink-0 text-gray-500">指示</dt><dd className="font-semibold text-gold-600">社長からの指示 {orders}件</dd></div>}
      </dl>
    </div>
  );
}

/** 部署の部長の呼び名（「クリストファー・ノーラン部長」） */
export function headOf(key: string): string {
  const d = AI_DEPARTMENTS.find((x) => x.key === key);
  return d ? `${d.personName}${d.title}` : "";
}

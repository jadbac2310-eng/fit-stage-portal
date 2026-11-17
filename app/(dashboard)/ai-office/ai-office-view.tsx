import Link from "next/link";
import { PageTitle } from "@/components/ui/page-title";
import { SectionBox } from "@/components/ui/section-box";
import { groupFindings, OPS_CHECK_LABEL, opsSlotLabel, type OpsFinding } from "@/lib/ops-check";
import { AI_DEPARTMENTS, CHIEF, type AiDepartment } from "./departments";
import { BusinessAvatar } from "./business-avatar";

/** AI部署の画面の見た目（データは page.tsx で読む。偽データでも描けるように分けている） */
export function AiOfficeView({ owner, findings, growthSlot }: {
  owner?: { name: string; avatarUrl?: string };
  /** null＝読み込めなかった */
  findings: OpsFinding[] | null;
  /** HP・集客部の報告（サーチコンソールを読むので、ページとは別に後から出す） */
  growthSlot?: React.ReactNode;
}) {
  const counts: Record<string, string> = {
    "ops-check": findings === null ? "読み込めませんでした" : findings.length === 0 ? "気になるところはありません" : `気になるところ ${findings.length}件`,
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
          {/* 統括（社長のすぐ下） */}
          <div className="w-full max-w-md border-2 border-gold-500 bg-white">
            <div className="flex items-center gap-3 px-3 py-3 border-b border-[var(--portal-line)]">
              <BusinessAvatar look={CHIEF.look} title={`${CHIEF.name} ${CHIEF.title} ${CHIEF.personName}`} />
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900">{CHIEF.name}</p>
                <p className="text-xs text-gray-700">{CHIEF.title}　{CHIEF.personName}<span className="ml-1 text-[10px] font-bold text-gold-600">AI</span></p>
                <p className="text-[11px] text-gray-500 mt-0.5">{CHIEF.persona}</p>
              </div>
              <span className="ml-auto text-[11px] font-bold px-2 py-0.5 border flex-shrink-0 text-green-700 bg-green-50 border-green-300">稼働中</span>
            </div>
            <div className="px-3 py-2.5 space-y-1 text-xs text-gray-700">
              <p>{CHIEF.role}</p>
              <p className="text-gray-500">動く時：{CHIEF.when}</p>
            </div>
          </div>
          <div aria-hidden className="w-0.5 h-5 bg-[var(--portal-navy)]" />
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 md:pt-5">
          {/* 部署をつなぐ横の線（パソコンのみ） */}
          <div aria-hidden className="hidden md:block absolute top-0 left-[16.66%] right-[16.66%] h-0.5 bg-[var(--portal-navy)]" />
          {AI_DEPARTMENTS.map((d) => <DepartmentCard key={d.key} d={d} status={counts[d.key]} />)}
        </div>
      </section>

      {growthSlot}

      {/* 業務チェック部の報告 */}
      <SectionBox title={`業務チェック部 ${headOf("ops-check")}の報告（いまの状態）`} padded>
        {findings === null ? (
          <p className="text-sm text-red-600">データを読み込めませんでした。少し待ってから開き直してください。</p>
        ) : findings.length === 0 ? (
          <p className="text-sm text-gray-600">気になるところはありません。</p>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">毎朝9時、統括の朝の1通にも入ります。直したものは、この画面を開き直すと消えます。</p>
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

function DepartmentCard({ d, status }: { d: AiDepartment; status?: string }) {
  const active = d.state === "active";
  return (
    <div className="relative border border-[var(--portal-line)] bg-white">
      <div aria-hidden className="hidden md:block absolute -top-5 left-1/2 w-0.5 h-5 bg-[var(--portal-navy)]" />
      <div className="flex items-center gap-3 px-3 py-3 border-b-2 border-[var(--portal-navy)]">
        <BusinessAvatar look={d.look} dim={!active} title={`${d.name} ${d.title} ${d.personName}`} />
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900">{d.name}</p>
          <p className="text-xs text-gray-700">{d.title}　{d.personName}<span className="ml-1 text-[10px] font-bold text-gold-600">AI</span></p>
          <p className="text-[11px] text-gray-500 mt-0.5">{d.persona}</p>
        </div>
        <span className={`ml-auto text-[11px] font-bold px-2 py-0.5 border flex-shrink-0 ${
          active ? "text-green-700 bg-green-50 border-green-300" : "text-gray-500 bg-gray-50 border-gray-300"
        }`}>
          {active ? "稼働中" : "準備中"}
        </span>
      </div>
      <div className="px-3 py-2.5 space-y-1.5 text-xs text-gray-700">
        <p>{d.role}</p>
        <p className="text-gray-500">動く時：{d.when}</p>
        {status && <p className="font-semibold text-navy-900">今日：{status}</p>}
      </div>
    </div>
  );
}

/** 部署の部長の呼び名（「クリストファー・ノーラン部長」） */
export function headOf(key: string): string {
  const d = AI_DEPARTMENTS.find((x) => x.key === key);
  return d ? `${d.personName}${d.title}` : "";
}

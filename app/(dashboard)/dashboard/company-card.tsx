import { Sparkles, TrendingUp } from "lucide-react";
import { SectionBox } from "@/components/ui/section-box";
import type { CompanyStats } from "@/lib/company-stats";
import { Delta } from "@/components/ui/delta";
import { makeT, type Lang } from "@/lib/i18n";

const MONTH_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * 「今月のFIT STAGE」（2026-11-09 に「FIT STAGE のいま」から改名）。全員が見る。
 *
 * 出すのは本数・人数・率だけ。売上は伸び率(%)だけで、金額は出さない。
 * ここに渡ってくる CompanyStats にそもそも円の数字が入っていないので、
 * ブラウザに送られるデータにも金額は乗らない。
 *
 * 個人名の出る順位は出さない。下位になった人のやる気が確実に下がるため。
 */
/** 棒グラフの高さ（px）。CSSクラスではなく数で持つ（棒の高さを px で計算するため） */
const BAR_AREA = 64;

export function CompanyCard({ stats, lang = "ja" }: { stats: CompanyStats; lang?: Lang }) {
  const s = stats;
  const t = makeT(lang);
  const monthLabel = (m: { month: string; label: string }) => (lang === "en" ? MONTH_EN[Number(m.month.slice(5, 7)) - 1] ?? m.label : m.label);
  const max = Math.max(...s.monthlyCounts.map((m) => m.count), 1);
  const remaining = s.nextMilestone ? s.nextMilestone - s.totalLessons : 0;

  return (
    <SectionBox title={t("今月のFIT STAGE", "FIT STAGE this month")} padded>

      {/* 今月の数字を「レッスン・お客さま・体験」の3行に分ける（2026-11-13）。
          前は 完了レッスン／新規（顧客マスタへの登録）／在籍中 を横に並べ、体験・成約は下の方に別に出していたので、
          「新規2名なのに体験1件？」と食い違って見えていた。言葉の意味を行ごとに添える。 */}
      <div className="divide-y divide-gray-100">
        <Row label={t("レッスン", "Sessions")} note={t("今月、実施したレッスン（体験も含む）", "Sessions done this month (trials included)")}>
          <Big n={s.monthLessons} unit={t("本", "")} />
          <Delta now={s.monthLessons} prev={s.lastMonthLessons} goodWhenUp className="ml-1 text-[11px]" />
          {s.lastMonthLessons > 0 && <span className="ml-2 text-[11px] text-gray-400">{t(`先月の同じ日まで ${s.lastMonthLessons}本`, `Same day last month: ${s.lastMonthLessons}`)}</span>}
        </Row>

        <Row label={t("お客さま", "Clients")} note={t("入会＝初めて回数券を買った人・体験で成約した人", "New = first session pass bought, or signed up after a trial")}>
          <span className="text-[11px] text-gray-500 mr-1">{t("在籍中", "Active")}</span><Big n={s.activeCustomers} unit={t("名", "")} />
          <span className="mx-2 text-gray-300">／</span>
          <span className="text-[11px] text-gray-500 mr-1">{t("今月入会", "New this month")}</span><Big n={s.joined} unit={t("名", "")} />
          {s.lastJoined > 0 && <span className="basis-full mt-0.5 text-[11px] text-gray-400">{t(`今月入会は先月の同じ日まで ${s.lastJoined}名`, `New by same day last month: ${s.lastJoined}`)}</span>}
          {s.joinedNames.length > 0 && (
            <span className="basis-full mt-1.5 flex flex-wrap gap-1">
              {s.joinedNames.map((name) => (
                <span key={name} className="border border-gold-200 bg-gold-50 px-2 py-0.5 text-[11px] font-bold text-gray-800">{name}</span>
              ))}
              {s.joined > s.joinedNames.length && (
                <span className="bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">{t(`ほか${s.joined - s.joinedNames.length}名`, `+${s.joined - s.joinedNames.length} more`)}</span>
              )}
            </span>
          )}
        </Row>

        <Row label={t("体験", "Trials")} note={t("予約は今月分（これから受ける分も含む）", "Booked = this month, including upcoming")}>
          <Step label={t("予約", "Booked")} n={s.trialBooked} unit={t("件", "")} />
          <span className="mx-1.5 text-gray-300">→</span>
          <Step label={t("実施", "Done")} n={s.trialHeld} unit={t("件", "")} />
          <span className="mx-1.5 text-gray-300">→</span>
          <Step label={t("成約", "Signed")} n={s.trialContracted} strong unit={t("件", "")} />
          {s.trialRate != null && <span className="basis-full mt-0.5 text-[11px] text-gray-500">{t("実施したうちの成約率", "Close rate")} {s.trialRate}%</span>}
        </Row>
      </div>

      {/* 売上の伸び（％のみ。金額は出さない） */}
      {(s.revenueGrowth != null || s.revenueGrowthYoY != null) && (
        <div className="mt-3 border-t border-gray-100 pt-3 flex items-center gap-4">
          <TrendingUp size={14} className="text-emerald-600 flex-shrink-0" />
          <div className="flex-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            {s.revenueGrowth != null && (
              <p className="text-[11px] text-gray-500">
                {t("売上は先月の今日と比べて", "Sales vs. same day last month")}
                <span className={s.revenueGrowth >= 0 ? "ml-1 text-sm font-bold text-emerald-600" : "ml-1 text-sm font-bold text-gray-500"}>
                  {s.revenueGrowth > 0 ? "+" : ""}{s.revenueGrowth}%
                </span>
              </p>
            )}
            {s.revenueGrowthYoY != null && (
              <p className="text-[11px] text-gray-500">
                {t("去年の同じ月とくらべて", "vs. same month last year")}
                <span className={s.revenueGrowthYoY >= 0 ? "ml-1 text-sm font-bold text-emerald-600" : "ml-1 text-sm font-bold text-gray-500"}>
                  {s.revenueGrowthYoY > 0 ? "+" : ""}{s.revenueGrowthYoY}%
                </span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* 12か月の本数（グラフ用のライブラリは使わない。読み込みを重くしないため） */}
      <div className="mt-3 border-t border-gray-100 pt-3">
        <p className="text-[11px] font-semibold text-gray-500 mb-1.5">{t("この1年のレッスン本数", "Sessions over the past year")}</p>
        {/* 棒の高さは px で指定する。
            % にすると、親の高さが決まっていないときに 0 になって何も出ない
            （棒を月名と同じ箱に入れていたため、実際それでグラフが真っ白になっていた）。
            棒と月名は別の行に分けて、棒の行だけ高さを固定する。 */}
        <div className="flex items-end gap-1" style={{ height: BAR_AREA }}>
          {s.monthlyCounts.map((m, i) => (
            <div
              key={m.month}
              title={`${monthLabel(m)} ${m.count}${t("本", "")}`}
              className={[
                "flex-1 rounded-t",
                i === s.monthlyCounts.length - 1 ? "bg-gold-500" : m.count > 0 ? "bg-blue-200" : "bg-gray-100",
              ].join(" ")}
              style={{ height: m.count > 0 ? Math.max(Math.round((m.count / max) * BAR_AREA), 3) : 2 }}
            />
          ))}
        </div>
        <div className="flex gap-1 mt-1">
          {s.monthlyCounts.map((m) => (
            <span key={m.month} className="flex-1 text-center text-[9px] text-gray-400">{monthLabel(m)}</span>
          ))}
        </div>
      </div>

      {/* 通算の節目 */}
      <div className="mt-3 border-t border-gray-100 pt-3 space-y-1">
        <p className="text-[11px] text-gray-500 flex items-center gap-1">
          <Sparkles size={11} className="text-amber-500 flex-shrink-0" />
          {t("これまでに届けたレッスン", "Sessions delivered so far")}
          <span className="mx-0.5 text-sm font-bold text-gray-900 tabular-nums">{s.totalLessons.toLocaleString("ja-JP")}</span>{t("本", "")}
          {s.nextMilestone && remaining > 0 && (
            <span className="text-gray-400">{t(`・あと${remaining.toLocaleString("ja-JP")}本で${s.nextMilestone.toLocaleString("ja-JP")}本`, ` · ${remaining.toLocaleString("en-US")} to go until ${s.nextMilestone.toLocaleString("en-US")}`)}</span>
          )}
        </p>
      </div>
    </SectionBox>
  );
}

/** 1行：左に見出し、右に数字。下に言葉の意味を小さく添える */
function Row({ label, note, children }: { label: string; note: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-2.5 first:pt-0">
      <p className="w-14 flex-shrink-0 pt-1 text-[11px] font-bold text-gray-700 flex items-start gap-1">
        <span aria-hidden className="mt-1 w-1.5 h-1.5 bg-[var(--portal-gold)] flex-shrink-0" />{label}
      </p>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-baseline">{children}</div>
        <p className="mt-0.5 text-[10px] text-gray-400">{note}</p>
      </div>
    </div>
  );
}

function Big({ n, unit }: { n: number; unit: string }) {
  return (
    <span className="whitespace-nowrap">
      <span className="text-lg font-bold text-gray-900 tabular-nums">{n}</span>
      <span className="text-xs text-gray-400 ml-0.5">{unit}</span>
    </span>
  );
}

function Step({ label, n, strong, unit = "件" }: { label: string; n: number; strong?: boolean; unit?: string }) {
  return (
    <span className="whitespace-nowrap">
      <span className="text-[11px] text-gray-500 mr-0.5">{label}</span>
      <span className={strong ? "text-lg font-bold text-gray-900 tabular-nums" : "text-base font-bold text-gray-800 tabular-nums"}>{n}</span>
      <span className="text-xs text-gray-400 ml-0.5">{unit}</span>
    </span>
  );
}

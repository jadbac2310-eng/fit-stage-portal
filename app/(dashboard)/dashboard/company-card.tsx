import { Building2, Sparkles, Users, TrendingUp } from "lucide-react";
import type { CompanyStats } from "@/lib/company-stats";
import { Delta } from "@/components/ui/delta";

/**
 * 「FIT STAGE のいま」。全員が見る。
 *
 * 出すのは本数・人数・率だけ。売上は伸び率(%)だけで、金額は出さない。
 * ここに渡ってくる CompanyStats にそもそも円の数字が入っていないので、
 * ブラウザに送られるデータにも金額は乗らない。
 *
 * 個人名の出る順位は出さない。下位になった人のやる気が確実に下がるため。
 */
export function CompanyCard({ stats }: { stats: CompanyStats }) {
  const s = stats;
  const max = Math.max(...s.monthlyCounts.map((m) => m.count), 1);
  const remaining = s.nextMilestone ? s.nextMilestone - s.totalLessons : 0;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 mb-6">
      <div className="flex items-center gap-1.5 mb-3">
        <Building2 size={14} className="text-blue-600" />
        <p className="text-xs font-bold text-gray-700">FIT STAGE のいま</p>
      </div>

      {/* 今月の数字 */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-[11px] font-semibold text-gray-500">今月のレッスン</p>
          <p className="flex items-baseline">
            <span className="text-lg font-bold text-gray-900 tabular-nums">{s.monthLessons}</span>
            <span className="text-xs text-gray-400 ml-0.5">本</span>
            <Delta now={s.monthLessons} prev={s.lastMonthLessons} goodWhenUp className="ml-1 text-[10px]" />
          </p>
          {s.lastMonthLessons > 0 && (
            <p className="text-[10px] text-gray-400">先月の今日 {s.lastMonthLessons}本</p>
          )}
        </div>
        <div>
          <p className="text-[11px] font-semibold text-gray-500">今月の新規</p>
          <p className="flex items-baseline">
            <span className="text-lg font-bold text-gray-900 tabular-nums">{s.newCustomers}</span>
            <span className="text-xs text-gray-400 ml-0.5">名</span>
            <Delta now={s.newCustomers} prev={s.lastNewCustomers} goodWhenUp className="ml-1 text-[10px]" />
          </p>
          {s.lastNewCustomers > 0 && (
            <p className="text-[10px] text-gray-400">先月の今日 {s.lastNewCustomers}名</p>
          )}
        </div>
        <div>
          <p className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
            <Users size={10} className="text-gray-400" /> 在籍中
          </p>
          <p className="flex items-baseline">
            <span className="text-lg font-bold text-gray-900 tabular-nums">{s.activeCustomers}</span>
            <span className="text-xs text-gray-400 ml-0.5">名</span>
          </p>
        </div>
      </div>

      {/* 売上の伸び（％のみ。金額は出さない） */}
      {(s.revenueGrowth != null || s.revenueGrowthYoY != null) && (
        <div className="mt-3 border-t border-gray-100 pt-3 flex items-center gap-4">
          <TrendingUp size={14} className="text-emerald-600 flex-shrink-0" />
          <div className="flex-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            {s.revenueGrowth != null && (
              <p className="text-[11px] text-gray-500">
                売上は先月の今日と比べて
                <span className={s.revenueGrowth >= 0 ? "ml-1 text-sm font-bold text-emerald-600" : "ml-1 text-sm font-bold text-gray-500"}>
                  {s.revenueGrowth > 0 ? "+" : ""}{s.revenueGrowth}%
                </span>
              </p>
            )}
            {s.revenueGrowthYoY != null && (
              <p className="text-[11px] text-gray-500">
                去年の同じ月とくらべて
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
        <p className="text-[11px] font-semibold text-gray-500 mb-1.5">この1年のレッスン本数</p>
        <div className="flex items-end gap-1 h-16">
          {s.monthlyCounts.map((m, i) => (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-1" title={`${m.label} ${m.count}本`}>
              <div
                className={i === s.monthlyCounts.length - 1 ? "w-full rounded-t bg-blue-500" : "w-full rounded-t bg-blue-200"}
                style={{ height: `${Math.max((m.count / max) * 100, 2)}%` }}
              />
              <span className="text-[9px] text-gray-400">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 体験の成約率と通算の節目 */}
      <div className="mt-3 border-t border-gray-100 pt-3 space-y-1">
        {s.trialRate != null && (
          <p className="text-[11px] text-gray-500">
            今月の体験は{s.trialHeld}件・成約
            <span className="mx-1 text-sm font-bold text-gray-900">{s.trialContracted}件</span>
            （{s.trialRate}%）
          </p>
        )}
        <p className="text-[11px] text-gray-500 flex items-center gap-1">
          <Sparkles size={11} className="text-amber-500 flex-shrink-0" />
          これまでに届けたレッスン
          <span className="mx-0.5 text-sm font-bold text-gray-900 tabular-nums">{s.totalLessons.toLocaleString("ja-JP")}</span>本
          {s.nextMilestone && remaining > 0 && (
            <span className="text-gray-400">・あと{remaining.toLocaleString("ja-JP")}本で{s.nextMilestone.toLocaleString("ja-JP")}本</span>
          )}
        </p>
      </div>
    </div>
  );
}

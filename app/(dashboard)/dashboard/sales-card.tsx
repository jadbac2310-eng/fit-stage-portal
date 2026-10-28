import { Handshake, Users, TrendingUp } from "lucide-react";
import type { Coverage, SalesMonth } from "@/lib/sales-stats";
import type { FollowUp } from "@/lib/highlights-types";
import { CountUp } from "./count-up";
import { Delta } from "@/components/ui/delta";
import { FollowUpsSection } from "./follow-ups-section";

/**
 * 営業のための1枚。
 *
 * 売上は結果なので時間差が出る。ここでは「次の予約が入っている状態をつくれているか」を
 * いちばん大きく見せる。今日の行動がそのまま数字に出るため。
 * 担当のお客さまも成約もまだ無い人には出さない。
 *
 * 「声をかけたい人」はこの中の一番下にたたんで置く（営業の仕事なので営業カードに）。
 * 次の予定が入っていない人の名前も、上には出さずそこだけに出す。
 * 成約の連続記録と称号は、レッスンの連続と同じ1枚（StreakBadges）にまとめた。
 */
export function SalesCard({
  coverage, month, follows = [], unassigned = [],
}: {
  coverage: Coverage;
  month: SalesMonth;
  /** 自分の担当で声をかけたい人（画面側で絞り込み済み） */
  follows?: FollowUp[];
  /** 担当営業が未設定で誰の画面にも出ていない人（管理者のみ） */
  unassigned?: FollowUp[];
}) {
  if (coverage.total === 0 && month.contracts === 0 && follows.length === 0 && unassigned.length === 0) return null;

  const diff = coverage.lastRate == null ? null : coverage.rate - coverage.lastRate;
  const mDiff = month.contracts - month.lastContracts;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 mb-6">
      <div className="flex items-center gap-1.5 mb-3">
        <Handshake size={14} className="text-emerald-600" />
        <p className="text-xs font-bold text-gray-700">営業の自分</p>
      </div>

      {/* 次の予定カバー率 */}
      {coverage.total > 0 && (
        <div className="mb-3">
          <div className="flex items-baseline gap-2">
            <p className="text-xs font-semibold text-gray-500">次の予定が入っている人</p>
            <p className="ml-auto text-sm text-gray-500">
              <span className="text-xl font-bold text-gray-900">{coverage.covered}</span>
              <span className="text-gray-400"> / {coverage.total}名</span>
            </p>
          </div>

          <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={[
                "h-full rounded-full transition-all",
                coverage.rate >= 90 ? "bg-emerald-500" : coverage.rate >= 70 ? "bg-blue-500" : "bg-amber-500",
              ].join(" ")}
              style={{ width: `${coverage.rate}%` }}
            />
          </div>

          <p className="mt-1 text-xs">
            <span className="font-bold text-gray-800">{coverage.rate}%</span>
            {diff != null && (
              <span className={diff > 0 ? "text-green-600 font-semibold" : diff < 0 ? "text-rose-600 font-semibold" : "text-gray-400"}>
                {diff === 0 ? "　先週と同じ" : `　先週より ${diff > 0 ? "+" : ""}${diff}pt`}
              </span>
            )}
            {coverage.uncovered.length > 0 && (
              <span className="text-gray-400">　入っていない{coverage.uncovered.length}名は下の「声をかけたい人」に</span>
            )}
          </p>
        </div>
      )}

      {/* 今月の数字 */}
      <div className="grid grid-cols-3 gap-2 border-t border-gray-100 pt-3">
        <div>
          <p className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
            <Handshake size={10} className="text-gray-400" /> 今月の成約
          </p>
          <CountUp value={month.contracts} suffix="件" className="block text-lg font-bold text-gray-900" />
          {month.lastContracts > 0 && (
            <p className="text-[10px] text-gray-400">
              先月の今日 {month.lastContracts}件{mDiff > 0 ? `・+${mDiff}` : mDiff < 0 ? `・${mDiff}` : "・同じ"}
            </p>
          )}
        </div>
        <div>
          <p className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
            <Users size={10} className="text-gray-400" /> 担当のお客さま
          </p>
          <CountUp value={month.customers} suffix="名" className="block text-lg font-bold text-gray-900" />
        </div>
        <div>
          <p className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
            <TrendingUp size={10} className="text-gray-400" /> 担当の今月の本数
          </p>
          <p className="flex items-baseline">
            <CountUp value={month.lessons} suffix="本" className="text-lg font-bold text-gray-900" />
            <Delta now={month.lessons} prev={month.lastLessons} goodWhenUp className="ml-1 text-[10px]" />
          </p>
          {month.lastLessons > 0 && (
            <p className="text-[10px] text-gray-400">先月の今日 {month.lastLessons}本</p>
          )}
        </div>
      </div>

      {/* 声をかけたい人（閉じた状態では人数と内訳だけ） */}
      <FollowUpsSection follows={follows} unassigned={unassigned} />
    </div>
  );
}

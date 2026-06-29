import Link from "next/link";
import {
  Dumbbell, TrendingUp,
  ChevronRight, MapPin,
} from "lucide-react";
import { getCurrentMember, getMembers, ensureMemberLinkCode } from "@/lib/members";
import { isLineConfigured } from "@/lib/line";
import { LineLinkCard } from "./line-link-card";
import { getLessons } from "@/lib/lessons";
import { getTrialLessons } from "@/lib/trial-lessons";
import { getCustomers } from "@/lib/customers";
import { getAllSessionPasses } from "@/lib/session-passes";
import { getAllCustomerPlans } from "@/lib/customer-plans";
import { getAllPlans, buildLessonFeeMap } from "@/lib/plans-master";
import { buildTrainerEntries, buildSalesEntries, type CommissionContext } from "@/lib/commissions";

export const dynamic = "force-dynamic";

function thisMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
function isoToMonth(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function yen(n: number) {
  return `¥${n.toLocaleString("ja-JP")}`;
}

function isPastIso(iso: string): boolean {
  return new Date(iso).getTime() <= Date.now();
}

export default async function DashboardPage() {
  const [
    currentMember,
    lessons,
    trialLessons,
    customers,
  ] =
    await Promise.all([
      getCurrentMember(),
      getLessons(),
      getTrialLessons(),
      getCustomers(),
    ]);

  const [sessionPasses, customerPlans, members, plansMaster] = await Promise.all([
    getAllSessionPasses(),
    getAllCustomerPlans(),
    getMembers(),
    getAllPlans(),
  ]);
  const ctx: CommissionContext = {
    customers, sessionPasses, customerPlans,
    members: members.map((m) => ({ id: m.id, name: m.name, commissionRate: m.commissionRate })),
    lessonFees: buildLessonFeeMap(plansMaster),
  };

  // ─── 今月サマリー（個人向け） ──────────────────────────
  const mon = thisMonth();
  const myId = currentMember?.id;

  const completedThisMonth = lessons.filter(
    (l) => l.status === "completed" && isoToMonth(l.scheduledAt) === mon
  );

  // 自分の今月の完了／予定レッスン（通常レッスンのトレーナー担当分）
  const myCompletedThisMonth = completedThisMonth.filter((l) => l.trainerMemberId === myId);
  const myScheduledThisMonth = lessons.filter(
    (l) => l.status === "scheduled" && isoToMonth(l.scheduledAt) === mon && l.trainerMemberId === myId
  );

  // 自分の今月の歩合（見込み）
  const contractedTrials = trialLessons.filter((tl) => tl.contracted === true);
  const myTrainerCommission = buildTrainerEntries(completedThisMonth, mon, ctx)
    .find((e) => e.memberId === myId)?.total ?? 0;
  const mySalesCommission = buildSalesEntries(completedThisMonth, contractedTrials, mon, ctx)
    .find((e) => e.memberId === myId)?.total ?? 0;
  const myCommissionThisMonth = myTrainerCommission + mySalesCommission;

  // 自分の今後の予定（通常＝担当トレーナー、体験＝担当トレーナー/営業、未来かつ予定中、直近5件）
  const myUpcoming = [
    ...lessons
      .filter((l) => l.trainerMemberId === myId && l.status === "scheduled" && !isPastIso(l.scheduledAt))
      .map((l) => ({ id: l.id, type: "regular" as const, customerName: l.customerName, scheduledAt: l.scheduledAt, location: l.location })),
    ...trialLessons
      .filter((t) => (t.trainerMemberId === myId || t.salesMemberId === myId) && t.status === "scheduled" && !isPastIso(t.scheduledAt))
      .map((t) => ({ id: t.id, type: "trial" as const, customerName: t.customerName, scheduledAt: t.scheduledAt, location: t.location })),
  ].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

  // LINE通知の連携カード（トークン設定済みのときのみ表示）
  const lineEnabled = isLineConfigured();
  const lineLinked = !!currentMember?.lineUserId;
  const lineCode = lineEnabled && currentMember && !lineLinked
    ? await ensureMemberLinkCode(currentMember.id)
    : null;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6 hidden md:block">
        <h1 className="text-xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="text-sm text-gray-500 mt-0.5">FIT STAGE ポータル</p>
      </div>

      {/* 今月の自分 */}
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
        今月の自分
      </h2>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link href="/commissions" className="bg-blue-50 rounded-2xl border border-blue-100 p-4 hover:border-blue-300 transition">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={13} className="text-blue-500" />
            <p className="text-xs font-semibold text-blue-600">今月の自分の歩合</p>
          </div>
          <p className="text-2xl font-bold text-blue-700">{yen(myCommissionThisMonth)}</p>
          <p className="text-xs text-blue-400 mt-0.5">見込み・タップで内訳</p>
        </Link>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <Dumbbell size={13} className="text-gray-400" />
            <p className="text-xs font-semibold text-gray-500">自分のレッスン</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{myCompletedThisMonth.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">完了・予定 {myScheduledThisMonth.length}件</p>
        </div>
      </div>

      {/* 自分の予定 */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">自分の予定</h2>
        <Link href="/schedule" className="text-xs font-semibold text-blue-600 flex items-center gap-0.5 hover:underline">
          すべて見る <ChevronRight size={13} />
        </Link>
      </div>
      {myUpcoming.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center mb-6">
          <p className="text-3xl mb-2">🌤️</p>
          <p className="text-sm text-gray-500">今後の予定はありません</p>
        </div>
      ) : (
        <div className="space-y-2 mb-6">
          {myUpcoming.slice(0, 5).map((it) => (
            <Link key={`${it.type}-${it.id}`} href={`/schedule/${it.id}`}
              className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 px-4 py-3 hover:border-blue-300 transition">
              <div className="flex flex-col items-center justify-center min-w-[44px]">
                <span className="text-xs font-semibold text-gray-400">
                  {new Date(it.scheduledAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", timeZone: "Asia/Tokyo" })}
                </span>
                <span className="text-sm font-bold text-gray-900 tabular-nums">
                  {new Date(it.scheduledAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" })}
                </span>
              </div>
              <div className="flex-1 min-w-0 border-l border-gray-100 pl-3">
                <div className="flex items-center gap-1.5">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${it.type === "trial" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                    {it.type === "trial" ? "体験" : "通常"}
                  </span>
                  <span className="text-sm font-semibold text-gray-900 truncate">{it.customerName}</span>
                </div>
                {it.location && (
                  <span className="flex items-center gap-0.5 text-xs text-gray-400 mt-0.5 min-w-0">
                    <MapPin size={10} className="flex-shrink-0" />
                    <span className="truncate">{it.location}</span>
                  </span>
                )}
              </div>
              <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
            </Link>
          ))}
          {myUpcoming.length > 5 && (
            <p className="text-xs text-gray-400 text-center pt-1">ほか {myUpcoming.length - 5} 件</p>
          )}
        </div>
      )}

      {lineEnabled && (
        <div className="mt-6">
          <LineLinkCard linked={lineLinked} code={lineCode} oaUrl={process.env.LINE_OA_URL} />
        </div>
      )}
    </div>
  );
}

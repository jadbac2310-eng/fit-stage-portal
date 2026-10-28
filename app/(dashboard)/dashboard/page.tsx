import Link from "next/link";
import { cn } from "@/lib/cn";
import {
  Dumbbell, TrendingUp,
  ChevronRight, MapPin,
} from "lucide-react";
import { getCurrentMember, getMembers, ensureMemberLinkCode } from "@/lib/members";
import { isLineConfigured } from "@/lib/line";
import { anyStaffNotifyEnabled } from "@/lib/line-notify";
import { LineLinkCard } from "./line-link-card";
import { getLessons } from "@/lib/lessons";
import { getTrialLessons } from "@/lib/trial-lessons";
import { getCustomers, isFctCustomer } from "@/lib/customers";
import { getAllSessionPasses } from "@/lib/session-passes";
import { getAllCustomerPlans } from "@/lib/customer-plans";
import { getAllPlans, buildLessonFeeMap } from "@/lib/plans-master";
import { getMemberCustomerRates } from "@/lib/commission-rates";
import { getFctStores } from "@/lib/fct-stores";
import { buildTrainerEntries, buildSalesEntries, type CommissionContext } from "@/lib/commissions";
import { isBillableLessonStatus } from "@/lib/lessons-types";
import {
  pendingTrainerLessons, trainerCommissionInRange, trainerMonthProjection,
  trialConversion, lastMonthSameDayRange, monthToDateRange,
  trainerLessonCountInRange, trialConversionInRange, lastMonthFullRange,
} from "@/lib/trainer-stats";
import { PendingLessonsCard } from "./pending-lessons-card";
import { todayHeadline, todayMilestones, followUps, myCustomerIds } from "@/lib/highlights-types";
import { randomQuote } from "@/lib/daily-quote";
import { TodayCard } from "./today-card";
import { weeklyStreak, earnedBadges, earnedToday } from "@/lib/badges-types";
import { missionOfTheDay, tipOfTheDay, fortuneOfTheDay, greeting, seasonal } from "@/lib/daily-cards";
import { Confetti } from "@/components/ui/confetti";
import { StreakBadges } from "./streak-badges";
import { nextVisitCoverage, salesMonth, salesStreak, salesBadges } from "@/lib/sales-stats";
import { SalesCard } from "./sales-card";
import { CountUp } from "./count-up";
import { Delta } from "@/components/ui/delta";
import { tieredLessonPricesAll } from "@/lib/session-tiers";
import { companyStats } from "@/lib/company-stats";
import { CompanyCard } from "./company-card";

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
  // 読み込みは1回にまとめて全部同時に取る（2回に分けると往復のぶんだけ表示が遅れる）。
  // 下で足している「今日のひとこと」「節目」「声かけリスト」は、
  // ここで取ったデータから計算するだけなので、読み込みは1件も増えていない。
  const [
    currentMember, lessons, trialLessons, customers,
    sessionPasses, customerPlans, members, plansMaster, allRates, fctStores,
  ] = await Promise.all([
    getCurrentMember(),
    getLessons(),
    getTrialLessons(),
    getCustomers(),
    getAllSessionPasses(),
    getAllCustomerPlans(),
    getMembers(),
    getAllPlans(),
    getMemberCustomerRates(),
    getFctStores(),
  ]);
  const ctx: CommissionContext = {
    customers, sessionPasses, customerPlans,
    members: members.map((m) => ({ id: m.id, name: m.name, isOwner: m.isOwner })),
    // 歩合率は他人ぶんを渡さない（本人または管理者のみ）
    trainerRates: allRates
      .filter((r) => currentMember?.isAdmin || r.memberId === currentMember?.id)
      .map((r) => ({ memberId: r.memberId, customerId: r.customerId, rate: r.rate, fixedAmount: r.fixedAmount })),
    lessonFees: buildLessonFeeMap(plansMaster),
    fctStores: fctStores.map((f) => ({ id: f.id, rate: f.rate })),
    // 段階単価（まとめた人数の合計で単価が変わる契約）。請求書と同じ単価で歩合を出すため
    tieredPrices: tieredLessonPricesAll({ customers, lessons }),
  };

  // ─── 今月サマリー（個人向け） ──────────────────────────
  const mon = thisMonth();
  const myId = currentMember?.id;

  const completedThisMonth = lessons.filter(
    (l) => isBillableLessonStatus(l.status) && isoToMonth(l.scheduledAt) === mon
  );
  const completedTrialsThisMonth = trialLessons.filter(
    (tl) => tl.status === "completed" && isoToMonth(tl.scheduledAt) === mon
  );

  // 自分の今月の完了／予定レッスン（通常レッスンのトレーナー担当分）
  const myCompletedThisMonth = completedThisMonth.filter((l) => l.trainerMemberId === myId);
  const myScheduledThisMonth = lessons.filter(
    (l) => l.status === "scheduled" && isoToMonth(l.scheduledAt) === mon && l.trainerMemberId === myId
  );

  // 自分の今月の歩合（見込み）
  const contractedTrials = trialLessons.filter((tl) => tl.contracted === true);
  const myTrainerCommission = buildTrainerEntries(completedThisMonth, completedTrialsThisMonth, mon, ctx)
    .find((e) => e.memberId === myId)?.total ?? 0;
  const mySalesCommission = buildSalesEntries(completedThisMonth, contractedTrials, mon, ctx)
    .find((e) => e.memberId === myId)?.total ?? 0;
  const myCommissionThisMonth = myTrainerCommission + mySalesCommission;

  // ─── やる気が出る数字（すべて「自分に払われる歩合」。売上ではない） ───
  const now = new Date();
  // 終わったのに「予定」のままのレッスン。完了にすると歩合になる
  const pendingRows = myId ? pendingTrainerLessons(lessons, trialLessons, myId, now, ctx) : [];
  // 先月の同じ日までと比べる（月の途中でも同じ条件で比べられる）
  const mtd  = monthToDateRange(now);
  const last = lastMonthSameDayRange(now);
  const myThisMtd = myId ? trainerCommissionInRange(lessons, trialLessons, myId, mtd.from, mtd.to, ctx) : 0;
  const myLastMtd = myId ? trainerCommissionInRange(lessons, trialLessons, myId, last.from, last.to, ctx) : 0;
  const diffPercent = myLastMtd > 0 ? Math.round(((myThisMtd - myLastMtd) / myLastMtd) * 100) : null;
  // 本数も同じ条件（先月の同じ日まで）で比べる
  const myCountLastMtd = myId ? trainerLessonCountInRange(lessons, trialLessons, myId, last.from, last.to) : 0;
  // 着地見込み: 今の確定 ＋ 完了待ち ＋ これからの予定
  const pendingTotal = pendingRows.reduce((s, r) => s + r.amount, 0);
  const projection = myId ? trainerMonthProjection(lessons, trialLessons, myId, mon, now, ctx) : { remaining: 0, count: 0 };
  const forecast = myCommissionThisMonth + pendingTotal + projection.remaining;
  // 着地見込みは「先月の最終結果」と比べる。月末にいくらになるかの話なので、同日までではなく先月まるごと
  const lastFull = lastMonthFullRange(now);
  const myLastMonthFinal = myId ? trainerCommissionInRange(lessons, trialLessons, myId, lastFull.from, lastFull.to, ctx) : 0;
  // 体験の成約率（担当トレーナーまたは担当営業として関わったぶん）
  const conv = myId ? trialConversion(trialLessons, myId, mon) : null;
  const lastConv = myId ? trialConversionInRange(trialLessons, myId, last.from, last.to) : null;

  // 会社全体の数字（全員に見せる）。売上は伸び率(%)だけで、金額は client に渡さない
  const company = companyStats(customers, lessons, trialLessons, ctx, now);

  // 自分の今後の予定（通常＝担当トレーナー、体験＝担当トレーナー/営業、未来かつ予定中、直近5件）
  const myUpcoming = [
    ...lessons
      .filter((l) => l.trainerMemberId === myId && l.status === "scheduled" && !isPastIso(l.scheduledAt))
      .map((l) => ({ id: l.id, type: "regular" as const, customerName: l.customerName, scheduledAt: l.scheduledAt, location: l.location })),
    ...trialLessons
      .filter((t) => (t.trainerMemberId === myId || t.salesMemberId === myId) && t.status === "scheduled" && !isPastIso(t.scheduledAt))
      .map((t) => ({ id: t.id, type: "trial" as const, customerName: t.customerName, scheduledAt: t.scheduledAt, location: t.location })),
  ].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

  // ─── 今日のひとこと・節目・声かけリスト（追加の読み込みなし） ───
  // 自分の担当（指導する回＋担当営業のお客さま）だけに絞る
  const mine = { memberId: myId, customerIds: myCustomerIds(customers, myId) };
  const headline   = todayHeadline(lessons, trialLessons, now, mine);
  // FIT STAGE全体の数。これは全員が見られるようにする（チームの動きが見えるほうが気持ちが乗る）
  const teamHeadline = todayHeadline(lessons, trialLessons, now);
  const milestones = todayMilestones(lessons, trialLessons, now, mine);
  // 声かけリストは「担当営業が自分のお客さま」だけ。自分の持ち場だけが出るようにする。
  const allFollows = followUps(customers, lessons, trialLessons, sessionPasses, customerPlans, now);
  const follows    = allFollows.filter((f) => f.salesMemberId && f.salesMemberId === myId);
  // 担当営業が未設定だと誰の画面にも出ない。管理者にだけ名前を出して、取りこぼしを防ぐ。
  // FCT経由のお客さまはそもそも担当営業が付かない作りなので、ここには入れない。
  const fctIds = new Set(customers.filter(isFctCustomer).map((c) => c.id));
  const unassigned = currentMember?.isAdmin
    ? allFollows.filter((f) => !f.salesMemberId && !fctIds.has(f.customerId))
    : [];
  // 格言は開くたびに変える（1日1つだと、だんだん見なくなるため）
  const quote      = randomQuote();
  // 連続記録と称号（自分の担当ぶんだけ）
  const streak = weeklyStreak(lessons, trialLessons, myId, now);
  const badges = earnedBadges(lessons, trialLessons, myId, streak, now);
  // ─── 営業の自分 ───────────────────────────────────────
  const coverage   = nextVisitCoverage(customers, lessons, trialLessons, myId, now);
  const sMonth     = salesMonth(customers, lessons, trialLessons, myId, now);
  const sStreak    = salesStreak(trialLessons, myId, now);
  const sBadges    = salesBadges(trialLessons, myId, sMonth, sStreak, coverage, now);

  const celebrate = earnedToday([...badges, ...sBadges], now);
  const mission = missionOfTheDay(now);
  const tip     = tipOfTheDay(now);
  const fortune = fortuneOfTheDay(now, myId);   // 運勢だけは人ごとに変える
  const hello   = greeting(now);
  const season  = seasonal(now);

  // LINE通知の連携カード（トークン設定済み かつ 従業員向け通知が1つでも有効なときのみ表示）
  const lineEnabled = isLineConfigured() && anyStaffNotifyEnabled();
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

      {celebrate && <Confetti />}

      {/* あいさつ・季節のひとこと */}
      <div className="mb-3">
        <p className="text-sm font-bold text-gray-800">
          {hello}{currentMember?.name ? `、${currentMember.name}さん` : ""}
        </p>
        {season && (
          <p className="text-xs text-gray-500 mt-0.5">
            <span className="mr-1">{season.emoji}</span>{season.text}
          </p>
        )}
      </div>

      {/* 日替わりの1枚・今日のひとこと・節目 */}
      <TodayCard headline={headline} teamHeadline={teamHeadline} milestones={milestones} quote={quote}
        mission={mission} tip={tip} fortune={fortune} />

      {/* 連続記録と称号（レッスンの連続と成約の連続を1枚に） */}
      <StreakBadges streak={streak} badges={badges} salesStreak={sStreak} salesBadges={sBadges} />

      {/* 営業の自分（名前は出さない。声かけリストと同じ人になるため） */}
      <SalesCard coverage={coverage} month={sMonth} />

      {/* 完了にしていないレッスン（完了＝歩合になる） */}
      {pendingRows.length > 0 && <PendingLessonsCard rows={pendingRows} />}

      {/* FIT STAGE のいま（全員に見せる。金額は出さない）。声をかけたい人もこの中に小さく */}
      <CompanyCard stats={company} follows={follows} unassigned={unassigned} />

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
          <CountUp value={myCommissionThisMonth} prefix="¥" className="text-2xl font-bold text-blue-700" />
          {diffPercent === null ? (
            <p className="text-xs text-blue-400 mt-0.5">タップで内訳</p>
          ) : (
            <p className={cn("text-xs mt-0.5 font-semibold", diffPercent >= 0 ? "text-green-600" : "text-gray-400")}>
              先月の同日 {yen(myLastMtd)} と比べて {diffPercent >= 0 ? "+" : ""}{diffPercent}%
            </p>
          )}
        </Link>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <Dumbbell size={13} className="text-gray-400" />
            <p className="text-xs font-semibold text-gray-500">今月の完了レッスン</p>
          </div>
          <p className="flex items-baseline">
            <CountUp value={myCompletedThisMonth.length} className="text-2xl font-bold text-gray-900" />
            <Delta now={myCompletedThisMonth.length} prev={myCountLastMtd} goodWhenUp />
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            このあとの予定 {myScheduledThisMonth.length}件
            {myCountLastMtd > 0 && <>・先月の同日 {myCountLastMtd}本</>}
          </p>
        </div>
      </div>

      {/* 着地見込みと成約率 */}
      {(projection.count > 0 || pendingTotal > 0 || (conv && conv.held > 0)) && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6 space-y-3">
          {(projection.count > 0 || pendingTotal > 0) && (
            <div>
              <p className="text-xs font-semibold text-gray-500">今月の着地見込み</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5 flex items-baseline">
                {yen(forecast)}
                <Delta now={forecast} prev={myLastMonthFinal} goodWhenUp />
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                いまの確定 {yen(myCommissionThisMonth)}
                {pendingTotal > 0 && ` ＋ 完了待ち ${yen(pendingTotal)}`}
                {projection.count > 0 && ` ＋ これからの予定${projection.count}件 ${yen(projection.remaining)}`}
              </p>
              {myLastMonthFinal > 0 && (
                <p className="text-[11px] text-gray-400 mt-0.5">
                  先月は最終 {yen(myLastMonthFinal)}
                  {forecast > myLastMonthFinal
                    ? `・このペースなら ${yen(forecast - myLastMonthFinal)} 上まわります`
                    : `・あと ${yen(myLastMonthFinal - forecast)} で先月に並びます`}
                </p>
              )}
            </div>
          )}
          {conv && conv.held > 0 && (
            <div className={cn(projection.count > 0 || pendingTotal > 0 ? "pt-3 border-t border-gray-100" : "")}>
              <p className="text-xs font-semibold text-gray-500">今月の体験の成約率</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">
                {conv.rate}% <span className="text-sm font-medium text-gray-500">（{conv.held}件中 {conv.contracted}件）</span>
                <Delta now={conv.rate ?? 0} prev={lastConv?.rate} goodWhenUp />
              </p>
              {lastConv && lastConv.rate != null && (
                <p className="text-[11px] text-gray-400 mt-0.5">
                  先月の同日まで {lastConv.rate}%（{lastConv.held}件中 {lastConv.contracted}件）
                </p>
              )}
              {conv.unknown > 0 && (
                <Link href="/lessons/trial" className="text-[11px] text-amber-700 mt-0.5 inline-block hover:underline">
                  結果が未入力の体験が{conv.unknown}件あります →
                </Link>
              )}
            </div>
          )}
        </div>
      )}

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
          {/* 残りはスケジュールで見られるので、文字で置かずにそこへ飛ばす */}
          {myUpcoming.length > 5 && (
            <Link href="/schedule" className="block text-xs font-semibold text-blue-600 text-center pt-1 hover:underline">
              ほか {myUpcoming.length - 5} 件を見る →
            </Link>
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

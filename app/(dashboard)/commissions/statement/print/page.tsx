import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getCustomers } from "@/lib/customers";
import { getLessons } from "@/lib/lessons";
import { getTrialLessons } from "@/lib/trial-lessons";
import { getHourlyTasks } from "@/lib/hourly-tasks";
import { getCurrentMember, getMembers } from "@/lib/members";
import { getAllSessionPasses } from "@/lib/session-passes";
import { getAllCustomerPlans } from "@/lib/customer-plans";
import { getAllPlans, buildLessonFeeMap, getAllSessionPassPrices, buildSessionPassPriceMap } from "@/lib/plans-master";
import { getMemberCustomerRates } from "@/lib/commission-rates";
import { getFctStores } from "@/lib/fct-stores";
import { getCommissionAdjustments } from "@/lib/commission-adjustments";
import { isBillableLessonStatus } from "@/lib/lessons-types";
import { type CommissionContext } from "@/lib/commissions";
import { tieredLessonPricesAll } from "@/lib/session-tiers";
import { buildTrainerStatements, type StatementLine, type HourlyStatementLine, type AdjustmentStatementLine } from "@/lib/commission-statement";
import { ISSUER, monthLabel, taxBreakdown } from "@/lib/invoices";
import { payDateLabel } from "@/lib/commission-pay-date";
import { StatementActions } from "./statement-actions";

export const dynamic = "force-dynamic";

function yen(n: number) {
  return `¥${n.toLocaleString("ja-JP")}`;
}

function statementNumber(month: string, memberId: string): string {
  return `PAY-${month.replace("-", "")}-${memberId.slice(0, 6).toUpperCase()}`;
}

function LineTable({ title, lines, total }: { title: string; lines: StatementLine[]; total: number }) {
  if (lines.length === 0) return null;
  return (
    <div className="mb-6">
      <p className="text-sm font-bold text-gray-700 mb-2">{title}</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-gray-300 text-gray-500">
            <th className="text-left py-2 font-medium w-28">日付</th>
            <th className="text-left py-2 font-medium">顧客</th>
            <th className="text-left py-2 font-medium">内容</th>
            <th className="text-right py-2 font-medium w-28">金額</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i} className="border-b border-gray-100">
              <td className="py-2 text-gray-500">{l.date}</td>
              <td className="py-2 text-gray-800">{l.customerName}</td>
              <td className="py-2 text-gray-600">{l.label}</td>
              <td className="py-2 text-right text-gray-800 tabular-nums">{yen(l.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="py-2 text-right text-sm font-bold text-gray-700">小計</td>
            <td className="py-2 text-right text-base font-bold text-gray-900 tabular-nums">{yen(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function HourlyLineTable({ lines, total }: { lines: HourlyStatementLine[]; total: number }) {
  if (lines.length === 0) return null;
  return (
    <div className="mb-6">
      <p className="text-sm font-bold text-gray-700 mb-2">業務</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-gray-300 text-gray-500">
            <th className="text-left py-2 font-medium w-28">日付</th>
            <th className="text-left py-2 font-medium">業務内容</th>
            <th className="text-right py-2 font-medium w-20">時間</th>
            <th className="text-right py-2 font-medium w-28">金額</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i} className="border-b border-gray-100">
              <td className="py-2 text-gray-500">{l.date}</td>
              <td className="py-2 text-gray-800">{l.title}</td>
              <td className="py-2 text-right text-gray-600 tabular-nums">{l.hours}h</td>
              <td className="py-2 text-right text-gray-800 tabular-nums">{yen(l.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="py-2 text-right text-sm font-bold text-gray-700">小計</td>
            <td className="py-2 text-right text-base font-bold text-gray-900 tabular-nums">{yen(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/**
 * 前払いの差し引き・立替の精算。
 *
 * ここを出さずに合計だけ減らすと、受け取る側は「なんで少ないの？」になる。
 * 何がいくら引かれたのかを必ず明細に残す。
 *
 * 総支給額は減らさない。減るのは支給日に振り込む額だけ。
 * 前払いは「すでに渡したぶんを戻してもらう」だけで、働いた対価そのものは変わらないため。
 */
function AdjustmentTable({
  lines, total, rewardTotal, payable,
}: { lines: AdjustmentStatementLine[]; total: number; rewardTotal: number; payable: number }) {
  if (lines.length === 0) return null;
  return (
    <div className="mb-6">
      <p className="text-sm font-bold text-gray-700 mb-2">調整（前払いの差し引き・立替の精算）</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-gray-300 text-gray-500">
            <th className="text-left py-2 font-medium">内容</th>
            <th className="text-right py-2 font-medium w-28">金額</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i} className="border-b border-gray-100">
              <td className="py-2 text-gray-800">
                {l.label}
                {l.note && <span className="text-xs text-gray-500 ml-1.5">{l.note}</span>}
              </td>
              <td className={`py-2 text-right tabular-nums ${l.amount < 0 ? "text-red-600" : "text-gray-800"}`}>
                {l.amount < 0 ? `−${yen(Math.abs(l.amount))}` : yen(l.amount)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-b border-gray-100">
            <td className="py-2 text-right text-sm font-bold text-gray-700">総支給額</td>
            <td className="py-2 text-right text-sm font-bold text-gray-700 tabular-nums">{yen(rewardTotal)}</td>
          </tr>
          <tr className="border-b border-gray-100">
            <td className="py-2 text-right text-sm font-bold text-gray-700">調整 小計</td>
            <td className={`py-2 text-right text-sm font-bold tabular-nums ${total < 0 ? "text-red-600" : "text-gray-700"}`}>
              {total < 0 ? `−${yen(Math.abs(total))}` : yen(total)}
            </td>
          </tr>
          <tr>
            <td className="py-2 text-right text-sm font-bold text-gray-700">お振込額</td>
            <td className="py-2 text-right text-base font-bold text-gray-900 tabular-nums">{yen(payable)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default async function CommissionStatementPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ member?: string; month?: string }>;
}) {
  const currentMember = await getCurrentMember();
  if (!currentMember?.isAdmin) notFound();

  const { member: memberId, month } = await searchParams;
  if (!memberId || !month) notFound();

  const [customers, lessons, trialLessons, hourlyTasks, sessionPasses, customerPlans, members, plansMaster, sessionPassPrices, allRates, fctStores, adjustments] = await Promise.all([
    getCustomers(),
    getLessons(),
    getTrialLessons(),
    getHourlyTasks(),
    getAllSessionPasses(),
    getAllCustomerPlans(),
    getMembers(),
    getAllPlans(),
    getAllSessionPassPrices(),
    getMemberCustomerRates(),
    getFctStores(),
    getCommissionAdjustments(),
  ]);

  const trainer = members.find((m) => m.id === memberId);
  if (!trainer) notFound();

  const ctx: CommissionContext = {
    customers, sessionPasses, customerPlans,
    members: members.map((m) => ({ id: m.id, name: m.name, isOwner: m.isOwner })),
    trainerRates: allRates.map((r) => ({ memberId: r.memberId, customerId: r.customerId, rate: r.rate, fixedAmount: r.fixedAmount })),
    lessonFees: buildLessonFeeMap(plansMaster),
    sessionPassPriceMap: buildSessionPassPriceMap(sessionPassPrices),
    fctStores: fctStores.map((f) => ({ id: f.id, rate: f.rate })),
    // 段階単価（請求書と同じ単価で歩合を出す）
    tieredPrices: tieredLessonPricesAll({ customers, lessons }),
  };

  const completedLessons = lessons.filter((l) => isBillableLessonStatus(l.status));
  const completedTrialLessons = trialLessons.filter((l) => l.status === "completed");
  const contractedTrialLessons = trialLessons.filter((l) => l.contracted === true);
  const statement = buildTrainerStatements(completedLessons, completedTrialLessons, contractedTrialLessons, hourlyTasks, month, ctx, adjustments)
    .find((s) => s.memberId === memberId);

  const trainerLines = statement?.trainerLines ?? [];
  const salesLines = statement?.salesLines ?? [];
  const hourlyLines = statement?.hourlyLines ?? [];
  const adjustmentLines = statement?.adjustmentLines ?? [];
  const adjustmentTotal = statement?.adjustmentTotal ?? 0;
  // total は報酬の合計（レッスン＋営業＋業務）。前払いの差し引きは報酬ではないので、
  // 消費税の内訳は差し引く前の報酬から割り戻す。振り込む額は payable。
  const total = statement?.total ?? 0;
  const payable = statement?.payable ?? 0;
  const tax = taxBreakdown(total); // 各金額は税込扱い → 税抜/消費税に割り戻す
  const stmtNo = statementNumber(month, memberId);
  const pdfHref = `/commissions/statement/print/pdf?member=${memberId}&month=${month}`;
  const pdfFilename = `コミッション明細_${trainer.name}_${month}.pdf`;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* 操作バー */}
      <div className="flex items-center justify-between mb-4">
        <Link href={`/commissions/statement?month=${month}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition">
          <ChevronLeft size={15} /> 一覧
        </Link>
        <StatementActions pdfHref={pdfHref} filename={pdfFilename} />
      </div>
      <p className="text-xs text-gray-400 mb-4">下はプレビューです。単価・歩合率は表示されません。「PDF」でダウンロード、「共有」でLINE等に送れます。</p>

      {/* 明細本体 */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-10 print:border-0 print:p-0 print:rounded-none">
        <h1 className="text-2xl font-bold text-center tracking-widest text-gray-900 mb-6">コミッション明細</h1>

        <div className="flex justify-between items-start gap-6 mb-8">
          {/* 宛先 */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 border-b border-gray-400 pb-1 inline-block">{trainer.name} 様</p>
            {trainer.invoiceNumber && <p className="text-xs text-gray-500 mt-2">登録番号: {trainer.invoiceNumber}</p>}
          </div>
          {/* 発行元 */}
          <div className="text-right text-xs text-gray-600 flex-shrink-0">
            <p className="text-sm font-bold text-gray-900">{ISSUER.name}</p>
            {ISSUER.contact && <p>担当: {ISSUER.contact}</p>}
            <p className="mt-0.5 whitespace-pre-wrap">{ISSUER.address}</p>
            <p>{ISSUER.tel}</p>
          </div>
        </div>

        <div className="flex justify-between text-xs text-gray-500 mb-4">
          <span>明細番号: {stmtNo}</span>
          <span>対象月: {monthLabel(month)}</span>
          <span>お支払日: {payDateLabel(month, trainer.commissionPayDay)}</span>
        </div>

        {/* 合計。前払いの差し引きがある月は「総支給額」と「お振込額」を分けて出す。
            総支給額は減らさない。減るのは振り込む額だけ。 */}
        <div className="bg-gray-50 print:bg-gray-100 rounded-xl px-5 py-4 mb-6">
          {adjustmentTotal === 0 ? (
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-600">お支払い金額</span>
              <span className="text-2xl font-bold text-gray-900">{yen(total)}</span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between py-0.5">
                <span className="text-sm text-gray-600">総支給額</span>
                <span className="text-base font-bold text-gray-900 tabular-nums">{yen(total)}</span>
              </div>
              {adjustmentLines.map((l, i) => (
                <div key={i} className="flex items-center justify-between py-0.5">
                  <span className="text-sm text-gray-600">{l.label}</span>
                  <span className={`text-base font-bold tabular-nums ${l.amount < 0 ? "text-red-600" : "text-gray-900"}`}>
                    {l.amount < 0 ? `−${yen(Math.abs(l.amount))}` : yen(l.amount)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-gray-300 mt-2 pt-2">
                <span className="text-sm font-semibold text-gray-600">お振込額</span>
                <span className="text-2xl font-bold text-gray-900">{yen(payable)}</span>
              </div>
            </>
          )}
        </div>

        {/* レッスン担当分・営業分・業務（単価・歩合率は表示しない） */}
        <LineTable title="レッスン担当分" lines={trainerLines} total={statement?.trainerTotal ?? 0} />
        <LineTable title="営業分（レッスン歩合・成約ボーナス）" lines={salesLines} total={statement?.salesTotal ?? 0} />
        <HourlyLineTable lines={hourlyLines} total={statement?.hourlyTotal ?? 0} />
        <AdjustmentTable lines={adjustmentLines} total={adjustmentTotal} rewardTotal={total} payable={payable} />

        {/* 消費税の内訳。割り戻す元は総支給額（前払いの差し引きは報酬ではないので含めない） */}
        {total > 0 && (
          <div className="ml-auto w-full sm:w-1/2 border border-gray-300 rounded-xl px-4 py-3 text-sm">
            <p className="text-xs text-gray-400 mb-1">総支給額の内訳</p>
            <div className="flex justify-between text-gray-600 py-0.5">
              <span>{tax.rate}% 対象（税抜）</span>
              <span className="tabular-nums">{yen(tax.net)}</span>
            </div>
            <div className="flex justify-between text-gray-600 py-0.5">
              <span>消費税（{tax.rate}%）</span>
              <span className="tabular-nums">{yen(tax.tax)}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 mt-1.5 pt-1.5">
              <span>合計（税込）</span>
              <span className="tabular-nums">{yen(tax.gross)}</span>
            </div>
          </div>
        )}

        {trainerLines.length === 0 && salesLines.length === 0 && hourlyLines.length === 0 && adjustmentLines.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">この月の対象レッスンはありません</p>
        )}
      </div>
    </div>
  );
}

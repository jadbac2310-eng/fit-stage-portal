"use client";

import { useMemo, useState } from "react";
import { MapPin, Building2 } from "lucide-react";
import { MemberLabel } from "@/components/ui/member-label";
import type { Customer } from "@/lib/customers-types";
import { CUSTOMER_TYPE_LABEL } from "@/lib/customers-types";
import type { Lesson } from "@/lib/lessons-types";
import type { SessionPass } from "@/lib/session-passes-types";
import type { CustomerPlanRecord } from "@/lib/customer-plans-types";
import {
  isoToMonth,
  resolveLessonFee,
  resolveTrainerRate,
  type CommissionContext,
} from "@/lib/commissions";
import { cn } from "@/lib/cn";

// ─── 月選択肢生成（直近12か月） ─────────────────────────
function getMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${d.getFullYear()}年${d.getMonth() + 1}月`;
    options.push({ value, label });
  }
  return options;
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const weekday = "日月火水木金土"[d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()}(${weekday})`;
}

function yen(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

// ─── 1レッスンの明細行 ────────────────────────────────────
interface DetailRow {
  lessonId:      string;
  scheduledAt:   string;
  customerName:  string;
  customerType:  string;
  course:        string;
  fee:           number;
  ratePercent:   number;
  commission:    number;
  planNote?:     string;
  sessionPassNote?: string;
  rentalGymNote?: string;
  storeNote?:    string;
}

interface TrainerGroup {
  memberId:   string;
  memberName: string;
  avatarUrl?: string;
  rows:       DetailRow[];
  feeTotal:   number;
  commissionTotal: number;
}

export function DetailsClient({
  customers,
  lessons,
  sessionPasses,
  customerPlans,
  lessonFees,
  sessionPassPriceMap,
  members,
  trainerRates,
  rentalGyms,
  stores,
}: {
  customers:     Customer[];
  lessons:       Lesson[];
  sessionPasses: SessionPass[];
  customerPlans: CustomerPlanRecord[];
  lessonFees?:   Record<string, number>;
  sessionPassPriceMap?: Record<number, Record<number, number>>;
  members:       { id: string; name: string; avatarUrl?: string }[];
  trainerRates:  { memberId: string; customerId: string; rate: number }[];
  rentalGyms:    { id: string; name: string; fee: number }[];
  stores:        { id: string; name: string; fee: number }[];
}) {
  const monthOptions = useMemo(() => getMonthOptions(), []);
  const [month, setMonth] = useState(currentMonth);

  const ctx = useMemo((): CommissionContext => (
    { customers, sessionPasses, customerPlans, members, trainerRates, lessonFees, sessionPassPriceMap }
  ), [customers, sessionPasses, customerPlans, members, trainerRates, lessonFees, sessionPassPriceMap]);

  const customerTypeMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of customers) map.set(c.id, CUSTOMER_TYPE_LABEL[c.customerType]);
    return map;
  }, [customers]);

  const rentalGymMap = useMemo(() => new Map(rentalGyms.map((g) => [g.id, g])), [rentalGyms]);
  const storeMap     = useMemo(() => new Map(stores.map((s) => [s.id, s])), [stores]);

  const groups = useMemo((): TrainerGroup[] => {
    const filtered = lessons
      .filter((l) => isoToMonth(l.scheduledAt) === month && l.trainerMemberId)
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

    const map = new Map<string, TrainerGroup>();

    for (const l of filtered) {
      const tid = l.trainerMemberId!;
      const member = members.find((m) => m.id === tid);
      const fee = resolveLessonFee(l, ctx);
      const rate = resolveTrainerRate(tid, l.customerId, ctx);
      const commission = Math.round(fee * rate);

      // 回数券の内訳
      let sessionPassNote: string | undefined;
      if (l.sessionPassId) {
        const pass = sessionPasses.find((p) => p.id === l.sessionPassId);
        if (pass) {
          sessionPassNote = `残${pass.remainingCount}/${pass.totalCount}回・${pass.personCount}名様${pass.price ? `・${yen(pass.price)}` : ""}`;
        }
      }

      // 月プランの内訳（同一ロジックで適用中のプランを照合）
      let planNote: string | undefined;
      const course = l.course ?? "";
      if (course.startsWith("月")) {
        const date = l.scheduledAt.slice(0, 10);
        const plan = customerPlans.find(
          (p) => p.customerId === l.customerId && p.plan === course &&
                 p.startedAt <= date && (!p.endedAt || p.endedAt >= date)
        );
        if (plan) {
          planNote = `${plan.startedAt}〜${plan.endedAt ?? ""}${plan.price ? `・${yen(plan.price)}/月` : ""}`;
        }
      }

      // レンタルジム・店舗の内訳
      let rentalGymNote: string | undefined;
      if (l.rentalGymId) {
        const gym = rentalGymMap.get(l.rentalGymId);
        const gymFee = l.rentalGymFee ?? gym?.fee;
        rentalGymNote = `${gym?.name ?? "不明なジム"}${gymFee != null ? `・${yen(gymFee)}` : ""}`;
      }
      let storeNote: string | undefined;
      if (l.storeId) {
        const store = storeMap.get(l.storeId);
        const storeFee = l.storeFee ?? store?.fee;
        storeNote = `${store?.name ?? "不明な店舗"}${storeFee != null ? `・${yen(storeFee)}` : ""}`;
      }

      if (!map.has(tid)) {
        map.set(tid, {
          memberId: tid,
          memberName: member?.name ?? l.trainerMemberName ?? tid,
          avatarUrl: member?.avatarUrl,
          rows: [], feeTotal: 0, commissionTotal: 0,
        });
      }
      const group = map.get(tid)!;
      group.rows.push({
        lessonId: l.id,
        scheduledAt: l.scheduledAt,
        customerName: l.customerName,
        customerType: customerTypeMap.get(l.customerId) ?? "個人",
        course, fee, ratePercent: Math.round(rate * 100), commission,
        planNote, sessionPassNote, rentalGymNote, storeNote,
      });
      group.feeTotal += fee;
      group.commissionTotal += commission;
    }

    return Array.from(map.values()).sort((a, b) => b.commissionTotal - a.commissionTotal);
  }, [lessons, month, ctx, members, sessionPasses, customerPlans, customerTypeMap, rentalGymMap, storeMap]);

  const grandTotalCommission = groups.reduce((s, g) => s + g.commissionTotal, 0);
  const grandTotalLessons    = groups.reduce((s, g) => s + g.rows.length, 0);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-5 hidden md:block">
        <h1 className="text-xl font-bold text-gray-900">月次レッスン明細（歩合確認用）</h1>
        <p className="text-sm text-gray-500 mt-0.5">誰がいつ誰にレッスンし、歩合がいくらになるかを1件ずつ確認できます</p>
      </div>
      <div className="md:hidden mb-4">
        <h1 className="text-lg font-bold text-gray-900">月次レッスン明細</h1>
      </div>

      {/* 月選択・合計 */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <label className="text-sm font-semibold text-gray-600">対象月</label>
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="px-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {monthOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <div className="ml-auto flex items-center gap-4 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-2.5">
          <p className="text-xs text-blue-500">完了レッスン {grandTotalLessons}件</p>
          <p className="text-sm font-bold text-blue-700">歩合合計 {yen(grandTotalCommission)}</p>
        </div>
      </div>

      {groups.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-16">この月の完了レッスンはありません</p>
      )}

      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.memberId} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200">
              <MemberLabel name={group.memberName} avatarUrl={group.avatarUrl} size="sm" textClassName="text-sm font-bold text-gray-900" />
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-gray-400">{group.rows.length}件・売上{yen(group.feeTotal)}</p>
                <p className="text-base font-bold text-blue-600">歩合合計 {yen(group.commissionTotal)}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-100">
                    <th className="text-left py-2 px-3 font-medium whitespace-nowrap">日付</th>
                    <th className="text-left py-2 px-3 font-medium whitespace-nowrap">顧客</th>
                    <th className="text-left py-2 px-3 font-medium whitespace-nowrap">コース・内訳</th>
                    <th className="text-left py-2 px-3 font-medium whitespace-nowrap">場所</th>
                    <th className="text-right py-2 px-3 font-medium whitespace-nowrap">単価</th>
                    <th className="text-right py-2 px-3 font-medium whitespace-nowrap">歩合率</th>
                    <th className="text-right py-2 px-3 font-medium whitespace-nowrap">歩合額</th>
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((row) => (
                    <tr key={row.lessonId} className="border-b border-gray-50 last:border-0 align-top">
                      <td className="py-2 px-3 text-gray-500 whitespace-nowrap">{formatDate(row.scheduledAt)}</td>
                      <td className="py-2 px-3 text-gray-700">
                        {row.customerName}
                        <span className={cn(
                          "ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium",
                          row.customerType === "法人" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                        )}>
                          {row.customerType}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-gray-600">
                        <p className="font-medium text-gray-700">{row.course || "—"}</p>
                        {row.planNote && <p className="text-gray-400 mt-0.5">{row.planNote}</p>}
                        {row.sessionPassNote && <p className="text-gray-400 mt-0.5">{row.sessionPassNote}</p>}
                      </td>
                      <td className="py-2 px-3 text-gray-500">
                        {row.rentalGymNote && (
                          <p className="flex items-center gap-1 whitespace-nowrap"><MapPin size={11} className="text-gray-400 flex-shrink-0" />{row.rentalGymNote}</p>
                        )}
                        {row.storeNote && (
                          <p className="flex items-center gap-1 whitespace-nowrap mt-0.5"><Building2 size={11} className="text-gray-400 flex-shrink-0" />{row.storeNote}</p>
                        )}
                        {!row.rentalGymNote && !row.storeNote && "—"}
                      </td>
                      <td className="py-2 px-3 text-right text-gray-600 whitespace-nowrap">{yen(row.fee)}</td>
                      <td className="py-2 px-3 text-right text-gray-500 whitespace-nowrap">{row.ratePercent}%</td>
                      <td className="py-2 px-3 text-right font-semibold text-blue-600 whitespace-nowrap">{yen(row.commission)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} className="pt-2 px-3 text-right text-xs font-bold text-gray-700">小計</td>
                    <td className="pt-2 px-3 text-right text-xs font-bold text-gray-700 whitespace-nowrap">{yen(group.feeTotal)}</td>
                    <td></td>
                    <td className="pt-2 px-3 text-right text-sm font-bold text-blue-600 whitespace-nowrap">{yen(group.commissionTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, TrendingUp, Users, Award } from "lucide-react";
import type { Customer, CustomerType } from "@/lib/customers-types";
import type { Lesson } from "@/lib/lessons-types";
import type { TrialLesson } from "@/lib/trial-lessons-types";
import {
  getLessonFee,
  TRAINER_RATE,
  SALES_RATE,
  CONTRACT_BONUS,
} from "@/lib/commissions-types";
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

function isoToMonth(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function yen(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

// ─── 型定義 ──────────────────────────────────────────────
interface TrainerLessonRow {
  lessonId:     string;
  customerName: string;
  course:       string;
  scheduledAt:  string;
  fee:          number;
  commission:   number;
}

interface TrainerEntry {
  memberId:   string;
  memberName: string;
  lessons:    TrainerLessonRow[];
  total:      number;
}

interface SalesLessonRow {
  lessonId:     string;
  customerName: string;
  customerType: CustomerType;
  course:       string;
  scheduledAt:  string;
  fee:          number;
  commission:   number;
}

interface BonusRow {
  trialId:      string;
  customerName: string;
  customerType: CustomerType;
  scheduledAt:  string;
  amount:       number;
}

interface SalesEntry {
  memberId:    string;
  memberName:  string;
  lessons:     SalesLessonRow[];
  bonuses:     BonusRow[];
  lessonTotal: number;
  bonusTotal:  number;
  total:       number;
}

// ─── アコーディオン行 ────────────────────────────────────
function SectionCard({
  name,
  total,
  lessonTotal,
  bonusTotal,
  children,
}: {
  name:        string;
  total:       number;
  lessonTotal?: number;
  bonusTotal?:  number;
  children:    React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900">{name}</p>
          {lessonTotal !== undefined && bonusTotal !== undefined && (
            <p className="text-xs text-gray-400 mt-0.5">
              レッスン {yen(lessonTotal)} ＋ ボーナス {yen(bonusTotal)}
            </p>
          )}
        </div>
        <p className="text-base font-bold text-blue-600 mr-1">{yen(total)}</p>
        {open ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── トレーナータブ ──────────────────────────────────────
function TrainerTab({ entries }: { entries: TrainerEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-10">この月の完了レッスンはありません</p>;
  }

  const grandTotal = entries.reduce((s, e) => s + e.total, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-gray-500">{entries.length}名</p>
        <p className="text-sm font-bold text-gray-700">合計 {yen(grandTotal)}</p>
      </div>
      {entries.map((entry) => (
        <SectionCard key={entry.memberId} name={entry.memberName} total={entry.total}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-gray-100">
                  <th className="text-left py-1.5 pr-3 font-medium">顧客</th>
                  <th className="text-left py-1.5 pr-3 font-medium">コース</th>
                  <th className="text-left py-1.5 pr-3 font-medium">日付</th>
                  <th className="text-right py-1.5 pr-3 font-medium">単価</th>
                  <th className="text-right py-1.5 font-medium">歩合(50%)</th>
                </tr>
              </thead>
              <tbody>
                {entry.lessons.map((l) => (
                  <tr key={l.lessonId} className="border-b border-gray-50 last:border-0">
                    <td className="py-1.5 pr-3 text-gray-700">{l.customerName}</td>
                    <td className="py-1.5 pr-3 text-gray-600">{l.course || "—"}</td>
                    <td className="py-1.5 pr-3 text-gray-500">{formatDate(l.scheduledAt)}</td>
                    <td className="py-1.5 pr-3 text-right text-gray-600">{yen(l.fee)}</td>
                    <td className="py-1.5 text-right font-semibold text-blue-600">{yen(l.commission)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="pt-2 text-right text-xs font-bold text-gray-700">小計</td>
                  <td className="pt-2 text-right text-sm font-bold text-blue-600">{yen(entry.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </SectionCard>
      ))}
    </div>
  );
}

// ─── 営業タブ ─────────────────────────────────────────────
function SalesTab({ entries }: { entries: SalesEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-10">この月の歩合・ボーナスはありません</p>;
  }

  const grandTotal = entries.reduce((s, e) => s + e.total, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-gray-500">{entries.length}名</p>
        <p className="text-sm font-bold text-gray-700">合計 {yen(grandTotal)}</p>
      </div>
      {entries.map((entry) => (
        <SectionCard
          key={entry.memberId}
          name={entry.memberName}
          total={entry.total}
          lessonTotal={entry.lessonTotal}
          bonusTotal={entry.bonusTotal}
        >
          {/* レッスン歩合 */}
          {entry.lessons.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1">
                <TrendingUp size={11} /> レッスン歩合
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-100">
                      <th className="text-left py-1.5 pr-3 font-medium">顧客</th>
                      <th className="text-left py-1.5 pr-2 font-medium">区分</th>
                      <th className="text-left py-1.5 pr-3 font-medium">コース</th>
                      <th className="text-left py-1.5 pr-3 font-medium">日付</th>
                      <th className="text-right py-1.5 pr-3 font-medium">単価</th>
                      <th className="text-right py-1.5 font-medium">歩合</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entry.lessons.map((l) => (
                      <tr key={l.lessonId} className="border-b border-gray-50 last:border-0">
                        <td className="py-1.5 pr-3 text-gray-700">{l.customerName}</td>
                        <td className="py-1.5 pr-2">
                          <span className={cn(
                            "px-1.5 py-0.5 rounded-full text-[10px] font-medium",
                            l.customerType === "corporate"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-600"
                          )}>
                            {l.customerType === "corporate" ? "法人" : "個人"}
                          </span>
                        </td>
                        <td className="py-1.5 pr-3 text-gray-600">{l.course || "—"}</td>
                        <td className="py-1.5 pr-3 text-gray-500">{formatDate(l.scheduledAt)}</td>
                        <td className="py-1.5 pr-3 text-right text-gray-600">{yen(l.fee)}</td>
                        <td className="py-1.5 text-right font-semibold text-blue-600">
                          {yen(l.commission)}
                          <span className="text-gray-400 font-normal ml-1">
                            ({l.customerType === "corporate" ? "12%" : "10%"})
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={5} className="pt-2 text-right text-xs font-bold text-gray-700">小計</td>
                      <td className="pt-2 text-right text-sm font-bold text-blue-600">{yen(entry.lessonTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* 成約ボーナス */}
          {entry.bonuses.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1">
                <Award size={11} /> 成約ボーナス
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-100">
                      <th className="text-left py-1.5 pr-3 font-medium">顧客</th>
                      <th className="text-left py-1.5 pr-3 font-medium">区分</th>
                      <th className="text-left py-1.5 pr-3 font-medium">成約日</th>
                      <th className="text-right py-1.5 font-medium">ボーナス</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entry.bonuses.map((b) => (
                      <tr key={b.trialId} className="border-b border-gray-50 last:border-0">
                        <td className="py-1.5 pr-3 text-gray-700">{b.customerName}</td>
                        <td className="py-1.5 pr-3">
                          <span className={cn(
                            "px-1.5 py-0.5 rounded-full text-[10px] font-medium",
                            b.customerType === "corporate"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-600"
                          )}>
                            {b.customerType === "corporate" ? "法人" : "個人"}
                          </span>
                        </td>
                        <td className="py-1.5 pr-3 text-gray-500">{formatDate(b.scheduledAt)}</td>
                        <td className="py-1.5 text-right font-semibold text-green-600">{yen(b.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3} className="pt-2 text-right text-xs font-bold text-gray-700">小計</td>
                      <td className="pt-2 text-right text-sm font-bold text-green-600">{yen(entry.bonusTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </SectionCard>
      ))}
    </div>
  );
}

// ─── メインコンポーネント ─────────────────────────────────
export function CommissionsClient({
  customers,
  lessons,
  trialLessons,
}: {
  customers:    Customer[];
  lessons:      Lesson[];
  trialLessons: TrialLesson[];
}) {
  const monthOptions = useMemo(getMonthOptions, []);
  const [month,    setMonth]    = useState(currentMonth);
  const [activeTab, setActiveTab] = useState<"trainer" | "sales">("trainer");

  // 顧客ID → customerType のルックアップ
  const customerTypeMap = useMemo(() => {
    const m: Record<string, CustomerType> = {};
    for (const c of customers) m[c.id] = c.customerType;
    return m;
  }, [customers]);

  // 顧客ID → 営業担当のルックアップ（最初に成約した体験レッスンから）
  const salesByCustomer = useMemo(() => {
    const m: Record<string, { memberId: string; memberName: string }> = {};
    for (const tl of trialLessons) {
      if (!m[tl.customerId]) {
        m[tl.customerId] = { memberId: tl.salesMemberId, memberName: tl.salesMemberName };
      }
    }
    return m;
  }, [trialLessons]);

  // 選択月のトレーナー集計
  const trainerEntries = useMemo((): TrainerEntry[] => {
    const filtered = lessons.filter((l) => isoToMonth(l.scheduledAt) === month && l.trainerMemberId);
    const map = new Map<string, TrainerEntry>();

    for (const l of filtered) {
      const tid  = l.trainerMemberId!;
      const fee  = getLessonFee(l.course);
      const comm = Math.round(fee * TRAINER_RATE);

      if (!map.has(tid)) {
        map.set(tid, { memberId: tid, memberName: l.trainerMemberName ?? tid, lessons: [], total: 0 });
      }
      const entry = map.get(tid)!;
      entry.lessons.push({
        lessonId: l.id, customerName: l.customerName,
        course: l.course ?? "", scheduledAt: l.scheduledAt,
        fee, commission: comm,
      });
      entry.total += comm;
    }

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [lessons, month]);

  // 選択月の営業集計
  const salesEntries = useMemo((): SalesEntry[] => {
    const map = new Map<string, SalesEntry>();

    const ensureEntry = (memberId: string, memberName: string) => {
      if (!map.has(memberId)) {
        map.set(memberId, {
          memberId, memberName,
          lessons: [], bonuses: [],
          lessonTotal: 0, bonusTotal: 0, total: 0,
        });
      }
      return map.get(memberId)!;
    };

    // レッスン歩合
    for (const l of lessons.filter((l) => isoToMonth(l.scheduledAt) === month)) {
      const sales = salesByCustomer[l.customerId];
      if (!sales) continue;

      const cType  = customerTypeMap[l.customerId] ?? "individual";
      const fee    = getLessonFee(l.course);
      const rate   = SALES_RATE[cType];
      const comm   = Math.round(fee * rate);

      const entry = ensureEntry(sales.memberId, sales.memberName);
      entry.lessons.push({
        lessonId: l.id, customerName: l.customerName, customerType: cType,
        course: l.course ?? "", scheduledAt: l.scheduledAt, fee, commission: comm,
      });
      entry.lessonTotal += comm;
      entry.total       += comm;
    }

    // 成約ボーナス（体験レッスン成約日が選択月に含まれるもの）
    for (const tl of trialLessons.filter((tl) => isoToMonth(tl.scheduledAt) === month)) {
      const cType  = customerTypeMap[tl.customerId] ?? "individual";
      const bonus  = CONTRACT_BONUS[cType];

      const entry = ensureEntry(tl.salesMemberId, tl.salesMemberName);
      entry.bonuses.push({
        trialId: tl.id, customerName: tl.customerName, customerType: cType,
        scheduledAt: tl.scheduledAt, amount: bonus,
      });
      entry.bonusTotal += bonus;
      entry.total      += bonus;
    }

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [lessons, trialLessons, month, customerTypeMap, salesByCustomer]);

  const trainerTotal = trainerEntries.reduce((s, e) => s + e.total, 0);
  const salesTotal   = salesEntries.reduce((s, e) => s + e.total, 0);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* ヘッダー */}
      <div className="mb-5 hidden md:block">
        <h1 className="text-xl font-bold text-gray-900">歩合管理</h1>
        <p className="text-sm text-gray-500 mt-0.5">月別のトレーナー・営業歩合を確認できます</p>
      </div>
      <div className="md:hidden mb-4">
        <h1 className="text-lg font-bold text-gray-900">歩合管理</h1>
      </div>

      {/* 月選択 */}
      <div className="flex items-center gap-3 mb-5">
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
        <p className="text-xs text-gray-400">翌月25日払い</p>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
          <p className="text-xs font-semibold text-blue-600 flex items-center gap-1.5 mb-1">
            <Users size={12} /> トレーナー合計
          </p>
          <p className="text-xl font-bold text-blue-700">{yen(trainerTotal)}</p>
          <p className="text-xs text-blue-400 mt-0.5">{trainerEntries.length}名</p>
        </div>
        <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
          <p className="text-xs font-semibold text-green-600 flex items-center gap-1.5 mb-1">
            <TrendingUp size={12} /> 営業合計
          </p>
          <p className="text-xl font-bold text-green-700">{yen(salesTotal)}</p>
          <p className="text-xs text-green-400 mt-0.5">{salesEntries.length}名</p>
        </div>
      </div>

      {/* タブ */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-4">
        {(["trainer", "sales"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-2 rounded-lg text-sm font-semibold transition",
              activeTab === tab
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {tab === "trainer" ? "トレーナー" : "営業"}
          </button>
        ))}
      </div>

      {/* コンテンツ */}
      {activeTab === "trainer"
        ? <TrainerTab entries={trainerEntries} />
        : <SalesTab   entries={salesEntries} />}
    </div>
  );
}

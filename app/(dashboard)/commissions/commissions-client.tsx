"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, TrendingUp, Users, Award, Percent, ChevronRight, ListChecks, FileText, Clock, AlertTriangle } from "lucide-react";
import { MemberLabel } from "@/components/ui/member-label";
import type { Customer } from "@/lib/customers-types";
import type { Lesson } from "@/lib/lessons-types";
import type { TrialLesson } from "@/lib/trial-lessons-types";
import type { SessionPass } from "@/lib/session-passes-types";
import type { CustomerPlanRecord } from "@/lib/customer-plans-types";
import type { HourlyTask } from "@/lib/hourly-tasks-types";
import {
  buildTrainerEntries,
  buildSalesEntries,
  buildHourlyEntries,
  type TrainerEntry,
  type SalesEntry,
  type HourlyEntry,
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
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function yen(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

// ─── アコーディオン行 ────────────────────────────────────
function SectionCard({
  name,
  avatarUrl,
  total,
  subtitle,
  children,
}: {
  name:       string;
  avatarUrl?: string;
  total:      number;
  subtitle?:  React.ReactNode;
  children:   React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition text-left"
      >
        <div className="flex-1 min-w-0">
          <MemberLabel name={name} avatarUrl={avatarUrl} size="sm" textClassName="text-sm font-bold text-gray-900" />
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
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
function TrainerTab({ entries, isAdmin, avatarOf }: { entries: TrainerEntry[]; isAdmin: boolean; avatarOf?: (id: string) => string | undefined }) {
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
        <SectionCard key={entry.memberId} name={entry.memberName} avatarUrl={avatarOf?.(entry.memberId)} total={entry.total}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-gray-100">
                  <th className="text-left py-1.5 pr-3 font-medium">顧客</th>
                  <th className="text-left py-1.5 pr-3 font-medium">コース</th>
                  <th className="text-left py-1.5 pr-3 font-medium">日付</th>
                  {isAdmin && <th className="text-right py-1.5 pr-3 font-medium">単価</th>}
                  <th className="text-right py-1.5 font-medium">歩合</th>
                </tr>
              </thead>
              <tbody>
                {entry.lessons.map((l) => (
                  <tr key={l.lessonId} className="border-b border-gray-50 last:border-0">
                    <td className="py-1.5 pr-3 text-gray-700">{l.customerName}</td>
                    <td className="py-1.5 pr-3 text-gray-600">{l.course || "—"}</td>
                    <td className="py-1.5 pr-3 text-gray-500">{formatDate(l.scheduledAt)}</td>
                    {isAdmin && <td className="py-1.5 pr-3 text-right text-gray-600">{yen(l.fee)}</td>}
                    <td className="py-1.5 text-right font-semibold text-blue-600">{yen(l.commission)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={isAdmin ? 4 : 3} className="pt-2 text-right text-xs font-bold text-gray-700">小計</td>
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
function SalesTab({ entries, isAdmin, avatarOf }: { entries: SalesEntry[]; isAdmin: boolean; avatarOf?: (id: string) => string | undefined }) {
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
          avatarUrl={avatarOf?.(entry.memberId)}
          total={entry.total}
          subtitle={`レッスン ${yen(entry.lessonTotal)} ＋ ボーナス ${yen(entry.bonusTotal)}`}
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
                      {isAdmin && <th className="text-right py-1.5 pr-3 font-medium">単価</th>}
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
                        {isAdmin && <td className="py-1.5 pr-3 text-right text-gray-600">{yen(l.fee)}</td>}
                        <td className="py-1.5 text-right font-semibold text-blue-600">
                          {yen(l.commission)}
                          {isAdmin && (
                            <span className="text-gray-400 font-normal ml-1">
                              ({l.customerType === "corporate" ? "12%" : "10%"})
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={isAdmin ? 5 : 4} className="pt-2 text-right text-xs font-bold text-gray-700">小計</td>
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

// ─── 業務（時給）タブ ─────────────────────────────────────
function HourlyTaskTable({ rows, muted }: { rows: HourlyEntry["tasks"]; muted?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-400 border-b border-gray-100">
            <th className="text-left py-1.5 pr-3 font-medium">業務内容</th>
            <th className="text-left py-1.5 pr-3 font-medium">日付</th>
            <th className="text-right py-1.5 pr-3 font-medium">時間</th>
            <th className="text-right py-1.5 pr-3 font-medium">時給</th>
            <th className="text-right py-1.5 font-medium">金額</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.taskId} className="border-b border-gray-50 last:border-0">
              <td className="py-1.5 pr-3 text-gray-700">{t.title}</td>
              <td className="py-1.5 pr-3 text-gray-500">{formatDate(t.scheduledAt)}</td>
              <td className="py-1.5 pr-3 text-right text-gray-600">{t.hours}h</td>
              <td className="py-1.5 pr-3 text-right text-gray-600">{yen(t.hourlyRate)}</td>
              <td className={cn("py-1.5 text-right font-semibold", muted ? "text-amber-600" : "text-blue-600")}>
                {yen(t.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HourlyTab({ entries, isAdmin, avatarOf }: { entries: HourlyEntry[]; isAdmin: boolean; avatarOf?: (id: string) => string | undefined }) {
  if (entries.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-10">この月の業務はありません</p>;
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
          avatarUrl={avatarOf?.(entry.memberId)}
          total={entry.total}
          subtitle={
            entry.pending.length > 0
              ? `完了 ${entry.tasks.length}件 ／ 未完了 ${entry.pending.length}件（${yen(entry.pendingTotal)}）`
              : `完了 ${entry.tasks.length}件`
          }
        >
          {entry.tasks.length > 0 && (
            <div className={entry.pending.length > 0 ? "mb-4" : undefined}>
              <p className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1">
                <Clock size={11} /> 完了した業務
              </p>
              <HourlyTaskTable rows={entry.tasks} />
              <p className="pt-2 text-right text-sm font-bold text-blue-600">小計 {yen(entry.total)}</p>
            </div>
          )}

          {/* 「予定」のままの業務。支払い対象外なので、完了にし忘れに気付けるよう並べて出す */}
          {entry.pending.length > 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
              <p className="text-xs font-bold text-amber-700 mb-2 flex items-center gap-1">
                <AlertTriangle size={11} /> まだ「予定」のままの業務
              </p>
              <HourlyTaskTable rows={entry.pending} muted />
              <p className="pt-2 text-right text-sm font-bold text-amber-600">対象外 {yen(entry.pendingTotal)}</p>
              <p className="text-[11px] text-amber-600 mt-1.5 leading-relaxed">
                {isAdmin
                  ? "「完了」にすると支払い対象に入ります。スケジュールから変更してください。"
                  : "実施済みであれば、管理者に「完了」への変更を依頼してください。"}
              </p>
            </div>
          )}
        </SectionCard>
      ))}
    </div>
  );
}

// ─── 管理者向けリンク（歩合率設定・月次明細） ─────────────
function AdminLinks() {
  return (
    <div className="mb-4 space-y-2">
      <Link
        href="/commissions/details"
        className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 px-4 py-3 hover:border-blue-300 hover:shadow-sm transition group"
      >
        <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <ListChecks size={17} className="text-green-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">月次レッスン明細</p>
          <p className="text-xs text-gray-500 mt-0.5">1件ごとの歩合を確認して支払い額を検算</p>
        </div>
        <ChevronRight size={16} className="text-gray-400 group-hover:text-blue-500 transition flex-shrink-0" />
      </Link>
      <Link
        href="/commissions/statement"
        className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 px-4 py-3 hover:border-blue-300 hover:shadow-sm transition group"
      >
        <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <FileText size={17} className="text-violet-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">コミッション明細</p>
          <p className="text-xs text-gray-500 mt-0.5">給料の支払い用に明細を発行（単価・歩合率は非表示）</p>
        </div>
        <ChevronRight size={16} className="text-gray-400 group-hover:text-blue-500 transition flex-shrink-0" />
      </Link>
      <Link
        href="/commissions/rates"
        className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 px-4 py-3 hover:border-blue-300 hover:shadow-sm transition group"
      >
        <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <Percent size={17} className="text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">歩合率設定</p>
          <p className="text-xs text-gray-500 mt-0.5">担当者×顧客ごとの歩合率を設定（未設定は50%）</p>
        </div>
        <ChevronRight size={16} className="text-gray-400 group-hover:text-blue-500 transition flex-shrink-0" />
      </Link>
    </div>
  );
}

// ─── メインコンポーネント ─────────────────────────────────
export function CommissionsClient({
  customers,
  lessons,
  trialLessons,
  completedTrialLessons,
  sessionPasses,
  customerPlans,
  hourlyTasks,
  lessonFees,
  sessionPassPriceMap,
  members,
  trainerRates,
  isAdmin,
  currentMemberId,
}: {
  customers:    Customer[];
  lessons:      Lesson[];
  trialLessons: TrialLesson[];
  completedTrialLessons?: TrialLesson[];
  sessionPasses: SessionPass[];
  customerPlans: CustomerPlanRecord[];
  hourlyTasks?: HourlyTask[];
  lessonFees?:  Record<string, number>;
  sessionPassPriceMap?: Record<number, Record<number, number>>;
  members:      { id: string; name: string; avatarUrl?: string }[];
  trainerRates?: { memberId: string; customerId: string; rate: number }[];
  isAdmin:      boolean;
  currentMemberId?: string;
}) {
  const monthOptions = useMemo(() => getMonthOptions(), []);
  const [month,    setMonth]    = useState(currentMonth);
  const [activeTab, setActiveTab] = useState<"trainer" | "sales" | "hourly">("trainer");

  const ctx = useMemo((): CommissionContext => (
    { customers, sessionPasses, customerPlans, members, trainerRates, lessonFees, sessionPassPriceMap }
  ), [customers, sessionPasses, customerPlans, members, trainerRates, lessonFees, sessionPassPriceMap]);

  // 選択月のトレーナー集計（管理者は全員、それ以外は自分の分のみ）
  const trainerEntries = useMemo((): TrainerEntry[] => {
    const all = buildTrainerEntries(lessons, completedTrialLessons ?? [], month, ctx);
    return isAdmin ? all : all.filter((e) => e.memberId === currentMemberId);
  }, [lessons, completedTrialLessons, month, ctx, isAdmin, currentMemberId]);

  // 選択月の営業集計（管理者は全員、それ以外は自分の分のみ）
  const salesEntries = useMemo((): SalesEntry[] => {
    const all = buildSalesEntries(lessons, trialLessons, month, ctx);
    return isAdmin ? all : all.filter((e) => e.memberId === currentMemberId);
  }, [lessons, trialLessons, month, ctx, isAdmin, currentMemberId]);

  // 選択月の業務集計（ページ側で自分ぶんに絞り込み済み）
  const hourlyEntries = useMemo((): HourlyEntry[] => buildHourlyEntries(hourlyTasks ?? [], month), [hourlyTasks, month]);

  const trainerTotal = trainerEntries.reduce((s, e) => s + e.total, 0);
  const salesTotal   = salesEntries.reduce((s, e) => s + e.total, 0);
  const hourlyTotal  = hourlyEntries.reduce((s, e) => s + e.total, 0);
  const pendingTotal = hourlyEntries.reduce((s, e) => s + e.pendingTotal, 0);
  const pendingCount = hourlyEntries.reduce((s, e) => s + e.pending.length, 0);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* ヘッダー */}
      <div className="mb-5 hidden md:block">
        <h1 className="text-xl font-bold text-gray-900">歩合管理</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {isAdmin ? "月別のトレーナー・営業歩合を確認できます" : "あなたの月別歩合を確認できます"}
        </p>
      </div>

      {/* 管理者向けリンク（月次明細・歩合率設定） */}
      {isAdmin && <AdminLinks />}
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
          <p className="text-xs text-blue-400 mt-0.5">{isAdmin ? `${trainerEntries.length}名` : "あなたの分"}</p>
        </div>
        <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
          <p className="text-xs font-semibold text-green-600 flex items-center gap-1.5 mb-1">
            <TrendingUp size={12} /> 営業合計
          </p>
          <p className="text-xl font-bold text-green-700">{yen(salesTotal)}</p>
          <p className="text-xs text-green-400 mt-0.5">{isAdmin ? `${salesEntries.length}名` : "あなたの分"}</p>
        </div>
        {/* 業務は金額が横に長くなりやすいので、2カラムをまたいで1行使う */}
        <div className="col-span-2 bg-amber-50 rounded-2xl p-4 border border-amber-100">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xs font-semibold text-amber-600 flex items-center gap-1.5">
              <Clock size={12} /> 業務合計（時給）
            </p>
            <p className="text-xl font-bold text-amber-700">{yen(hourlyTotal)}</p>
          </div>
          {pendingCount > 0 && (
            <p className="text-xs text-amber-600 mt-1.5 flex items-start gap-1 leading-relaxed">
              <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
              <span>
                まだ「予定」のままの業務が {pendingCount}件（{yen(pendingTotal)}）あります。
                完了にしないと支払い対象に入りません。
              </span>
            </p>
          )}
        </div>
      </div>

      {/* タブ */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-4">
        {(["trainer", "sales", "hourly"] as const).map((tab) => (
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
            {tab === "trainer" ? "トレーナー" : tab === "sales" ? "営業" : "業務"}
            {tab === "hourly" && pendingCount > 0 && (
              <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-amber-500 align-middle" />
            )}
          </button>
        ))}
      </div>

      {/* コンテンツ */}
      {activeTab === "trainer" && <TrainerTab entries={trainerEntries} isAdmin={isAdmin} avatarOf={(id) => members.find((m) => m.id === id)?.avatarUrl} />}
      {activeTab === "sales"   && <SalesTab   entries={salesEntries}   isAdmin={isAdmin} avatarOf={(id) => members.find((m) => m.id === id)?.avatarUrl} />}
      {activeTab === "hourly"  && <HourlyTab  entries={hourlyEntries}  isAdmin={isAdmin} avatarOf={(id) => members.find((m) => m.id === id)?.avatarUrl} />}
    </div>
  );
}

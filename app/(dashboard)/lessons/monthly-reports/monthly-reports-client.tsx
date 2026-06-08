"use client";

import { useState, useMemo } from "react";
import {
  Plus, Pencil, Trash2, X, Search, User, StickyNote,
  CheckCircle, AlertCircle, FileText,
} from "lucide-react";
import type { MonthlyReport } from "@/lib/monthly-reports-types";
import type { Customer } from "@/lib/customers-types";
import type { Member } from "@/lib/members";
import { saveMonthlyReportAction, deleteMonthlyReportAction } from "./actions";
import { cn } from "@/lib/cn";
import { Spinner } from "@/components/ui/spinner";

// ─── 月選択ヘルパー ───────────────────────────────────
function prevMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function nextMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function formatYearMonth(ym: string) {
  const [y, m] = ym.split("-");
  return `${y}年${parseInt(m)}月`;
}

// ─── レポートフォーム ─────────────────────────────────
function ReportForm({
  customerId, yearMonth, defaultValues, members, onClose,
}: {
  customerId: string;
  yearMonth: string;
  defaultValues?: MonthlyReport;
  members: Member[];
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(fd: FormData) {
    setError(""); setLoading(true);
    try { await saveMonthlyReportAction(fd); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : "エラーが発生しました"); setLoading(false); }
  }

  const inputClass = "w-full px-3 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelClass = "text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1.5";

  return (
    <form action={handleSubmit} className="space-y-3">
      <input type="hidden" name="customerId" value={customerId} />
      <input type="hidden" name="yearMonth"  value={yearMonth} />

      <div>
        <label className={labelClass}><User size={11} /> 担当トレーナー</label>
        <select name="trainerMemberId" defaultValue={defaultValues?.trainerMemberId ?? ""} className={inputClass}>
          <option value="">未設定</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}{m.role ? `（${m.role}）` : ""}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}><FileText size={11} /> 指導内容 <span className="text-red-500">*</span></label>
        <textarea
          name="content"
          required
          defaultValue={defaultValues?.content}
          rows={4}
          placeholder="今月の指導内容・進捗・目標達成状況など"
          className={cn(inputClass, "resize-none")}
        />
      </div>

      <div>
        <label className={labelClass}><StickyNote size={11} /> 備考</label>
        <textarea
          name="note"
          defaultValue={defaultValues?.note}
          rows={2}
          placeholder="顧客の様子・特記事項など"
          className={cn(inputClass, "resize-none")}
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onClose}
          className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
          キャンセル
        </button>
        <button type="submit" disabled={loading}
          className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold transition flex items-center justify-center gap-2">
          {loading && <Spinner size={14} />}{loading ? "保存中..." : "保存する"}
        </button>
      </div>
    </form>
  );
}

// ─── 顧客1行 ──────────────────────────────────────────
function CustomerRow({
  customer, report, yearMonth, members, isAdmin,
}: {
  customer: Customer;
  report?: MonthlyReport;
  yearMonth: string;
  members: Member[];
  isAdmin: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!report) return;
    if (!confirm("このレポートを削除しますか？")) return;
    setDeleting(true);
    await deleteMonthlyReportAction(report.id);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* ヘッダー行 */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900">{customer.fullName}</p>
          {report?.trainerMemberName && (
            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
              <User size={10} /> {report.trainerMemberName}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {report ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
              <CheckCircle size={10} /> 提出済み
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
              <AlertCircle size={10} /> 未提出
            </span>
          )}
          {isAdmin && !editing && (
            <div className="flex items-center gap-1">
              <button onClick={() => setEditing(true)}
                className={cn(
                  "flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition",
                  report
                    ? "text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200"
                    : "text-white bg-blue-600 hover:bg-blue-700 border-blue-600"
                )}>
                {report ? <><Pencil size={11} /> 編集</> : <><Plus size={11} /> 提出</>}
              </button>
              {report && (
                <button onClick={handleDelete} disabled={deleting}
                  className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50">
                  {deleting ? <Spinner size={12} /> : <Trash2 size={12} />}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* レポート内容 */}
      {report && !editing && (
        <div className="px-4 pb-3 border-t border-gray-100">
          <p className="text-xs text-gray-700 mt-2 whitespace-pre-wrap leading-relaxed">{report.content}</p>
          {report.note && (
            <p className="text-xs text-gray-400 mt-1.5 whitespace-pre-wrap">備考: {report.note}</p>
          )}
        </div>
      )}

      {/* 編集フォーム */}
      {editing && (
        <div className="px-4 pb-4 border-t border-blue-100 bg-blue-50">
          <div className="flex items-center justify-between py-2">
            <p className="text-xs font-bold text-gray-700">
              {report ? "レポートを編集" : "レポートを提出"}
            </p>
            <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          </div>
          <ReportForm
            customerId={customer.id}
            yearMonth={yearMonth}
            defaultValues={report}
            members={members}
            onClose={() => setEditing(false)}
          />
        </div>
      )}
    </div>
  );
}

// ─── メインコンポーネント ─────────────────────────────
export function MonthlyReportsClient({
  customers, reports, members, isAdmin,
}: {
  customers: Customer[];
  reports: MonthlyReport[];
  members: Member[];
  isAdmin: boolean;
}) {
  const today = new Date();
  const currentYM = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const [yearMonth, setYearMonth] = useState(currentYM);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "submitted" | "pending">("all");

  const reportMap = useMemo(() => {
    const m = new Map<string, MonthlyReport>();
    reports.filter((r) => r.yearMonth === yearMonth).forEach((r) => m.set(r.customerId, r));
    return m;
  }, [reports, yearMonth]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return customers.filter((c) => {
      const matchSearch = !q || c.fullName.toLowerCase().includes(q);
      const hasReport = reportMap.has(c.id);
      const matchStatus =
        filterStatus === "all" ? true :
        filterStatus === "submitted" ? hasReport : !hasReport;
      return matchSearch && matchStatus;
    });
  }, [customers, search, filterStatus, reportMap]);

  const submittedCount = customers.filter((c) => reportMap.has(c.id)).length;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* ヘッダー */}
      <div className="mb-4 hidden md:block">
        <h1 className="text-xl font-bold text-gray-900">月次レポート</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {formatYearMonth(yearMonth)}：{submittedCount} / {customers.length} 件提出済み
        </p>
      </div>
      <div className="md:hidden mb-4">
        <h1 className="text-lg font-bold text-gray-900">月次レポート</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {formatYearMonth(yearMonth)}：{submittedCount} / {customers.length} 件提出済み
        </p>
      </div>

      {/* 月ナビ */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setYearMonth(prevMonth(yearMonth))}
          className="px-3 py-1.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition">
          ◀
        </button>
        <span className="flex-1 text-center text-sm font-bold text-gray-900">
          {formatYearMonth(yearMonth)}
        </span>
        <button onClick={() => setYearMonth(nextMonth(yearMonth))}
          className="px-3 py-1.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition">
          ▶
        </button>
      </div>

      {/* 検索・フィルター */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="顧客名で検索..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
          className="px-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="all">すべて</option>
          <option value="submitted">提出済み</option>
          <option value="pending">未提出</option>
        </select>
      </div>

      {/* 進捗バー */}
      <div className="mb-4 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className="h-2 bg-green-500 rounded-full transition-all duration-500"
          style={{ width: customers.length ? `${(submittedCount / customers.length) * 100}%` : "0%" }}
        />
      </div>

      {/* リスト */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">該当する顧客が見つかりません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <CustomerRow
              key={c.id}
              customer={c}
              report={reportMap.get(c.id)}
              yearMonth={yearMonth}
              members={members}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}
    </div>
  );
}

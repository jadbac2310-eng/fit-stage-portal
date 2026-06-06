"use client";

import { useState } from "react";
import {
  Plus, Pencil, Trash2, X, Search, User, Mail, Phone,
  MapPin, Calendar, FileText, StickyNote,
} from "lucide-react";
import { Customer, CustomerPlan, CustomerStatus, PLAN_LABEL, STATUS_LABEL } from "@/lib/customers-types";
import { createCustomerAction, updateCustomerAction, deleteCustomerAction } from "./actions";
import { cn } from "@/lib/cn";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Spinner } from "@/components/ui/spinner";

// ─── バッジ ───────────────────────────────────────────
function PlanBadge({ plan }: { plan?: CustomerPlan }) {
  if (!plan) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">体験中</span>;
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
      plan === "monthly" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
    )}>
      {PLAN_LABEL[plan]}
    </span>
  );
}

function StatusBadge({ status }: { status: CustomerStatus }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
      status === "trial"    ? "bg-purple-100 text-purple-700" :
      status === "active"   ? "bg-green-100 text-green-700"   :
      status === "pending"  ? "bg-yellow-100 text-yellow-700" :
                              "bg-gray-100 text-gray-500"
    )}>
      {STATUS_LABEL[status]}
    </span>
  );
}

// ─── フォーム ─────────────────────────────────────────
function CustomerForm({
  defaultValues,
  isEdit = false,
  onClose,
  action,
  submitLabel,
}: {
  defaultValues?: Partial<Customer>;
  isEdit?: boolean;
  onClose: () => void;
  action: (fd: FormData) => Promise<void>;
  submitLabel: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(fd: FormData) {
    setError("");
    setLoading(true);
    try {
      await action(fd);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
      setLoading(false);
    }
  }

  const inputClass = "w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelClass = "text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5";

  return (
    <form action={handleSubmit} className="space-y-4">
      {/* 氏名 */}
      <div>
        <label className={labelClass}>
          <User size={12} /> 氏名 <span className="text-red-500">*</span>
        </label>
        <input
          name="fullName"
          required
          autoFocus
          defaultValue={defaultValues?.fullName}
          placeholder="山田 太郎"
          className={inputClass}
        />
      </div>

      {/* メールアドレス */}
      <div>
        <label className={labelClass}>
          <Mail size={12} /> メールアドレス <span className="text-red-500">*</span>
        </label>
        <input
          name="email"
          type="email"
          required
          defaultValue={defaultValues?.email}
          placeholder="example@email.com"
          className={inputClass}
        />
      </div>

      {/* 生年月日 */}
      <div>
        <label className={labelClass}>
          <Calendar size={12} /> 生年月日 <span className="text-red-500">*</span>
        </label>
        <input
          name="dateOfBirth"
          type="date"
          required
          defaultValue={defaultValues?.dateOfBirth}
          className={inputClass}
        />
      </div>

      {/* 住所 */}
      <div>
        <label className={labelClass}>
          <MapPin size={12} /> 住所
        </label>
        <input
          name="address"
          defaultValue={defaultValues?.address}
          placeholder="東京都渋谷区..."
          className={inputClass}
        />
      </div>

      {/* 電話番号 */}
      <div>
        <label className={labelClass}>
          <Phone size={12} /> 電話番号
        </label>
        <input
          name="phoneNumber"
          type="tel"
          defaultValue={defaultValues?.phoneNumber}
          placeholder="090-0000-0000"
          className={inputClass}
        />
      </div>

      {/* ステータス */}
      <div>
        <label className={labelClass}>ステータス</label>
        <select
          name="status"
          defaultValue={defaultValues?.status ?? "trial"}
          className={inputClass}
        >
          <option value="trial">体験申し込み</option>
          <option value="active">在籍中</option>
          <option value="pending">審査中</option>
          <option value="inactive">退会</option>
        </select>
      </div>

      {/* プラン */}
      <div>
        <label className={labelClass}>
          <FileText size={12} /> プラン
        </label>
        <select
          name="plan"
          defaultValue={defaultValues?.plan ?? ""}
          className={inputClass}
        >
          <option value="">体験中（プラン未定）</option>
          <option value="monthly">月額制プラン（毎月27日前払い）</option>
          <option value="pay_as_you_go">都度払いプラン（月末締め・翌月10日後払い）</option>
        </select>
      </div>

      {/* 利用開始希望日 */}
      <div>
        <label className={labelClass}>
          <Calendar size={12} /> 利用開始希望日
        </label>
        <input
          name="desiredStartDate"
          type="date"
          defaultValue={defaultValues?.desiredStartDate}
          className={inputClass}
        />
      </div>

      {/* 会員規約への同意 */}
      <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-xs font-semibold text-gray-600">会員規約への同意</span>
          <input
            type="checkbox"
            name="agreedToTerms"
            defaultChecked={defaultValues?.agreedToTerms ?? false}
            className="w-4 h-4 accent-blue-600"
          />
        </label>
      </div>

      {/* メモ */}
      <div>
        <label className={labelClass}>
          <StickyNote size={12} /> メモ
        </label>
        <textarea
          name="note"
          defaultValue={defaultValues?.note}
          rows={2}
          placeholder="備考など（任意）"
          className={cn(inputClass, "resize-none")}
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold transition flex items-center justify-center gap-2"
        >
          {loading && <Spinner size={14} />}
          {loading ? "保存中..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

// ─── 顧客行（テーブル） ───────────────────────────────
function CustomerRow({ customer, isAdmin }: { customer: Customer; isAdmin: boolean }) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const boundUpdate = updateCustomerAction.bind(null, customer.id);

  async function handleDelete() {
    if (!confirm(`「${customer.fullName}」を削除しますか？`)) return;
    setDeleting(true);
    await deleteCustomerAction(customer.id);
  }

  if (editing) {
    return (
      <tr>
        <td colSpan={6} className="px-4 py-3">
          <div className="bg-white rounded-2xl border-2 border-blue-400 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-gray-900">顧客を編集</p>
              <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <CustomerForm
              defaultValues={customer}
              isEdit
              onClose={() => setEditing(false)}
              action={boundUpdate}
              submitLabel="保存する"
            />
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
      <td className="px-4 py-3">
        <p className="text-sm font-semibold text-gray-900">{customer.fullName}</p>
        <p className="text-xs text-gray-400 mt-0.5">{customer.email}</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-xs text-gray-600">{customer.phoneNumber}</p>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={customer.status} />
      </td>
      <td className="px-4 py-3">
        <PlanBadge plan={customer.plan} />
      </td>
      <td className="px-4 py-3">
        <p className="text-xs text-gray-600">{customer.desiredStartDate}</p>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 justify-end">
          {isAdmin && (
            <>
              <button
                onClick={() => setEditing(true)}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                aria-label="編集"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                aria-label="削除"
              >
                {deleting ? <Spinner size={13} /> : <Trash2 size={13} />}
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── 顧客カード（モバイル） ───────────────────────────
function CustomerCard({ customer, isAdmin }: { customer: Customer; isAdmin: boolean }) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const boundUpdate = updateCustomerAction.bind(null, customer.id);

  async function handleDelete() {
    if (!confirm(`「${customer.fullName}」を削除しますか？`)) return;
    setDeleting(true);
    await deleteCustomerAction(customer.id);
  }

  if (editing) {
    return (
      <div className="bg-white rounded-2xl border-2 border-blue-400 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-gray-900">顧客を編集</p>
          <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>
        <CustomerForm
          defaultValues={customer}
          isEdit
          onClose={() => setEditing(false)}
          action={boundUpdate}
          submitLabel="保存する"
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900">{customer.fullName}</p>
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
            <Mail size={10} className="flex-shrink-0" />{customer.email}
          </p>
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
            <Phone size={10} className="flex-shrink-0" />{customer.phoneNumber}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={customer.status} />
          <PlanBadge plan={customer.plan} />
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-400">開始日: {customer.desiredStartDate}</p>
        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1 text-xs text-gray-600 hover:text-blue-600 font-medium bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 px-2.5 py-1.5 rounded-lg transition"
            >
              <Pencil size={11} /> 編集
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 disabled:text-red-400 font-medium bg-red-50 hover:bg-red-100 border border-red-300 px-2.5 py-1.5 rounded-lg transition"
            >
              {deleting ? <><Spinner size={11} /> 削除中...</> : <><Trash2 size={11} /> 削除</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── メインコンポーネント ─────────────────────────────
export function CustomersClient({ customers, isAdmin }: { customers: Customer[]; isAdmin: boolean }) {
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState<CustomerPlan | "">("");
  const [filterStatus, setFilterStatus] = useState<CustomerStatus | "">("");

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.fullName.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.phoneNumber ?? "").includes(q);
    const matchPlan   = !filterPlan   || c.plan   === filterPlan;
    const matchStatus = !filterStatus || c.status === filterStatus;
    return matchSearch && matchPlan && matchStatus;
  });

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* ヘッダー */}
      <div className="mb-4 hidden md:flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">顧客マスタ</h1>
          <p className="text-sm text-gray-500 mt-0.5">{customers.length}名登録済み</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition"
          >
            <Plus size={16} /> 顧客を追加
          </button>
        )}
      </div>

      <div className="md:hidden mb-4">
        <h1 className="text-lg font-bold text-gray-900">顧客マスタ</h1>
        <p className="text-xs text-gray-500 mt-0.5">{customers.length}名登録済み</p>
      </div>

      {/* 検索・フィルター */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="氏名・メール・電話番号で検索..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as CustomerStatus | "")}
          className="px-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">全ステータス</option>
          <option value="trial">体験申し込み</option>
          <option value="active">在籍中</option>
          <option value="pending">審査中</option>
          <option value="inactive">退会</option>
        </select>
        <select
          value={filterPlan}
          onChange={(e) => setFilterPlan(e.target.value as CustomerPlan | "")}
          className="px-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">全プラン</option>
          <option value="monthly">月額制</option>
          <option value="pay_as_you_go">都度払い</option>
        </select>
      </div>

      {/* 追加フォーム（デスクトップ） */}
      {showAdd && (
        <div className="hidden md:block bg-white rounded-2xl border-2 border-blue-400 p-5 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-900">新しい顧客</p>
            <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
          <CustomerForm
            onClose={() => setShowAdd(false)}
            action={createCustomerAction}
            submitLabel="追加する"
          />
        </div>
      )}

      {/* 空状態 */}
      {customers.length === 0 && !showAdd ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">👤</p>
          <p className="text-sm font-semibold text-gray-600">顧客が登録されていません</p>
          <p className="text-xs text-gray-400 mt-1">最初の顧客を追加しましょう</p>
          {isAdmin && (
            <button
              onClick={() => setShowAdd(true)}
              className="mt-5 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition"
            >
              <Plus size={15} /> 顧客を追加
            </button>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">該当する顧客が見つかりません</p>
        </div>
      ) : (
        <>
          {/* デスクトップ：テーブル */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">氏名 / メール</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">電話番号</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">ステータス</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">プラン</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">開始日</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <CustomerRow key={c.id} customer={c} isAdmin={isAdmin} />
                ))}
              </tbody>
            </table>
          </div>

          {/* モバイル：カード */}
          <div className="md:hidden space-y-2">
            {filtered.map((c) => (
              <CustomerCard key={c.id} customer={c} isAdmin={isAdmin} />
            ))}
          </div>
        </>
      )}

      {/* FAB（モバイル） */}
      {isAdmin && (
        <button
          onClick={() => setShowAdd(true)}
          className="md:hidden fixed bottom-6 right-4 w-14 h-14 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-full shadow-lg shadow-blue-200 flex items-center justify-center transition z-30"
          aria-label="顧客を追加"
        >
          <Plus size={26} />
        </button>
      )}

      {showAdd && (
        <BottomSheet title="新しい顧客" onClose={() => setShowAdd(false)} scrollable>
          <CustomerForm
            onClose={() => setShowAdd(false)}
            action={createCustomerAction}
            submitLabel="追加する"
          />
        </BottomSheet>
      )}
    </div>
  );
}

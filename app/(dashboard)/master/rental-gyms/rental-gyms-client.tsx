"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, X, MapPin, Building2 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import type { RentalGym } from "@/lib/rental-gyms";
import { createRentalGymAction, updateRentalGymAction, deleteRentalGymAction } from "./actions";

function yen(n: number) {
  return `¥${n.toLocaleString("ja-JP")}`;
}

function GymForm({
  defaultValues, onClose, action, submitLabel,
}: {
  defaultValues?: Partial<RentalGym>;
  onClose: () => void;
  action: (fd: FormData) => Promise<void>;
  submitLabel: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(fd: FormData) {
    setError(""); setLoading(true);
    try { await action(fd); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : "エラー"); setLoading(false); }
  }

  const inputClass = "w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelClass = "text-xs font-semibold text-gray-600 mb-1.5 block";

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass}>名前 <span className="text-red-500">*</span></label>
        <input name="name" required autoFocus defaultValue={defaultValues?.name} placeholder="○○レンタルジム 江坂店" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>住所</label>
        <input name="address" defaultValue={defaultValues?.address} placeholder="大阪府吹田市..." className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>料金（税込・1回あたり）</label>
        <input name="fee" type="number" min="0" step="1" defaultValue={defaultValues?.fee ?? ""} placeholder="例: 3000" className={inputClass} />
        <p className="text-xs text-gray-400 mt-1">レッスン追加時の初期値になります（その場で変更可）</p>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">キャンセル</button>
        <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold transition flex items-center justify-center gap-2">
          {loading && <Spinner size={14} />}{loading ? "保存中..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

function GymRow({ gym, isAdmin }: { gym: RentalGym; isAdmin: boolean }) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [deleting, setDeleting] = useState(false);
  const boundUpdate = updateRentalGymAction.bind(null, gym.id);

  async function handleDelete() {
    if (!confirm(`「${gym.name}」を削除しますか？`)) return;
    setDeleting(true);
    await deleteRentalGymAction(gym.id);
  }

  if (mode === "edit") {
    return (
      <div className="bg-white rounded-2xl border-2 border-blue-400 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-gray-900">レンタルジムを編集</p>
          <button onClick={() => setMode("view")} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <GymForm defaultValues={gym} onClose={() => setMode("view")} action={boundUpdate} submitLabel="保存する" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-start gap-3">
      <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
        <Building2 size={18} className="text-rose-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900">{gym.name}</p>
        {gym.address && (
          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><MapPin size={11} className="flex-shrink-0" />{gym.address}</p>
        )}
        <p className="text-xs font-semibold text-rose-600 mt-1">{yen(gym.fee)} / 回</p>
      </div>
      {isAdmin && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => setMode("edit")} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><Pencil size={13} /></button>
          <button onClick={handleDelete} disabled={deleting} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50">
            {deleting ? <Spinner size={13} /> : <Trash2 size={13} />}
          </button>
        </div>
      )}
    </div>
  );
}

export function RentalGymsClient({ gyms, isAdmin }: { gyms: RentalGym[]; isAdmin: boolean }) {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto pb-10">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Building2 size={20} className="text-rose-600" />
            <h1 className="text-xl font-bold text-gray-900">レンタルジムマスタ</h1>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">名前・住所・料金を管理（{gyms.length}件）</p>
        </div>
        {isAdmin && !showAdd && (
          <button onClick={() => setShowAdd(true)} className="flex-shrink-0 inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3.5 py-2 rounded-xl transition">
            <Plus size={16} /> 追加
          </button>
        )}
      </div>

      {showAdd && (
        <div className="bg-white rounded-2xl border-2 border-blue-400 p-5 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-900">新しいレンタルジム</p>
            <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <GymForm onClose={() => setShowAdd(false)} action={createRentalGymAction} submitLabel="追加する" />
        </div>
      )}

      {gyms.length === 0 && !showAdd ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🏢</p>
          <p className="text-sm font-semibold text-gray-600">レンタルジムが登録されていません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {gyms.map((g) => <GymRow key={g.id} gym={g} isAdmin={isAdmin} />)}
        </div>
      )}
    </div>
  );
}

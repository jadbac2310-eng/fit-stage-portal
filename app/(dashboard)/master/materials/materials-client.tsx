"use client";

import { ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Pencil, Trash2, X,
  Image as ImageIcon, FileText, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Material } from "@/lib/materials";
import { createMaterialAction, updateMaterialAction, deleteMaterialAction } from "./actions";
import { Spinner } from "@/components/ui/spinner";
import { MemberBadge } from "@/components/ui/member-badge";

// ─── モーダル ─────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full md:w-[420px] rounded-t-3xl md:rounded-2xl p-5 pb-10 md:pb-5 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4 md:hidden" />
        <div className="flex items-center justify-between mb-4">
          <p className="text-base font-bold text-gray-900">{title}</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── 画像アップロード ──────────────────────────────────
function ImageUpload({ currentSrc, required }: { currentSrc?: string; required?: boolean }) {
  const [preview, setPreview] = useState<string | null>(currentSrc ?? null);

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
        <ImageIcon size={12} /> 画像 {required && <span className="text-red-500">*</span>}
      </label>
      {preview && (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="プレビュー" className="w-full h-full object-contain" />
          <button
            type="button"
            onClick={() => setPreview(null)}
            className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition"
          >
            <X size={12} />
          </button>
        </div>
      )}
      <input
        type="file"
        name="image"
        required={required && !preview}
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setPreview(URL.createObjectURL(f));
        }}
        className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-gray-200 file:text-xs file:font-medium file:text-gray-600 file:bg-gray-50 hover:file:bg-gray-100 file:transition cursor-pointer"
      />
      <p className="text-xs text-gray-400">JPEG / PNG / WebP / GIF / SVG・最大10MB</p>
    </div>
  );
}

// ─── フォーム ─────────────────────────────────────────
function MaterialForm({
  defaultValues,
  isEdit = false,
  onClose,
  action,
  submitLabel,
}: {
  defaultValues?: Partial<Material>;
  isEdit?: boolean;
  onClose: () => void;
  action: (fd: FormData) => Promise<void>;
  submitLabel: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(fd: FormData) {
    setLoading(true);
    await action(fd);
    onClose();
  }

  return (
    <form action={handleSubmit} encType="multipart/form-data" className="space-y-4">
      <ImageUpload currentSrc={defaultValues?.imageUrl} required={!isEdit} />

      <div>
        <label className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
          <FileText size={12} /> 名前 <span className="text-red-500">*</span>
        </label>
        <input
          name="name"
          required
          autoFocus
          defaultValue={defaultValues?.name}
          placeholder="会社ロゴ、ブログ用バナーなど"
          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
          <FileText size={12} /> 説明
        </label>
        <textarea
          name="description"
          defaultValue={defaultValues?.description}
          rows={2}
          placeholder="用途・注意事項など（任意）"
          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

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


// ─── 素材カード ───────────────────────────────────────
function MaterialCard({
  material,
  isAdmin,
  onEdit,
}: {
  material: Material;
  isAdmin: boolean;
  onEdit: (m: Material) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`「${material.name}」を削除しますか？`)) return;
    setDeleting(true);
    try {
      await deleteMaterialAction(material.id);
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-sm transition-shadow flex flex-col">
      <div className="aspect-square bg-gray-100 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={material.imageUrl}
          alt={material.name}
          className="w-full h-full object-contain"
        />
      </div>

      <div className="p-3 flex-1 flex flex-col gap-1.5">
        <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-1">{material.name}</p>
        {material.description && (
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{material.description}</p>
        )}
        {material.createdBy && (
          <MemberBadge name={material.createdBy.name} avatarUrl={material.createdBy.avatarUrl} className="mt-auto pt-1" />
        )}
      </div>

      <div className="px-3 pb-3 flex items-center gap-1.5 flex-wrap">
        {isAdmin && (
          <>
            <button
              onClick={() => onEdit(material)}
              className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 px-2.5 py-1.5 rounded-lg transition"
            >
              <Pencil size={11} /> 編集
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 border border-red-300 px-2.5 py-1.5 rounded-lg transition disabled:opacity-60"
            >
              {deleting ? <><Spinner size={11} /> 削除中...</> : <><Trash2 size={11} /> 削除</>}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── ページネーション ─────────────────────────────────
function Pagination({ page, total, pageSize }: { page: number; total: number; pageSize: number }) {
  const router = useRouter();
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  const go = (p: number) => router.push(`/master/materials?page=${p}`);

  return (
    <div className="flex items-center justify-center gap-1.5 mt-6">
      <button
        onClick={() => go(page - 1)}
        disabled={page <= 1}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        <ChevronLeft size={14} />
      </button>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`e${i}`} className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm">…</span>
        ) : (
          <button
            key={p}
            onClick={() => go(p as number)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition ${
              p === page
                ? "bg-blue-600 text-white"
                : "border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => go(page + 1)}
        disabled={page >= totalPages}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

// ─── メインコンポーネント ─────────────────────────────
export function MaterialsClient({
  materials,
  total,
  page,
  pageSize,
  isAdmin,
}: {
  materials: Material[];
  total: number;
  page: number;
  pageSize: number;
  isAdmin: boolean;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-4 hidden md:flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">素材マスタ</h1>
          <p className="text-sm text-gray-500 mt-0.5">全{total}件</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition"
          >
            <Plus size={16} /> 素材を追加
          </button>
        )}
      </div>

      {total === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🖼️</p>
          <p className="text-sm font-semibold text-gray-600">素材が登録されていません</p>
          <p className="text-xs text-gray-400 mt-1">最初の素材を追加しましょう</p>
          {isAdmin && (
            <button
              onClick={() => setShowAdd(true)}
              className="mt-5 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition"
            >
              <Plus size={15} /> 素材を追加
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {materials.map((m) => (
              <MaterialCard
                key={m.id}
                material={m}
                isAdmin={isAdmin}
                onEdit={setEditingMaterial}
              />
            ))}
          </div>
          <Pagination page={page} total={total} pageSize={pageSize} />
        </>
      )}

      {isAdmin && (
        <button
          onClick={() => setShowAdd(true)}
          className="md:hidden fixed bottom-6 right-4 w-14 h-14 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-full shadow-lg shadow-blue-200 flex items-center justify-center transition z-30"
          aria-label="素材を追加"
        >
          <Plus size={26} />
        </button>
      )}

      {showAdd && isAdmin && (
        <Modal title="新しい素材" onClose={() => setShowAdd(false)}>
          <MaterialForm
            onClose={() => setShowAdd(false)}
            action={createMaterialAction}
            submitLabel="追加する"
          />
        </Modal>
      )}

      {editingMaterial && isAdmin && (
        <Modal title="素材を編集" onClose={() => setEditingMaterial(null)}>
          <MaterialForm
            defaultValues={editingMaterial}
            isEdit
            onClose={() => setEditingMaterial(null)}
            action={updateMaterialAction.bind(null, editingMaterial.id)}
            submitLabel="保存する"
          />
        </Modal>
      )}
    </div>
  );
}

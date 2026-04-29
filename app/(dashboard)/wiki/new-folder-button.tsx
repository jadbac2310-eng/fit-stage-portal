"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus, Plus, X } from "lucide-react";
import { createFolderAction } from "./actions";
import { wikiFolder } from "@/lib/paths";

export function NewFolderButton({ mobile }: { mobile?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setLoading(true);
    await createFolderAction(trimmed);
    router.push(wikiFolder(trimmed));
  }

  return (
    <>
      {mobile ? (
        <button
          onClick={() => setOpen(true)}
          className="w-14 h-14 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-full shadow-lg shadow-blue-200 flex items-center justify-center transition"
          aria-label="新しいフォルダ"
        >
          <Plus size={26} />
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 border border-gray-300 hover:border-gray-400 text-gray-700 font-semibold px-4 py-2.5 rounded-xl text-sm transition"
        >
          <FolderPlus size={16} /> 新しいフォルダ
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold text-gray-900">新しいフォルダを作成</p>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="フォルダ名（例：マニュアル）"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={!name.trim() || loading}
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold transition"
                >
                  {loading ? "作成中..." : "作成する"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

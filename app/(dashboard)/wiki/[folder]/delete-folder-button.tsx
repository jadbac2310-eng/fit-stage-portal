"use client";

import { Trash2 } from "lucide-react";
import { deleteFolderAction } from "../actions";

export function DeleteFolderButton({ folder, pageCount }: { folder: string; pageCount: number }) {
  async function handleDelete() {
    const msg = pageCount > 0
      ? `「${folder}」フォルダを削除しますか？\nフォルダ内の${pageCount}件のページも削除されます。`
      : `「${folder}」フォルダを削除しますか？`;
    if (!confirm(msg)) return;
    await deleteFolderAction(folder);
  }

  return (
    <button
      onClick={handleDelete}
      className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 font-semibold bg-red-50 hover:bg-red-100 border border-red-300 px-4 py-2.5 rounded-xl transition"
    >
      <Trash2 size={15} /> フォルダを削除
    </button>
  );
}

"use client";

import { Trash2 } from "lucide-react";
import { deleteWikiPageAction } from "../../actions";

export function DeleteButton({ slug, folder, title }: { slug: string; folder: string; title: string }) {
  async function handleDelete() {
    if (!confirm(`「${title}」を削除しますか？`)) return;
    await deleteWikiPageAction(slug, folder);
  }

  return (
    <button
      onClick={handleDelete}
      className="flex-shrink-0 flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 font-medium bg-red-50 hover:bg-red-100 border border-red-300 px-3 py-1.5 rounded-lg transition"
    >
      <Trash2 size={13} /> 削除
    </button>
  );
}

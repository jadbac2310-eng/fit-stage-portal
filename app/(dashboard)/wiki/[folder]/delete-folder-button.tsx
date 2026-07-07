"use client";

import { Trash2 } from "lucide-react";
import { deleteFolderAction } from "../actions";
import { Spinner } from "@/components/ui/spinner";
import { useSubmitLock } from "@/lib/use-submit-lock";

// 成功時にサーバー側で redirect() する。redirect はクライアントに NEXT_REDIRECT エラーとして
// 伝播することがあるため、その場合は再throwして通常のナビゲーションを妨げない。
function isRedirect(e: unknown): boolean {
  return typeof (e as { digest?: unknown })?.digest === "string" &&
    (e as { digest: string }).digest.startsWith("NEXT_REDIRECT");
}

export function DeleteFolderButton({ folder, pageCount }: { folder: string; pageCount: number }) {
  const { locked: deleting, run: runDelete } = useSubmitLock();

  function handleDelete() {
    if (deleting) return;
    const msg = pageCount > 0
      ? `「${folder}」フォルダを削除しますか？\nフォルダ内の${pageCount}件のページも削除されます。`
      : `「${folder}」フォルダを削除しますか？`;
    if (!confirm(msg)) return;
    runDelete(async () => {
      try {
        await deleteFolderAction(folder);
      } catch (e) {
        if (isRedirect(e)) throw e;
        alert(e instanceof Error ? e.message : "削除に失敗しました");
      }
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 font-semibold bg-red-50 hover:bg-red-100 border border-red-300 px-4 py-2.5 rounded-xl transition disabled:opacity-50"
    >
      {deleting ? <Spinner size={15} /> : <Trash2 size={15} />} {deleting ? "削除中…" : "フォルダを削除"}
    </button>
  );
}

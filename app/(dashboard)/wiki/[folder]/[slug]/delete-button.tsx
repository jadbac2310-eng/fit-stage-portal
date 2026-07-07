"use client";

import { Trash2 } from "lucide-react";
import { deleteWikiPageAction } from "../../actions";
import { Spinner } from "@/components/ui/spinner";
import { useSubmitLock } from "@/lib/use-submit-lock";

// 成功時にサーバー側で redirect() する。redirect はクライアントに NEXT_REDIRECT エラーとして
// 伝播することがあるため、その場合は再throwして通常のナビゲーションを妨げない。
function isRedirect(e: unknown): boolean {
  return typeof (e as { digest?: unknown })?.digest === "string" &&
    (e as { digest: string }).digest.startsWith("NEXT_REDIRECT");
}

export function DeleteButton({ slug, folder, title }: { slug: string; folder: string; title: string }) {
  const { locked: deleting, run: runDelete } = useSubmitLock();

  function handleDelete() {
    if (deleting) return;
    if (!confirm(`「${title}」を削除しますか？`)) return;
    runDelete(async () => {
      try {
        await deleteWikiPageAction(slug, folder);
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
      className="flex-shrink-0 flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 font-medium bg-red-50 hover:bg-red-100 border border-red-300 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
    >
      {deleting ? <Spinner size={13} /> : <Trash2 size={13} />} {deleting ? "削除中…" : "削除"}
    </button>
  );
}

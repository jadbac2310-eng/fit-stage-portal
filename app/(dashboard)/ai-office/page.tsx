import { getCurrentIsAdmin, getMembers } from "@/lib/members";
import { loadOpsFindings } from "@/lib/ops-check-load";
import { AiOfficeView } from "./ai-office-view";

export const dynamic = "force-dynamic";

/**
 * AI部署（2026-11-16 尚樹の依頼「FIT STAGE を AI の担当者による擬似会社にしたい。社長の下に部署があって、可視化したい」）。
 *
 * 社長（代表）の下に、AIの部署を並べて見せる。部署ごとに、何をしているか・いつ動くか・今日の報告。
 * いま実際に動いているのは「業務チェック部」（毎朝の LINE と、この画面の報告）と「ポータル開発部」（Claude Code のセッション）。
 * 部署の一覧は departments.ts。部署を増やすときはそこに足す。
 */
export default async function AiOfficePage() {
  const isAdmin = await getCurrentIsAdmin();
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-4xl">🔒</p>
        <p className="text-sm font-semibold text-gray-600">管理者のみ閲覧できます</p>
      </div>
    );
  }

  const [members, findings] = await Promise.all([
    getMembers(),
    loadOpsFindings().catch(() => null),
  ]);
  const owner = members.find((m) => m.isOwner);
  return <AiOfficeView owner={owner && { name: owner.name, avatarUrl: owner.avatarUrl }} findings={findings} />;
}

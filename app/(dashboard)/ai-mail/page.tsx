import { getCurrentMember } from "@/lib/members";
import { getAgentEvents, getAgentStatus, getMailRows, getMonthSpendUsd } from "@/lib/ai-mail";
import { AiMailView } from "./ai-mail-view";

export const dynamic = "force-dynamic";

/**
 * AIメール担当（2026-11-21〜。フェーズ1＝読むだけ）。
 * VPS のワーカー（リポジトリ fit-stage-agents）が、Gmail と HP のお問い合わせを仕分けて mail_messages に書く。
 * この画面では：動いているか・緊急停止・今月の AI 代・仕分けの一覧・正解を付ける（精度の報告用）・ログ。
 * 返信はしない（フェーズ2で下書きと承認、フェーズ3で定型の自動返信）。
 */
export default async function AiMailPage() {
  const me = await getCurrentMember();
  if (!me || !(me.isOwner || me.isAdmin)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-4xl">🔒</p>
        <p className="text-sm font-semibold text-gray-600">管理者のみ閲覧できます</p>
      </div>
    );
  }
  const [status, rows, events, spent] = await Promise.all([
    getAgentStatus().catch(() => null),
    getMailRows({ sinceDays: 14 }).catch(() => []),
    getAgentEvents(60).catch(() => []),
    getMonthSpendUsd().catch(() => 0),
  ]);
  return <AiMailView status={status} rows={rows} events={events} spentUsd={spent} nowIso={new Date().toISOString()} />;
}

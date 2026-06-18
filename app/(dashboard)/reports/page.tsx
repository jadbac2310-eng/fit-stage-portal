import { getLessons } from "@/lib/lessons";
import { getCurrentMember } from "@/lib/members";
import { collectExerciseNames } from "@/lib/exercise-types";
import { ReportsClient } from "./reports-client";

export const dynamic = "force-dynamic";

// レポート管理（全員が閲覧可）。顧客ごとに、過去のレポートを見ながら
// 当日のレポートを記入し、自動保存できる統合画面。
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string }>;
}) {
  const [{ customer }, lessons, member] = await Promise.all([
    searchParams,
    getLessons(),
    getCurrentMember(),
  ]);

  return (
    <ReportsClient
      lessons={lessons}
      currentMemberId={member?.id}
      isAdmin={member?.isAdmin ?? false}
      initialCustomerId={customer}
      pastExerciseNames={collectExerciseNames(lessons.map((l) => l.exercises))}
    />
  );
}

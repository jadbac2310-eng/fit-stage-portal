import { getCurrentMember } from "@/lib/members";
import { buildHourlyEntries } from "@/lib/commissions";
import { loadTrainerStatements } from "@/lib/commission-statement-load";
import { DEFAULT_COMMISSION_PAY_DAY } from "@/lib/commission-pay-date";
import { StatementClient } from "./statement-client";

export const dynamic = "force-dynamic";

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function CommissionStatementPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const member = await getCurrentMember();
  if (!member?.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-6 text-center">
        <p className="text-4xl">🔒</p>
        <p className="text-sm font-semibold text-gray-600">管理者のみ閲覧できます</p>
      </div>
    );
  }

  const { month: monthParam } = await searchParams;
  const month = monthParam || currentMonth();
  // 読むところから明細を作る（ダッシュボードの箱・朝のLINEの知らせと同じ関数）
  const { statements, members, hourlyTasks } = await loadTrainerStatements(month);

  // 「予定」のままの業務は明細に載らない。支払い前に気付けるよう件数と金額を渡す。
  const hourlyEntries = buildHourlyEntries(hourlyTasks, month);
  const pendingHourly = {
    count: hourlyEntries.reduce((s, e) => s + e.pending.length, 0),
    total: hourlyEntries.reduce((s, e) => s + e.pendingTotal, 0),
    names: hourlyEntries.filter((e) => e.pending.length > 0).map((e) => e.memberName),
  };

  // 支払日は人によって違う（杉元さんは15日、ほかは25日）
  const payDays = Object.fromEntries(members.map((m) => [m.id, m.commissionPayDay ?? DEFAULT_COMMISSION_PAY_DAY]));

  return <StatementClient statements={statements} month={month} pendingHourly={pendingHourly} payDays={payDays} />;
}

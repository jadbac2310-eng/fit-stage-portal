import { getCustomers } from "@/lib/customers";
import { getAllCustomerPlans } from "@/lib/customer-plans";
import { getAllSessionPasses } from "@/lib/session-passes";
import { getLessons } from "@/lib/lessons";
import { getTrialLessons } from "@/lib/trial-lessons";
import { getAllPlans } from "@/lib/plans-master";
import { getCurrentMember } from "@/lib/members";
import { billingGroups, buildGroupInvoice, invoiceFeesFromPlans } from "@/lib/invoices";
import { courseToPaymentType, isBillableLessonStatus } from "@/lib/lessons-types";
import { InvoicesClient } from "./invoices-client";

export const dynamic = "force-dynamic";

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const member = await getCurrentMember();
  if (!member?.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-6 text-center">
        <p className="text-4xl">🧾</p>
        <p className="text-sm font-semibold text-gray-600">権限がありません</p>
        <p className="text-xs text-gray-400">請求書の発行は管理者のみ可能です</p>
      </div>
    );
  }

  const { month: monthParam } = await searchParams;
  const month = monthParam || currentMonth();

  const [customers, plans, passes, lessons, trialLessons, plansMaster] = await Promise.all([
    getCustomers(),
    getAllCustomerPlans(),
    getAllSessionPasses(),
    getLessons(),
    getTrialLessons(),
    getAllPlans(),
  ]);

  const fees = invoiceFeesFromPlans(plansMaster);

  const invoices = billingGroups(customers)
    .map((g) => buildGroupInvoice(g.biller, g.members, month, { plans, passes, lessons, trialLessons }, fees))
    .filter((inv) => inv.lines.length > 0) // 明細があれば出す（合計0円でも隠さない）
    .sort((a, b) => a.customerName.localeCompare(b.customerName, "ja"));

  // 請求漏れの検知: 実施済み（完了・当日キャンセル）なのにコース未設定のレッスン。
  // コースが無いと請求書の明細にも回数券の消化にもならず、どこにも計上されない。
  const uncounted = lessons
    .filter((l) =>
      l.scheduledAt.slice(0, 7) === month &&
      isBillableLessonStatus(l.status) &&
      !courseToPaymentType(l.course) &&
      !l.sessionPassId)
    .map((l) => ({
      id: l.id,
      date: l.scheduledAt.slice(0, 10),
      customerName: l.customerName || customers.find((c) => c.id === l.customerId)?.fullName || "（不明）",
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return <InvoicesClient invoices={invoices} month={month} uncounted={uncounted} />;
}

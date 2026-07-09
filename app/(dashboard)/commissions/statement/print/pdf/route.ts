import { renderToBuffer } from "@react-pdf/renderer";
import type { NextRequest } from "next/server";
import { getCustomers } from "@/lib/customers";
import { getLessons } from "@/lib/lessons";
import { getTrialLessons } from "@/lib/trial-lessons";
import { getHourlyTasks } from "@/lib/hourly-tasks";
import { getCurrentMember, getMembers } from "@/lib/members";
import { getAllSessionPasses } from "@/lib/session-passes";
import { getAllCustomerPlans } from "@/lib/customer-plans";
import { getAllPlans, buildLessonFeeMap, getAllSessionPassPrices, buildSessionPassPriceMap } from "@/lib/plans-master";
import { getMemberCustomerRates } from "@/lib/commission-rates";
import { isBillableLessonStatus } from "@/lib/lessons-types";
import { type CommissionContext } from "@/lib/commissions";
import { buildTrainerStatements } from "@/lib/commission-statement";
import { ISSUER, monthLabel, taxBreakdown } from "@/lib/invoices";
import { CommissionStatementDocument } from "@/lib/commission-statement-pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function statementNumber(month: string, memberId: string): string {
  return `PAY-${month.replace("-", "")}-${memberId.slice(0, 6).toUpperCase()}`;
}

export async function GET(req: NextRequest) {
  const currentMember = await getCurrentMember();
  if (!currentMember?.isAdmin) return new Response("権限がありません", { status: 403 });

  const memberId = req.nextUrl.searchParams.get("member");
  const month = req.nextUrl.searchParams.get("month");
  if (!memberId || !month) return new Response("パラメータが不正です", { status: 400 });

  const [customers, lessons, trialLessons, hourlyTasks, sessionPasses, customerPlans, members, plansMaster, sessionPassPrices, allRates] = await Promise.all([
    getCustomers(),
    getLessons(),
    getTrialLessons(),
    getHourlyTasks(),
    getAllSessionPasses(),
    getAllCustomerPlans(),
    getMembers(),
    getAllPlans(),
    getAllSessionPassPrices(),
    getMemberCustomerRates(),
  ]);

  const trainer = members.find((m) => m.id === memberId);
  if (!trainer) return new Response("担当者が見つかりません", { status: 404 });

  const ctx: CommissionContext = {
    customers, sessionPasses, customerPlans,
    members: members.map((m) => ({ id: m.id, name: m.name })),
    trainerRates: allRates.map((r) => ({ memberId: r.memberId, customerId: r.customerId, rate: r.rate })),
    lessonFees: buildLessonFeeMap(plansMaster),
    sessionPassPriceMap: buildSessionPassPriceMap(sessionPassPrices),
  };

  const completedLessons = lessons.filter((l) => isBillableLessonStatus(l.status));
  const completedTrialLessons = trialLessons.filter((l) => l.status === "completed");
  const contractedTrialLessons = trialLessons.filter((l) => l.contracted === true);
  const statement = buildTrainerStatements(completedLessons, completedTrialLessons, contractedTrialLessons, hourlyTasks, month, ctx)
    .find((s) => s.memberId === memberId);

  const buffer = await renderToBuffer(
    CommissionStatementDocument({
      trainerName: trainer.name,
      trainerInvoiceNumber: trainer.invoiceNumber,
      trainerLines: statement?.trainerLines ?? [],
      trainerTotal: statement?.trainerTotal ?? 0,
      salesLines: statement?.salesLines ?? [],
      salesTotal: statement?.salesTotal ?? 0,
      hourlyLines: statement?.hourlyLines ?? [],
      hourlyTotal: statement?.hourlyTotal ?? 0,
      total: statement?.total ?? 0,
      tax: taxBreakdown(statement?.total ?? 0),
      issuer: { name: ISSUER.name, contact: ISSUER.contact, address: ISSUER.address, tel: ISSUER.tel },
      statementNo: statementNumber(month, memberId),
      monthLabel: monthLabel(month),
    }),
  );

  const filename = `コミッション明細_${trainer.name}_${month}.pdf`;
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}

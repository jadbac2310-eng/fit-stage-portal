import { getTrialLessons } from "@/lib/trial-lessons";
import { getCustomers } from "@/lib/customers";
import { getMembers, getCurrentMember } from "@/lib/members";
import { getRentalGyms } from "@/lib/rental-gyms";
import { getStores } from "@/lib/stores";
import { getFctStores } from "@/lib/fct-stores";
import { getAvenirStores } from "@/lib/avenir-stores";
import { getCustomerVenueFees } from "@/lib/customer-venue-fees";
import { getTrialConfirmMailSent, getTrialConfirmations, isTrialConfirmed } from "@/lib/activity-logs";
import { trialConfirmUrl } from "@/lib/trial-confirm-token";
import type { TrialConfirmInfo } from "./confirm-mail-sheet";
import { isMailConfigured, mailFromAddress } from "@/lib/mailer";
import { TrialLessonsClient } from "./trial-lessons-client";

export const dynamic = "force-dynamic";

export default async function TrialLessonsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; report?: string }>;
}) {
  const [{ q, report }, lessons, customers, members, rentalGyms, stores, fctStores, avenirStores, venueFees, currentMember, mailSent, confirmations] = await Promise.all([
    searchParams,
    getTrialLessons(),
    getCustomers(),
    getMembers(),
    getRentalGyms(),
    getStores(),
    getFctStores(),
    getAvenirStores(),
    getCustomerVenueFees(),
    getCurrentMember(),
    getTrialConfirmMailSent(),
    getTrialConfirmations(),
  ]);
  // 予定の体験ごとに、メールに入れる確認ボタンのリンクと、お客様が押したかどうか
  const confirmInfo: Record<string, TrialConfirmInfo> = {};
  for (const l of lessons) {
    if (l.status !== "scheduled") continue;
    const c = confirmations[l.id];
    confirmInfo[l.id] = {
      url: trialConfirmUrl(l.id, l.scheduledAt) ?? undefined,
      confirmedAt: isTrialConfirmed(c, l.scheduledAt) ? c!.at : undefined,
      staleConfirmedAt: c && !isTrialConfirmed(c, l.scheduledAt) ? c.at : undefined,
    };
  }
  return (
    <TrialLessonsClient
      lessons={lessons}
      customers={customers}
      members={members}
      rentalGyms={rentalGyms}
      stores={stores}
      fctStores={fctStores}
      avenirStores={avenirStores}
      venueFees={venueFees}
      isAdmin={currentMember?.isAdmin ?? false}
      currentMemberId={currentMember?.id}
      initialSearch={q ?? ""}
      openReportId={report}
      mailFrom={isMailConfigured("store") ? mailFromAddress("store") : null}
      mailSent={mailSent}
      confirmInfo={confirmInfo}
    />
  );
}

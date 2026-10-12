import { getTrialLessons } from "@/lib/trial-lessons";
import { getCustomers } from "@/lib/customers";
import { getMembers, getCurrentMember } from "@/lib/members";
import { getRentalGyms } from "@/lib/rental-gyms";
import { getStores } from "@/lib/stores";
import { getFctStores } from "@/lib/fct-stores";
import { getAvenirStores } from "@/lib/avenir-stores";
import { getCustomerVenueFees } from "@/lib/customer-venue-fees";
import { TrialLessonsClient } from "./trial-lessons-client";

export const dynamic = "force-dynamic";

export default async function TrialLessonsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; report?: string }>;
}) {
  const [{ q, report }, lessons, customers, members, rentalGyms, stores, fctStores, avenirStores, venueFees, currentMember] = await Promise.all([
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
  ]);
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
    />
  );
}

import { getLessons } from "@/lib/lessons";
import { getCustomers } from "@/lib/customers";
import { getMembers, getCurrentMember } from "@/lib/members";
import { getAllSessionPasses } from "@/lib/session-passes";
import { getAllCustomerPlans } from "@/lib/customer-plans";
import { getRentalGyms } from "@/lib/rental-gyms";
import { getStores } from "@/lib/stores";
import { getFctStores } from "@/lib/fct-stores";
import { getAvenirStores } from "@/lib/avenir-stores";
import { getCustomerVenueFees } from "@/lib/customer-venue-fees";
import { getTrialLessons } from "@/lib/trial-lessons";
import { RegularLessonsClient } from "./regular-lessons-client";

export const dynamic = "force-dynamic";

export default async function RegularLessonsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ q }, lessons, customers, members, sessionPasses, customerPlans, rentalGyms, stores, fctStores, avenirStores, venueFees, trialLessons, member] = await Promise.all([
    searchParams,
    getLessons(),
    getCustomers(),
    getMembers(),
    getAllSessionPasses(),
    getAllCustomerPlans(),
    getRentalGyms(),
    getStores(),
    getFctStores(),
    getAvenirStores(),
    getCustomerVenueFees(),
    getTrialLessons(),
    getCurrentMember(),
  ]);
  return (
    <RegularLessonsClient
      lessons={lessons}
      customers={customers}
      members={members}
      sessionPasses={sessionPasses}
      customerPlans={customerPlans}
      rentalGyms={rentalGyms}
      stores={stores}
      fctStores={fctStores}
      avenirStores={avenirStores}
      venueFees={venueFees}
      trialLessons={trialLessons}
      isAdmin={member?.isAdmin ?? false}
      currentMemberId={member?.id}
      initialSearch={q ?? ""}
    />
  );
}

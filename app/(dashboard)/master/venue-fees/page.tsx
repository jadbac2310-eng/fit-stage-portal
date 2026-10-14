import { getCustomerVenueFees } from "@/lib/customer-venue-fees";
import { getCustomers } from "@/lib/customers";
import { getRentalGyms } from "@/lib/rental-gyms";
import { getStores } from "@/lib/stores";
import { getFctStores } from "@/lib/fct-stores";
import { getAvenirStores } from "@/lib/avenir-stores";
import { getCurrentIsAdmin } from "@/lib/members";
import { VenueFeesClient } from "./venue-fees-client";

export const dynamic = "force-dynamic";

export default async function VenueFeesPage() {
  const isAdmin = await getCurrentIsAdmin();

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-4xl">🔒</p>
        <p className="text-sm font-semibold text-gray-600">管理者のみ閲覧できます</p>
      </div>
    );
  }

  const [fees, customers, rentalGyms, fctStores, avenirStores, stores] = await Promise.all([
    getCustomerVenueFees(),
    getCustomers(),
    getRentalGyms(),
    getFctStores(),
    getAvenirStores(),
    getStores(),
  ]);

  const opt = (v: { id: string; name: string; fee: number }) => ({ id: v.id, name: v.name, fee: v.fee });

  return (
    <VenueFeesClient
      fees={fees.map((f) => ({
        id: f.id, customerId: f.customerId, venueKind: f.venueKind, venueId: f.venueId, fee: f.fee,
      }))}
      customers={customers.map((c) => ({ id: c.id, name: c.fullName }))}
      rentalGyms={rentalGyms.map(opt)}
      fctStores={fctStores.map(opt)}
      avenirStores={avenirStores.map(opt)}
      stores={stores.map(opt)}
    />
  );
}

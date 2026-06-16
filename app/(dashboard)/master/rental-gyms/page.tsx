import { getRentalGyms } from "@/lib/rental-gyms";
import { getCurrentIsAdmin } from "@/lib/members";
import { RentalGymsClient } from "./rental-gyms-client";

export const dynamic = "force-dynamic";

export default async function RentalGymsPage() {
  const [gyms, isAdmin] = await Promise.all([getRentalGyms(), getCurrentIsAdmin()]);
  return <RentalGymsClient gyms={gyms} isAdmin={isAdmin} />;
}

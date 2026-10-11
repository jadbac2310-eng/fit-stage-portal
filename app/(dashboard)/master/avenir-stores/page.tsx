import { getAvenirStores } from "@/lib/avenir-stores";
import { getCurrentIsAdmin } from "@/lib/members";
import { AvenirStoresClient } from "./avenir-stores-client";

export const dynamic = "force-dynamic";

export default async function AvenirStoresPage() {
  const [stores, isAdmin] = await Promise.all([getAvenirStores(), getCurrentIsAdmin()]);
  return <AvenirStoresClient stores={stores} isAdmin={isAdmin} />;
}

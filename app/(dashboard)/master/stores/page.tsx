import { getStores } from "@/lib/stores";
import { getCurrentIsAdmin } from "@/lib/members";
import { StoresClient } from "./stores-client";

export const dynamic = "force-dynamic";

export default async function StoresPage() {
  const [stores, isAdmin] = await Promise.all([getStores(), getCurrentIsAdmin()]);
  return <StoresClient stores={stores} isAdmin={isAdmin} />;
}

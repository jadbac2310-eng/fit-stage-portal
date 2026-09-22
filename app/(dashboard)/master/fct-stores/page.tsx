import { getFctStores } from "@/lib/fct-stores";
import { getCurrentIsAdmin } from "@/lib/members";
import { FctStoresClient } from "./fct-stores-client";

export const dynamic = "force-dynamic";

export default async function FctStoresPage() {
  const [stores, isAdmin] = await Promise.all([getFctStores(), getCurrentIsAdmin()]);
  return <FctStoresClient stores={stores} isAdmin={isAdmin} />;
}

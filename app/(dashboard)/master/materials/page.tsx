import { getMaterials } from "@/lib/materials";
import { getCurrentIsAdmin } from "@/lib/members";
import { MaterialsClient } from "./materials-client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10));

  const [{ materials, total }, isAdmin] = await Promise.all([
    getMaterials({ page, pageSize: PAGE_SIZE }),
    getCurrentIsAdmin(),
  ]);

  return (
    <MaterialsClient
      materials={materials}
      total={total}
      page={page}
      pageSize={PAGE_SIZE}
      isAdmin={isAdmin}
    />
  );
}

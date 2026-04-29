import { DrawerLayout } from "@/components/layout/drawer-layout";
import { getCurrentMember } from "@/lib/members";
import { getWikiFolders } from "@/lib/wiki";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [currentMember, wikiFolders] = await Promise.all([
    getCurrentMember(),
    getWikiFolders(),
  ]);

  const wikiNavItems = wikiFolders.map((folder) => ({
    label: folder,
    href: `/wiki/${encodeURIComponent(folder)}`,
    children: [],
  }));

  return (
    <DrawerLayout
      userName={currentMember?.name}
      avatarUrl={currentMember?.avatarUrl}
      wikiNavItems={wikiNavItems}
    >
      {children}
    </DrawerLayout>
  );
}

import { DrawerLayout } from "@/components/layout/drawer-layout";
import { getCurrentMember } from "@/lib/members";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const currentMember = await getCurrentMember();

  return (
    <DrawerLayout
      userName={currentMember?.name}
      avatarUrl={currentMember?.avatarUrl}
    >
      {children}
    </DrawerLayout>
  );
}

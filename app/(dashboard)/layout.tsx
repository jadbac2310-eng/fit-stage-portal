import { DrawerLayout } from "@/components/layout/drawer-layout";
import { getCurrentMember } from "@/lib/members";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const currentMember = await getCurrentMember();
  // 上の帯に出す今日の日付（日本時間）。端末側で作ると、サーバーと日付がずれる時間帯がある
  const todayLabel = new Date().toLocaleDateString("ja-JP", {
    year: "numeric", month: "long", day: "numeric", weekday: "short", timeZone: "Asia/Tokyo",
  });

  return (
    <DrawerLayout
      userName={currentMember?.name}
      avatarUrl={currentMember?.avatarUrl}
      isAdmin={currentMember?.isAdmin ?? false}
      todayLabel={todayLabel}
    >
      {children}
    </DrawerLayout>
  );
}

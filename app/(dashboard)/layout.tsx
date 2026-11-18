import { DrawerLayout } from "@/components/layout/drawer-layout";
import { getCurrentMember } from "@/lib/members";
import { DeployGuard } from "@/components/layout/deploy-guard";
import { LangProvider } from "@/components/i18n/lang-provider";
import { getLang } from "@/lib/i18n-server";
import { dateLocale } from "@/lib/i18n";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [currentMember, lang] = await Promise.all([getCurrentMember(), getLang()]);
  // 上の帯に出す今日の日付（日本時間）。端末側で作ると、サーバーと日付がずれる時間帯がある
  const todayLabel = new Date().toLocaleDateString(dateLocale(lang), {
    year: "numeric", month: "long", day: "numeric", weekday: "short", timeZone: "Asia/Tokyo",
  });

  return (
    <LangProvider lang={lang}>
    <DrawerLayout
      userName={currentMember?.name}
      avatarUrl={currentMember?.avatarUrl}
      isAdmin={currentMember?.isAdmin ?? false}
      todayLabel={todayLabel}
    >
      {children}
      {/* ポータルを新しくした直後に、古い画面のまま保存して英語のエラーが出るのを防ぐ */}
      <DeployGuard />
    </DrawerLayout>
    </LangProvider>
  );
}

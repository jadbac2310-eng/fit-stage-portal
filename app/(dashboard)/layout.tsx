import { DrawerLayout } from "@/components/layout/drawer-layout";
import { createAuthClient } from "@/lib/supabase";
import { getMembers } from "@/lib/members";
import { getWikiPages, getWikiFolders } from "@/lib/wiki";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userName: string | undefined;
  let avatarUrl: string | undefined;

  if (user) {
    const members = await getMembers();
    const member = members.find((m) => m.authUserId === user.id || m.email === user.email);
    userName = member?.name ?? user.email ?? undefined;
    avatarUrl = member?.avatarUrl;
  }

  const [wikiPages, wikiFolders] = await Promise.all([
    getWikiPages(),
    getWikiFolders(),
  ]);

  const pagesByFolder = wikiPages.reduce<Record<string, { label: string; href: string }[]>>((acc, p) => {
    if (!acc[p.folder]) acc[p.folder] = [];
    acc[p.folder].push({ label: p.title, href: `/wiki/${encodeURIComponent(p.folder)}/${p.slug}` });
    return acc;
  }, {});

  const wikiNavItems = wikiFolders.map((folder) => ({
    label: folder,
    href: `/wiki/${encodeURIComponent(folder)}`,
    children: pagesByFolder[folder] ?? [],
  }));

  return (
    <DrawerLayout userName={userName} avatarUrl={avatarUrl} wikiNavItems={wikiNavItems}>
      {children}
    </DrawerLayout>
  );
}

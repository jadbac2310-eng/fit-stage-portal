import { getCurrentMember } from "@/lib/members";
import { AssistantClient } from "./assistant-client";

export const dynamic = "force-dynamic";

/**
 * データアシスタント。ログインした全員が使える。
 * 管理者かどうかで見せるデータが変わる（売上・利益・他人の歩合は管理者だけ。lib/assistant-tools.ts）。
 */
export default async function AssistantPage() {
  const me = await getCurrentMember();
  return <AssistantClient isAdmin={me?.isAdmin ?? false} userName={me?.name ?? ""} />;
}

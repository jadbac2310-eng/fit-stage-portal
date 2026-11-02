import { redirect } from "next/navigation";

// アシスタントは全員が使えるようになったので /assistant へ（古いリンク・ブックマーク用）
export default function AdminAssistantRedirect() {
  redirect("/assistant");
}

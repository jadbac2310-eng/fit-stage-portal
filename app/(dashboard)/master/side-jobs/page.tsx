import { redirect } from "next/navigation";

// 単発の仕事は目次から直接入れるようにした（/side-jobs）。古いリンク用
export default function OldSideJobsRedirect() {
  redirect("/side-jobs");
}

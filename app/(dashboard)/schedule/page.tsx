import { getCurrentMember, getMembers } from "@/lib/members";
import { getLessons } from "@/lib/lessons";
import { getTrialLessons } from "@/lib/trial-lessons";
import { ScheduleClient, type ScheduleItem } from "./schedule-client";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const member = await getCurrentMember();

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-6 text-center">
        <p className="text-4xl">🗓️</p>
        <p className="text-sm font-semibold text-gray-600">担当者アカウントに紐づいていません</p>
        <p className="text-xs text-gray-400">管理者に担当者の割り当てを依頼してください</p>
      </div>
    );
  }

  const isAdmin = member.isAdmin;
  const [lessons, trialLessons, members] = await Promise.all([
    getLessons(),
    getTrialLessons(),
    isAdmin ? getMembers() : Promise.resolve([]),
  ]);

  const items: ScheduleItem[] = [];

  // 通常レッスン（管理者は全件、それ以外は自分がトレーナーの分のみ）
  for (const l of lessons) {
    if (isAdmin || l.trainerMemberId === member.id) {
      items.push({
        id: l.id,
        type: "regular",
        customerName: l.customerName,
        scheduledAt: l.scheduledAt,
        location: l.location,
        course: l.course,
        status: l.status,
        trainerId: l.trainerMemberId,
        trainerName: l.trainerMemberName,
      });
    }
  }

  // 体験レッスン（管理者は全件、それ以外は自分がトレーナー/営業の分のみ）
  for (const t of trialLessons) {
    const isMine = t.trainerMemberId === member.id || t.salesMemberId === member.id;
    if (isAdmin || isMine) {
      items.push({
        id: t.id,
        type: "trial",
        customerName: t.customerName,
        scheduledAt: t.scheduledAt,
        location: t.location,
        status: t.status,
        trainerId: t.trainerMemberId,
        trainerName: t.trainerMemberName,
        salesId: t.salesMemberId,
        salesName: t.salesMemberName,
      });
    }
  }

  return (
    <ScheduleClient
      items={items}
      memberName={member.name}
      isAdmin={isAdmin}
      currentMemberId={member.id}
      members={members.map((m) => ({ id: m.id, name: m.name }))}
    />
  );
}

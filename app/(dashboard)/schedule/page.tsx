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
  // 全員が全員のスケジュールを閲覧できる（編集は管理者のみ）。担当者フィルタ用に全員分を取得。
  const [lessons, trialLessons, members] = await Promise.all([
    getLessons(),
    getTrialLessons(),
    getMembers(),
  ]);

  const items: ScheduleItem[] = [];

  // 通常レッスン（全件）
  for (const l of lessons) {
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
      note: l.note,
      exercises: l.exercises,
    });
  }

  // 体験レッスン（全件）
  for (const t of trialLessons) {
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
      note: t.note,
      exercises: t.exercises,
      customerImpression: t.customerImpression,
      contracted: t.contracted,
    });
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

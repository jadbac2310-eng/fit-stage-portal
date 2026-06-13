import { getCurrentMember } from "@/lib/members";
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

  const [lessons, trialLessons] = await Promise.all([getLessons(), getTrialLessons()]);

  const items: ScheduleItem[] = [];

  for (const l of lessons) {
    if (l.trainerMemberId === member.id) {
      items.push({
        id: l.id,
        type: "regular",
        customerName: l.customerName,
        scheduledAt: l.scheduledAt,
        location: l.location,
        course: l.course,
        status: l.status,
        role: "trainer",
      });
    }
  }

  for (const t of trialLessons) {
    const isTrainer = t.trainerMemberId === member.id;
    const isSales = t.salesMemberId === member.id;
    if (isTrainer || isSales) {
      items.push({
        id: t.id,
        type: "trial",
        customerName: t.customerName,
        scheduledAt: t.scheduledAt,
        location: t.location,
        status: t.status,
        role: isTrainer ? "trainer" : "sales",
      });
    }
  }

  return <ScheduleClient items={items} memberName={member.name} />;
}

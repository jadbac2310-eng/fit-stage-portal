import { getCurrentMember, getMembers } from "@/lib/members";
import { getLessons } from "@/lib/lessons";
import { getTrialLessons } from "@/lib/trial-lessons";
import { getCustomers } from "@/lib/customers";
import { getAllSessionPasses } from "@/lib/session-passes";
import { getAllCustomerPlans } from "@/lib/customer-plans";
import { getRentalGyms } from "@/lib/rental-gyms";
import { getStores } from "@/lib/stores";
import { getPersonalEvents } from "@/lib/personal-events";
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
  // customers / sessionPasses / customerPlans はスケジュールから通常レッスンを追加するフォーム用。
  const [lessons, trialLessons, members, personalEvents, customers, sessionPasses, customerPlans, rentalGyms, stores] = await Promise.all([
    getLessons(),
    getTrialLessons(),
    getMembers(),
    getPersonalEvents(),
    getCustomers(),
    getAllSessionPasses(),
    getAllCustomerPlans(),
    getRentalGyms(),
    getStores(),
  ]);

  const items: ScheduleItem[] = [];
  const nameOf = (id?: string) => (id ? members.find((m) => m.id === id)?.name : undefined);

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
      createdById: l.createdById,
      createdByName: l.createdByName ?? nameOf(l.createdById),
      createdAt: l.createdAt,
      updatedByName: nameOf(l.updatedById),
      updatedAt: l.updatedAt,
      note: l.note,
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
      createdByName: nameOf(t.createdById),
      createdAt: t.createdAt,
      updatedByName: nameOf(t.updatedById),
      updatedAt: t.updatedAt,
      note: t.note,
      contracted: t.contracted,
    });
  }

  // 個人予定（全件・全員に共有）
  for (const e of personalEvents) {
    items.push({
      id: e.id,
      type: "personal",
      customerName: e.title,
      scheduledAt: e.startAt,
      endAt: e.endAt,
      allDay: e.allDay,
      color: e.color,
      location: e.location,
      note: e.memo,
      status: "scheduled",
      ownerId: e.memberId,
      ownerName: e.memberName,
      createdByName: e.memberName,
      createdAt: e.createdAt,
      updatedByName: nameOf(e.updatedById),
      updatedAt: e.updatedAt,
      participantIds: e.participantIds,
      participantNames: e.participantIds.map((id) => nameOf(id)).filter((n): n is string => !!n),
      notify: e.notify,
    });
  }

  return (
    <ScheduleClient
      items={items}
      memberName={member.name}
      isAdmin={isAdmin}
      currentMemberId={member.id}
      members={members}
      customers={customers}
      sessionPasses={sessionPasses}
      customerPlans={customerPlans}
      lessons={lessons}
      rentalGyms={rentalGyms}
      stores={stores}
    />
  );
}

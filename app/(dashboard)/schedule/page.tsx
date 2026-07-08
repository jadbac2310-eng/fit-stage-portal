import { getCurrentMember, getMembers } from "@/lib/members";
import { getLessons } from "@/lib/lessons";
import { getTrialLessons } from "@/lib/trial-lessons";
import { getCustomers } from "@/lib/customers";
import { getAllSessionPasses } from "@/lib/session-passes";
import { getAllCustomerPlans } from "@/lib/customer-plans";
import { getRentalGyms } from "@/lib/rental-gyms";
import { getStores } from "@/lib/stores";
import { getPersonalEvents } from "@/lib/personal-events";
import { getHourlyTasks } from "@/lib/hourly-tasks";
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
  // 各取得を個別に捕捉し、どれが失敗したか＋実際のDBエラー内容を画面に出す（本番でも原因が分かるように）。
  async function safe<T>(label: string, fn: () => Promise<T>): Promise<{ label: string; value?: T; error?: unknown }> {
    try { return { label, value: await fn() }; }
    catch (e) { return { label, error: e }; }
  }
  const results = await Promise.all([
    safe("getLessons", getLessons),
    safe("getTrialLessons", getTrialLessons),
    safe("getMembers", getMembers),
    safe("getPersonalEvents", getPersonalEvents),
    safe("getHourlyTasks", getHourlyTasks),
    safe("getCustomers", getCustomers),
    safe("getAllSessionPasses", getAllSessionPasses),
    safe("getAllCustomerPlans", getAllCustomerPlans),
    safe("getRentalGyms", getRentalGyms),
    safe("getStores", getStores),
  ]);
  const failed = results.filter((r) => r.error);
  if (failed.length > 0) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <p className="text-sm font-bold text-red-600 mb-2">データ取得エラー（この内容を共有してください）</p>
        {failed.map((r) => {
          const e = r.error as { code?: string; message?: string; details?: string; hint?: string } | Error;
          return (
            <pre key={r.label} className="text-[11px] whitespace-pre-wrap break-all bg-red-50 border border-red-200 rounded-xl p-3 mb-2 text-red-800">
              {r.label}{"\n"}{JSON.stringify(e, Object.getOwnPropertyNames(e), 2)}
            </pre>
          );
        })}
      </div>
    );
  }
  const lessons        = results[0].value as Awaited<ReturnType<typeof getLessons>>;
  const trialLessons   = results[1].value as Awaited<ReturnType<typeof getTrialLessons>>;
  const members        = results[2].value as Awaited<ReturnType<typeof getMembers>>;
  const personalEvents = results[3].value as Awaited<ReturnType<typeof getPersonalEvents>>;
  const hourlyTasks    = results[4].value as Awaited<ReturnType<typeof getHourlyTasks>>;
  const customers      = results[5].value as Awaited<ReturnType<typeof getCustomers>>;
  const sessionPasses  = results[6].value as Awaited<ReturnType<typeof getAllSessionPasses>>;
  const customerPlans  = results[7].value as Awaited<ReturnType<typeof getAllCustomerPlans>>;
  const rentalGyms     = results[8].value as Awaited<ReturnType<typeof getRentalGyms>>;
  const stores         = results[9].value as Awaited<ReturnType<typeof getStores>>;

  const items: ScheduleItem[] = [];
  const nameOf = (id?: string) => (id ? members.find((m) => m.id === id)?.name : undefined);
  const avatarOf = (id?: string) => (id ? members.find((m) => m.id === id)?.avatarUrl : undefined);

  // 通常レッスン（全件）
  for (const l of lessons) {
    items.push({
      id: l.id,
      type: "regular",
      customerName: l.customerName,
      customerId: l.customerId,
      scheduledAt: l.scheduledAt,
      endAt: l.endAt,
      location: l.location,
      course: l.course,
      status: l.status,
      trainerId: l.trainerMemberId,
      trainerName: l.trainerMemberName,
      trainerAvatarUrl: avatarOf(l.trainerMemberId),
      storeId: l.storeId,
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
      customerId: t.customerId,
      scheduledAt: t.scheduledAt,
      location: t.location,
      status: t.status,
      trainerId: t.trainerMemberId,
      trainerName: t.trainerMemberName,
      trainerAvatarUrl: avatarOf(t.trainerMemberId),
      salesId: t.salesMemberId,
      salesName: t.salesMemberName,
      salesAvatarUrl: avatarOf(t.salesMemberId),
      createdByName: nameOf(t.createdById),
      createdAt: t.createdAt,
      updatedByName: nameOf(t.updatedById),
      updatedAt: t.updatedAt,
      note: t.note,
      contracted: t.contracted,
    });
  }

  // 個人予定。非公開のものは作成者と参加者以外には表示しない。
  for (const e of personalEvents) {
    if (e.isPrivate && e.memberId !== member.id && !e.participantIds.includes(member.id)) continue;
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
      ownerAvatarUrl: avatarOf(e.memberId),
      createdByName: e.memberName,
      createdAt: e.createdAt,
      updatedByName: nameOf(e.updatedById),
      updatedAt: e.updatedAt,
      participantIds: e.participantIds,
      participantNames: e.participantIds.map((id) => nameOf(id)).filter((n): n is string => !!n),
      notify: e.notify,
      isPrivate: e.isPrivate,
    });
  }

  // 業務（全件・管理者のみ追加/編集可。割り当てられた担当者のスケジュールにも表示）
  for (const h of hourlyTasks) {
    items.push({
      id: h.id,
      type: "hourly",
      customerName: h.title,
      scheduledAt: h.scheduledAt,
      endAt: h.endAt,
      location: h.location,
      status: h.status,
      trainerId: h.memberId,
      trainerName: h.memberName,
      trainerAvatarUrl: avatarOf(h.memberId),
      createdByName: nameOf(h.createdById),
      createdAt: h.createdAt,
      updatedByName: nameOf(h.updatedById),
      updatedAt: h.updatedAt,
      note: h.note,
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
      hourlyTasks={hourlyTasks}
    />
  );
}

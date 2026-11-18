import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft, Calendar, Clock, MapPin, User, Dumbbell, FlaskConical,
  CheckCircle, XCircle, StickyNote, Ticket, Pencil, ClipboardList,
} from "lucide-react";
import { getLesson, getCustomerLessonHistory } from "@/lib/lessons";
import { getSessionPassUsage } from "@/lib/session-passes";
import { getTrialLesson, getFirstTrialLesson } from "@/lib/trial-lessons";
import { Handover } from "../handover";
import { getCurrentIsAdmin, getCurrentMember } from "@/lib/members";
import { LessonNoteEditor } from "../lesson-note";
import { LESSON_STATUS_LABEL } from "@/lib/lessons-types";
import { STATUS_LABEL as TRIAL_STATUS_LABEL, CONTRACT_LABEL } from "@/lib/trial-lessons-types";
import { getLang } from "@/lib/i18n-server";
import { makeT, dateLocale, courseLabel, type Lang } from "@/lib/i18n";

// 状態の英語（英語に切り替えている人向け）
const LESSON_STATUS_EN: Record<string, string> = { scheduled: "Scheduled", completed: "Done", cancelled: "Cancelled", cancelled_same_day: "Late cancel" };
const TRIAL_STATUS_EN: Record<string, string> = { scheduled: "Scheduled", completed: "Done", cancelled: "Cancelled" };
const CONTRACT_EN: Record<string, string> = { true: "Signed up", false: "Didn't sign up" };


export const dynamic = "force-dynamic";

function fmtDate(iso: string, lang: Lang) {
  return new Date(iso).toLocaleDateString(dateLocale(lang), {
    year: "numeric", month: "long", day: "numeric", weekday: "short", timeZone: "Asia/Tokyo",
  });
}
function fmtTime(iso: string, lang: Lang) {
  return new Date(iso).toLocaleTimeString(dateLocale(lang), { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" });
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="text-gray-400 mt-0.5 flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <div className="text-sm text-gray-800 mt-0.5">{children}</div>
      </div>
    </div>
  );
}

export default async function ScheduleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lang = await getLang();
  const t = makeT(lang);
  const en = lang === "en";
  const [lesson, isAdmin] = await Promise.all([getLesson(id), getCurrentIsAdmin()]);

  // ─── 通常レッスン ───────────────────────────────────
  if (lesson) {
    // 引き継ぎ用。前回までの記録と、最初の困りごと・目的（体験の申込内容）
    const [passUsage, history, firstTrial] = await Promise.all([
      lesson.sessionPassId ? getSessionPassUsage(lesson.sessionPassId, lesson.id) : null,
      getCustomerLessonHistory(lesson.customerId, lesson.scheduledAt, 3),
      getFirstTrialLesson(lesson.customerId),
    ]);
    return (
      <div className="p-4 md:p-6 max-w-lg mx-auto">
        <Link href="/schedule" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition mb-4">
          <ChevronLeft size={15} /> {t("スケジュール", "Schedule")}
        </Link>

        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
            <Dumbbell size={11} /> {t("通常レッスン", "Session")}
          </span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
            lesson.status === "scheduled" ? "bg-blue-50 text-blue-600" :
            lesson.status === "completed" ? "bg-green-100 text-green-700" :
            lesson.status === "cancelled_same_day" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"
          }`}>
            {lesson.status === "completed" ? <CheckCircle size={10} /> :
             (lesson.status === "cancelled" || lesson.status === "cancelled_same_day") ? <XCircle size={10} /> : <Clock size={10} />}
            {en ? LESSON_STATUS_EN[lesson.status] : LESSON_STATUS_LABEL[lesson.status]}
          </span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-4">{lesson.customerName}</h1>

        <div className="bg-white rounded-2xl border border-gray-200 px-4">
          <Row icon={<Calendar size={15} />} label={t("日付", "Date")}>{fmtDate(lesson.scheduledAt, lang)}</Row>
          <Row icon={<Clock size={15} />} label={t("時刻", "Time")}>
            {fmtTime(lesson.scheduledAt, lang)}{lesson.endAt ? `〜${fmtTime(lesson.endAt, lang)}` : ""}
          </Row>
          <Row icon={<User size={15} />} label={t("担当トレーナー", "Coach")}>{lesson.trainerMemberName ?? t("未設定", "Not set")}</Row>
          {(lesson.course || passUsage) && (
            <Row icon={<Ticket size={15} />} label={t("コース", "Course")}>
              {lesson.course ? courseLabel(lesson.course, lang) : t("回数券", "Session pass")}
              {passUsage && (
                <span className="ml-1.5 font-semibold text-blue-600">
                  {t(`${passUsage.ordinal}回目 / 全${passUsage.totalCount}回`, `#${passUsage.ordinal} of ${passUsage.totalCount}`)}
                </span>
              )}
            </Row>
          )}
          {lesson.location && <Row icon={<MapPin size={15} />} label={t("場所", "Location")}>{lesson.location}</Row>}
          {lesson.note && <Row icon={<StickyNote size={15} />} label={t("備考", "Notes")}><span className="whitespace-pre-wrap">{lesson.note}</span></Row>}
        </div>

        <Handover
          lang={lang}
          trial={firstTrial && {
            id: firstTrial.id, note: firstTrial.note, handoverNote: firstTrial.handoverNote,
            trainerName: firstTrial.trainerMemberName, scheduledAt: firstTrial.scheduledAt,
          }}
          history={history.map((l) => ({
            id: l.id, scheduledAt: l.scheduledAt, trainerName: l.trainerMemberName, note: l.note,
          }))}
        />

        {/* 引き継ぎを読んだあと、自分の記録を書きに行けるようにする。
            管理者だけにすると、トレーナーが読むだけで書けない片道になる。
            お客さま名で絞り込んだ状態で開く。 */}
        <Link
          href={`/lessons/regular?q=${encodeURIComponent(lesson.customerName)}`}
          className="mt-4 flex items-center justify-center gap-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl py-2.5 transition"
        >
          <Pencil size={14} /> {isAdmin ? t("通常レッスン管理で編集", "Edit in sessions") : t("今日やったことを記録する", "Write today's session notes")}
        </Link>
      </div>
    );
  }

  // ─── 体験レッスン ───────────────────────────────────
  const [trial, me] = await Promise.all([getTrialLesson(id), getCurrentMember()]);
  if (!trial) notFound();
  // 引き継ぎを書けるのは 管理者・担当トレーナー・担当営業・予約を入れた人（saveTrialHandoverNoteAction と同じ）
  const canWriteHandover = !!me && (me.isAdmin
    || [trial.trainerMemberId, trial.salesMemberId, trial.createdById].some((x) => !!x && x === me.id));

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <Link href="/schedule" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition mb-4">
        <ChevronLeft size={15} /> {t("スケジュール", "Schedule")}
      </Link>

      <div className="flex items-center gap-2 mb-1">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
          <FlaskConical size={11} /> {t("体験レッスン", "Trial session")}
        </span>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
          trial.status === "scheduled" ? "bg-blue-50 text-blue-600" :
          trial.status === "completed" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
        }`}>
          {en ? TRIAL_STATUS_EN[trial.status] : TRIAL_STATUS_LABEL[trial.status]}
        </span>
        {trial.contracted !== null && (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            trial.contracted ? "bg-green-100 text-green-700" : "bg-red-50 text-red-600"
          }`}>
            {en ? CONTRACT_EN[String(trial.contracted)] : CONTRACT_LABEL[String(trial.contracted)]}
          </span>
        )}
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">{trial.customerName}</h1>

      <div className="bg-white rounded-2xl border border-gray-200 px-4">
        <Row icon={<Calendar size={15} />} label={t("日付", "Date")}>{fmtDate(trial.scheduledAt, lang)}</Row>
        <Row icon={<Clock size={15} />} label={t("時刻", "Time")}>{fmtTime(trial.scheduledAt, lang)}</Row>
        <Row icon={<User size={15} />} label={t("営業担当", "Sales rep")}>{trial.salesMemberName}</Row>
        <Row icon={<User size={15} />} label={t("トレーナー", "Coach")}>{trial.trainerMemberName ?? t("未設定", "Not set")}</Row>
        {trial.location && <Row icon={<MapPin size={15} />} label={t("場所", "Location")}>{trial.location}</Row>}
        {trial.note && <Row icon={<StickyNote size={15} />} label={t("備考", "Notes")}><span className="whitespace-pre-wrap">{trial.note}</span></Row>}
        {trial.handoverNote && (
          <Row icon={<ClipboardList size={15} />} label={t("次の人への引き継ぎ", "Handover for the next coach")}><span className="whitespace-pre-wrap">{trial.handoverNote}</span></Row>
        )}
      </div>

      {canWriteHandover && <LessonNoteEditor lessonId={trial.id} note={trial.handoverNote} trial />}

      {isAdmin && (
        <Link href="/lessons/trial"
          className="mt-4 flex items-center justify-center gap-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl py-2.5 transition">
          <Pencil size={14} /> {t("体験レッスン管理で編集", "Edit in trial sessions")}
        </Link>
      )}
    </div>
  );
}

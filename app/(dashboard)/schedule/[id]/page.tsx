import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft, Calendar, Clock, MapPin, User, Dumbbell, FlaskConical,
  CheckCircle, XCircle, StickyNote, Ticket, ClipboardList, Pencil,
} from "lucide-react";
import { getLesson } from "@/lib/lessons";
import { getTrialLesson } from "@/lib/trial-lessons";
import { getCurrentIsAdmin } from "@/lib/members";
import { LESSON_STATUS_LABEL } from "@/lib/lessons-types";
import { STATUS_LABEL as TRIAL_STATUS_LABEL, CONTRACT_LABEL } from "@/lib/trial-lessons-types";

export const dynamic = "force-dynamic";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ja-JP", {
    year: "numeric", month: "long", day: "numeric", weekday: "short",
  });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
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
  const [lesson, isAdmin] = await Promise.all([getLesson(id), getCurrentIsAdmin()]);

  // ─── 通常レッスン ───────────────────────────────────
  if (lesson) {
    return (
      <div className="p-4 md:p-6 max-w-lg mx-auto">
        <Link href="/schedule" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition mb-4">
          <ChevronLeft size={15} /> スケジュール
        </Link>

        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
            <Dumbbell size={11} /> 通常レッスン
          </span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
            lesson.status === "scheduled" ? "bg-blue-50 text-blue-600" :
            lesson.status === "completed" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
          }`}>
            {lesson.status === "completed" ? <CheckCircle size={10} /> : lesson.status === "cancelled" ? <XCircle size={10} /> : <Clock size={10} />}
            {LESSON_STATUS_LABEL[lesson.status]}
          </span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-4">{lesson.customerName}</h1>

        <div className="bg-white rounded-2xl border border-gray-200 px-4">
          <Row icon={<Calendar size={15} />} label="日付">{fmtDate(lesson.scheduledAt)}</Row>
          <Row icon={<Clock size={15} />} label="時刻">{fmtTime(lesson.scheduledAt)}</Row>
          <Row icon={<User size={15} />} label="担当トレーナー">{lesson.trainerMemberName ?? "未設定"}</Row>
          {lesson.course && <Row icon={<Ticket size={15} />} label="コース">{lesson.course}</Row>}
          {lesson.location && <Row icon={<MapPin size={15} />} label="場所">{lesson.location}</Row>}
          {lesson.note && <Row icon={<StickyNote size={15} />} label="備考"><span className="whitespace-pre-wrap">{lesson.note}</span></Row>}
        </div>

        {isAdmin && (
          <Link href="/lessons/regular"
            className="mt-4 flex items-center justify-center gap-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl py-2.5 transition">
            <Pencil size={14} /> 通常レッスン管理で編集
          </Link>
        )}
      </div>
    );
  }

  // ─── 体験レッスン ───────────────────────────────────
  const trial = await getTrialLesson(id);
  if (!trial) notFound();

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <Link href="/schedule" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition mb-4">
        <ChevronLeft size={15} /> スケジュール
      </Link>

      <div className="flex items-center gap-2 mb-1">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
          <FlaskConical size={11} /> 体験レッスン
        </span>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
          trial.status === "scheduled" ? "bg-blue-50 text-blue-600" :
          trial.status === "completed" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
        }`}>
          {TRIAL_STATUS_LABEL[trial.status]}
        </span>
        {trial.contracted !== null && (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            trial.contracted ? "bg-green-100 text-green-700" : "bg-red-50 text-red-600"
          }`}>
            {CONTRACT_LABEL[String(trial.contracted)]}
          </span>
        )}
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">{trial.customerName}</h1>

      <div className="bg-white rounded-2xl border border-gray-200 px-4">
        <Row icon={<Calendar size={15} />} label="日付">{fmtDate(trial.scheduledAt)}</Row>
        <Row icon={<Clock size={15} />} label="時刻">{fmtTime(trial.scheduledAt)}</Row>
        <Row icon={<User size={15} />} label="営業担当">{trial.salesMemberName}</Row>
        <Row icon={<User size={15} />} label="トレーナー">{trial.trainerMemberName ?? "未設定"}</Row>
        {trial.location && <Row icon={<MapPin size={15} />} label="場所">{trial.location}</Row>}
        {trial.trainingContent && <Row icon={<ClipboardList size={15} />} label="トレーニング内容"><span className="whitespace-pre-wrap">{trial.trainingContent}</span></Row>}
        {trial.customerImpression && <Row icon={<User size={15} />} label="顧客の様子"><span className="whitespace-pre-wrap">{trial.customerImpression}</span></Row>}
        {trial.note && <Row icon={<StickyNote size={15} />} label="備考"><span className="whitespace-pre-wrap">{trial.note}</span></Row>}
      </div>

      {isAdmin && (
        <Link href="/lessons/trial"
          className="mt-4 flex items-center justify-center gap-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl py-2.5 transition">
          <Pencil size={14} /> 体験レッスン管理で編集
        </Link>
      )}
    </div>
  );
}

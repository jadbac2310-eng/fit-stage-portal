import Link from "next/link";
import { ArrowRight, Dumbbell, FlaskConical } from "lucide-react";
import { getLessons } from "@/lib/lessons";
import { getTrialLessons } from "@/lib/trial-lessons";

export const dynamic = "force-dynamic";

export default async function LessonsPage() {
  const [lessons, trialLessons] = await Promise.all([
    getLessons(),
    getTrialLessons(),
  ]);

  const scheduledTrials = trialLessons.filter((l) => l.status === "scheduled").length;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-5 hidden md:block">
        <h1 className="text-xl font-bold text-gray-900">レッスン</h1>
        <p className="text-sm text-gray-500 mt-0.5">通常レッスン・体験レッスンの管理</p>
      </div>

      <div className="space-y-2">

        <Link
          href="/lessons/regular"
          className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition group"
        >
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Dumbbell size={20} className="text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm">通常レッスン</p>
            <p className="text-xs text-gray-500 mt-0.5">顧客ごとのレッスン管理</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-gray-400">{lessons.length}件</span>
            <ArrowRight size={16} className="text-gray-400 group-hover:text-blue-500 transition" />
          </div>
        </Link>

        <Link
          href="/lessons/trial"
          className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition group"
        >
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <FlaskConical size={20} className="text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm">体験レッスン</p>
            <p className="text-xs text-gray-500 mt-0.5">体験・営業・契約結果の管理</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {scheduledTrials > 0 && (
              <span className="text-xs bg-purple-100 text-purple-700 font-medium px-2 py-0.5 rounded-full">
                予定 {scheduledTrials}件
              </span>
            )}
            <ArrowRight size={16} className="text-gray-400 group-hover:text-purple-500 transition" />
          </div>
        </Link>


      </div>
    </div>
  );
}

"use client";

import { useState, useMemo, useId } from "react";
import {
  Plus, Pencil, Trash2, X, Search, MapPin, Calendar,
  User, StickyNote, ChevronDown, ChevronUp, AlertTriangle,
  CheckCircle, Clock, XCircle, Ticket, Building2,
} from "lucide-react";
import { Lesson, LessonStatus, LESSON_STATUS_LABEL, COURSE_OPTIONS, courseToPaymentType } from "@/lib/lessons-types";
import { SessionPass } from "@/lib/session-passes-types";
import { CustomerPlanRecord } from "@/lib/customer-plans-types";
import { Customer } from "@/lib/customers-types";
import { Member } from "@/lib/members";
import { RentalGym } from "@/lib/rental-gyms";
import { Store } from "@/lib/stores";
import { createLessonAction, createLessonsAction, updateLessonAction, deleteLessonAction } from "./actions";
import { cn } from "@/lib/cn";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Spinner } from "@/components/ui/spinner";
import { AuthorStamp } from "@/components/ui/author-stamp";

// ─── バッジ ───────────────────────────────────────────
function CourseBadge({ course }: { course?: string }) {
  if (!course) return null;
  const isSessionPass = course.startsWith("回数券");
  const isMonthly = course.startsWith("月");
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
      isSessionPass ? "bg-amber-100 text-amber-700" :
      isMonthly     ? "bg-blue-100 text-blue-700"   :
                      "bg-gray-100 text-gray-600"
    )}>
      {course}
    </span>
  );
}

function StatusBadge({ status }: { status: LessonStatus }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
      status === "scheduled" ? "bg-blue-100 text-blue-700"   :
      status === "completed" ? "bg-green-100 text-green-700" :
                               "bg-gray-100 text-gray-500"
    )}>
      {status === "scheduled" && <Clock size={9} />}
      {status === "completed" && <CheckCircle size={9} />}
      {status === "cancelled" && <XCircle size={9} />}
      {LESSON_STATUS_LABEL[status]}
    </span>
  );
}

function passLabel(pass: SessionPass) {
  return `${pass.totalCount}回券（残り${pass.remainingCount}回）${pass.expiredAt ? "　期限: " + pass.expiredAt : ""}`;
}

// ─── プラン照合ロジック ───────────────────────────────
function computeSuggestion(
  customerId: string,
  scheduledAt: string,
  allLessons: Lesson[],
  customerPlans: CustomerPlanRecord[],
  excludeLessonId?: string,
): { course: string; withinPlan: boolean; message: string } | null {
  const date = scheduledAt.slice(0, 10);
  if (!date || date.length < 10) return null;
  const month = date.slice(0, 7);

  const activePlan = customerPlans.find(
    (p) => p.customerId === customerId && p.startedAt <= date && (!p.endedAt || p.endedAt >= date)
  );

  const monthCount = allLessons.filter(
    (l) => l.customerId === customerId &&
            l.scheduledAt.slice(0, 7) === month &&
            l.status !== "cancelled" &&
            l.id !== excludeLessonId
  ).length;

  if (!activePlan) {
    return { course: "", withinPlan: false, message: "この日付に適用中のプランがありません" };
  }

  const planSessions = parseInt(activePlan.plan.replace("月", "").replace("回", ""), 10);
  if (monthCount < planSessions) {
    return {
      course: activePlan.plan,
      withinPlan: true,
      message: `プラン内（${activePlan.plan}：今月 ${monthCount + 1} / ${planSessions} 回目）`,
    };
  }
  return {
    course: "",
    withinPlan: false,
    message: `${activePlan.plan} の上限（${planSessions}回/月）を超えています。都度 または 回数券 を選択してください。`,
  };
}

// datetime-local の値（ローカル時刻）を UTC ISO 文字列に変換
function localInputToISO(value: string): string {
  return new Date(value).toISOString();
}

// UTC ISO 文字列を datetime-local input 用のローカル時刻文字列に変換
function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
// datetime-local 文字列を1時間後にする（基本60分のため終了の初期値に使う）
function localPlusHour(local: string): string {
  if (!local) return "";
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return "";
  d.setHours(d.getHours() + 1);
  return fmtLocal(d);
}
function addMinutesLocal(local: string, n: number): string {
  const d = new Date(local); d.setMinutes(d.getMinutes() + n); return fmtLocal(d);
}
function addDaysLocal(local: string, n: number): string {
  const d = new Date(local); d.setDate(d.getDate() + n); return fmtLocal(d);
}
function addMonthsLocal(local: string, n: number): string {
  const d = new Date(local); d.setMonth(d.getMonth() + n); return fmtLocal(d);
}

// ─── レッスンフォーム ─────────────────────────────────
export function LessonForm({
  defaultValues, customers, members, sessionPasses, customerPlans, allLessons,
  rentalGyms = [], stores = [], fixedCustomerId, onClose, action, multiAction, submitLabel,
}: {
  defaultValues?: Partial<Lesson>;
  customers: Customer[];
  members: Member[];
  sessionPasses: SessionPass[];
  customerPlans: CustomerPlanRecord[];
  allLessons: Lesson[];
  rentalGyms?: RentalGym[];
  stores?: Store[];
  fixedCustomerId?: string;
  onClose: () => void;
  action: (fd: FormData) => Promise<void>;
  multiAction?: (fd: FormData) => Promise<void>; // 作成時の複数日時・繰り返し用
  submitLabel: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState(fixedCustomerId ?? defaultValues?.customerId ?? "");
  const [selectedCourse, setSelectedCourse] = useState(defaultValues?.course ?? "");
  // 開始・終了で管理（基本60分。開始を入れたら終了は1時間後が初期値）
  const startLocalInit = defaultValues?.scheduledAt ? isoToLocalInput(defaultValues.scheduledAt) : "";
  const [startLocal, setStartLocal] = useState(startLocalInit);
  const [endLocal, setEndLocal] = useState(
    defaultValues?.endAt ? isoToLocalInput(defaultValues.endAt) : localPlusHour(startLocalInit)
  );
  const scheduledDate = startLocal ? startLocal.slice(0, 10) : "";
  function onStartChange(v: string) {
    setStartLocal(v);
    setEndLocal(localPlusHour(v));
    const d = v.slice(0, 10);
    revalidateCourse(selectedCustomerId, d || today);
    applySuggestion(selectedCustomerId, d);
  }

  // 作成時のみ：複数日時／繰り返し（個人予定と同様・排他）
  const isCreate = !defaultValues?.id && !!multiAction;
  const [multiMode, setMultiMode] = useState<"single" | "multiple" | "recurring">("single");
  const [extraStarts, setExtraStarts] = useState<string[]>([]); // datetime-local の開始
  const [recurrence, setRecurrence] = useState<"daily" | "weekly" | "biweekly" | "monthly">("weekly");
  const [recurUntil, setRecurUntil] = useState("");

  function buildLessonSlots(): { scheduledAt: string; endAt: string | null }[] {
    const base = { scheduledAt: localInputToISO(startLocal), endAt: endLocal ? localInputToISO(endLocal) : null };
    const slots = [base];
    if (multiMode === "multiple") {
      for (const ex of extraStarts) {
        if (ex) slots.push({ scheduledAt: localInputToISO(ex), endAt: localInputToISO(localPlusHour(ex)) });
      }
    } else if (multiMode === "recurring" && recurUntil && startLocal) {
      const durationMin = endLocal ? Math.max(15, Math.round((Date.parse(endLocal) - Date.parse(startLocal)) / 60000)) : 60;
      let cur = startLocal;
      for (let i = 0; i < 300; i++) {
        cur = recurrence === "daily" ? addDaysLocal(cur, 1)
          : recurrence === "weekly" ? addDaysLocal(cur, 7)
          : recurrence === "biweekly" ? addDaysLocal(cur, 14)
          : addMonthsLocal(cur, 1);
        if (cur.slice(0, 10) > recurUntil) break;
        slots.push({ scheduledAt: localInputToISO(cur), endAt: localInputToISO(addMinutesLocal(cur, durationMin)) });
      }
    }
    return slots;
  }
  // レンタルジム（選択で場所を自動入力。代金はマスタ値がデフォルト・変更可）
  const [location, setLocation] = useState(defaultValues?.location ?? "");
  const [rentalGymId, setRentalGymId] = useState(defaultValues?.rentalGymId ?? "");
  const [rentalGymFee, setRentalGymFee] = useState(
    defaultValues?.rentalGymFee != null ? String(defaultValues.rentalGymFee) : ""
  );
  // 店舗（レンタルジムとは別概念。利用料は一律2000円が既定）。場所はレンタルジムと排他
  const [storeId, setStoreId] = useState(defaultValues?.storeId ?? "");
  const [storeFee, setStoreFee] = useState(
    defaultValues?.storeFee != null ? String(defaultValues.storeFee) : ""
  );

  function onRentalGymChange(id: string) {
    setRentalGymId(id);
    const gym = rentalGyms.find((g) => g.id === id);
    if (gym) {
      setStoreId(""); setStoreFee("");            // 店舗とは排他
      setRentalGymFee(String(gym.fee));
      setLocation(gym.name); // 場所を自動入力（編集可）
    } else {
      setRentalGymFee("");
    }
  }

  function onStoreChange(id: string) {
    setStoreId(id);
    const store = stores.find((s) => s.id === id);
    if (store) {
      setRentalGymId(""); setRentalGymFee("");    // レンタルジムとは排他
      setStoreFee(String(store.fee));
      setLocation(store.name); // 場所を自動入力（編集可）
    } else {
      setStoreFee("");
    }
  }

  // 場所の入力候補: 選択中の顧客が過去に使った場所のみ。手入力も可。
  const locationListId = useId();
  const locationHistory = useMemo(() => {
    if (!selectedCustomerId) return [];
    const set = new Set<string>();
    for (const l of allLessons) {
      if (l.customerId === selectedCustomerId && l.location) set.add(l.location);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ja"));
  }, [allLessons, selectedCustomerId]);

  const suggestion = useMemo(
    () => selectedCustomerId && scheduledDate
      ? computeSuggestion(selectedCustomerId, scheduledDate, allLessons, customerPlans, defaultValues?.id)
      : null,
    [selectedCustomerId, scheduledDate, allLessons, customerPlans, defaultValues?.id]
  );

  function applySuggestion(customerId: string, date: string) {
    if (!defaultValues?.id) {
      const sug = computeSuggestion(customerId, date, allLessons, customerPlans);
      if (sug?.course) setSelectedCourse(sug.course);
    }
  }

  async function handleSubmit(fd: FormData) {
    setError("");
    if (!startLocal) { setError("開始日時を入力してください"); return; }
    setLoading(true);
    try {
      if (isCreate) {
        // 作成は複数日時・繰り返しに対応（単発でも1件の配列）
        fd.set("slots", JSON.stringify(buildLessonSlots()));
        await multiAction!(fd);
      } else {
        // datetime-local はローカル時刻なので UTC ISO に変換して送信
        fd.set("scheduledAt", localInputToISO(startLocal));
        fd.set("endAt", endLocal ? localInputToISO(endLocal) : "");
        await action(fd);
      }
      onClose();
    } catch (e) { setError(e instanceof Error ? e.message : "エラー"); setLoading(false); }
  }

  const inputClass = "w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelClass = "text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5";
  const locationLocked = !!rentalGymId || !!storeId; // レンタルジム/店舗のときは場所を自動設定

  const isSessionPassCourse = selectedCourse.startsWith("回数券");
  const availablePasses = sessionPasses.filter(
    (p) => p.customerId === selectedCustomerId && (p.remainingCount > 0 || p.id === defaultValues?.sessionPassId)
  );
  const noPassAvailable = isSessionPassCourse && selectedCustomerId !== "" && availablePasses.length === 0;

  // ─── 選択可能なコースの算出 ───────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const refDate = scheduledDate || today;

  function courseAllowed(value: string, paymentType: string, customerId: string, date: string): boolean {
    if (value === defaultValues?.course) return true;          // 編集時は元のコースを常に許可
    if (paymentType === "single") return true;                 // 都度は常に選べる
    if (!customerId) return false;                             // 顧客未選択なら都度のみ
    if (paymentType === "session_pass") {
      // 残りのある回数券を1枚でも持っていれば選べる
      return sessionPasses.some((p) =>
        p.customerId === customerId &&
        (p.remainingCount > 0 || p.id === defaultValues?.sessionPassId));
    }
    if (paymentType === "monthly") {
      return customerPlans.some((p) =>
        p.customerId === customerId && p.plan === value &&
        p.startedAt <= date && (!p.endedAt || p.endedAt >= date));
    }
    return false;
  }

  const passCourses    = COURSE_OPTIONS.filter((o) => o.paymentType === "session_pass" && courseAllowed(o.value, o.paymentType, selectedCustomerId, refDate));
  const monthlyCourses = COURSE_OPTIONS.filter((o) => o.paymentType === "monthly"      && courseAllowed(o.value, o.paymentType, selectedCustomerId, refDate));
  const singleCourses  = COURSE_OPTIONS.filter((o) => o.paymentType === "single");

  // 顧客・日付の変更で現在の選択が無効になったらクリア（イベント駆動）
  function revalidateCourse(customerId: string, date: string) {
    if (!selectedCourse) return;
    const opt = COURSE_OPTIONS.find((o) => o.value === selectedCourse);
    if (opt && !courseAllowed(opt.value, opt.paymentType, customerId, date)) setSelectedCourse("");
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {fixedCustomerId ? (
        <input type="hidden" name="customerId" value={fixedCustomerId} />
      ) : (
        <div>
          <label className={labelClass}><User size={12} /> 顧客 <span className="text-red-500">*</span></label>
          <select name="customerId" required defaultValue={defaultValues?.customerId ?? ""}
            onChange={(e) => { setSelectedCustomerId(e.target.value); revalidateCourse(e.target.value, refDate); applySuggestion(e.target.value, scheduledDate); }}
            className={inputClass}>
            <option value="">顧客を選択...</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
          </select>
        </div>
      )}

      <div>
        <label className={labelClass}><User size={12} /> 担当トレーナー</label>
        <select name="trainerMemberId" defaultValue={defaultValues?.trainerMemberId ?? ""} className={inputClass}>
          <option value="">未設定</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}{m.role ? `（${m.role}）` : ""}</option>)}
        </select>
      </div>

      <div>
        <label className={labelClass}><Calendar size={12} /> 開始 <span className="text-red-500">*</span></label>
        <input type="datetime-local" required value={startLocal} onChange={(e) => onStartChange(e.target.value)}
          className={inputClass} />
      </div>

      <div>
        <label className={labelClass}><Calendar size={12} /> 終了</label>
        <input type="datetime-local" value={endLocal} onChange={(e) => setEndLocal(e.target.value)}
          className={inputClass} />
        <p className="text-xs text-gray-400 mt-1">基本60分。開始を入れると終了は1時間後が初期値になります（変更可）。</p>
      </div>

      {/* 登録方法（作成時のみ・単発／複数日時／繰り返しは排他） */}
      {isCreate && (
        <div className="space-y-3">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {([["single", "単発"], ["multiple", "複数日時"], ["recurring", "繰り返し"]] as const).map(([key, label]) => (
              <button key={key} type="button" onClick={() => setMultiMode(key)}
                className={cn(
                  "flex-1 py-1.5 rounded-lg text-xs font-semibold transition",
                  multiMode === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}>
                {label}
              </button>
            ))}
          </div>

          {multiMode === "multiple" && (
            <div className="rounded-xl border border-gray-200 p-3 bg-gray-50/60">
              <p className="text-[11px] text-gray-400 mb-2">同じ内容のレッスンを別の日時にも登録します（各60分）。</p>
              {extraStarts.map((s, i) => (
                <div key={i} className="flex gap-2 mb-2 items-center">
                  <input type="datetime-local" value={s}
                    onChange={(e) => setExtraStarts((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))}
                    className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button type="button" onClick={() => setExtraStarts((prev) => prev.filter((_, j) => j !== i))}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg flex-shrink-0"><X size={15} /></button>
                </div>
              ))}
              <button type="button" onClick={() => setExtraStarts((prev) => [...prev, startLocal])}
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg px-2.5 py-1.5 transition">
                <Plus size={14} /> 日時を追加
              </button>
            </div>
          )}

          {multiMode === "recurring" && (
            <div className="rounded-xl border border-gray-200 p-3 bg-gray-50/60">
              <div className="flex gap-2">
                <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as typeof recurrence)}
                  className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="daily">毎日</option>
                  <option value="weekly">毎週</option>
                  <option value="biweekly">隔週</option>
                  <option value="monthly">毎月</option>
                </select>
                <input type="date" value={recurUntil} min={startLocal.slice(0, 10)} onChange={(e) => setRecurUntil(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                {recurUntil ? "開始日から終了日まで、同じ時間・長さで繰り返し作成します。" : "繰り返しの終了日を選んでください。"}
                {selectedCourse.startsWith("回数券") ? " ※回数券は作成数だけ消費されます。" : ""}
              </p>
            </div>
          )}
        </div>
      )}

      {/* プラン照合バナー */}
      {suggestion && (
        <div className={cn(
          "rounded-xl px-3 py-2 text-xs font-medium flex items-center gap-2",
          suggestion.withinPlan
            ? "bg-green-50 border border-green-200 text-green-700"
            : suggestion.message.includes("適用中のプランがありません")
              ? "bg-gray-50 border border-gray-200 text-gray-500"
              : "bg-orange-50 border border-orange-200 text-orange-700"
        )}>
          {suggestion.withinPlan ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
          {suggestion.message}
        </div>
      )}

      <div>
        <label className={labelClass}><MapPin size={12} /> 場所</label>
        <input
          name="location"
          list={locationLocked ? undefined : locationListId}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          readOnly={locationLocked}
          placeholder="場所を入力（または下から選択）"
          className={cn(inputClass, locationLocked && "bg-gray-100 text-gray-500 cursor-not-allowed")}
        />
        {locationLocked ? (
          <p className="text-[11px] text-gray-400 mt-1">{rentalGymId ? "レンタルジム" : "店舗"}に合わせて自動設定されます</p>
        ) : (
          <datalist id={locationListId}>
            {locationHistory.map((loc) => <option key={loc} value={loc} />)}
          </datalist>
        )}
        {!locationLocked && locationHistory.length > 0 && (
          <div className="mt-2">
            <p className="text-[11px] text-gray-400 mb-1">よく使う場所（タップで入力）</p>
            <div className="flex flex-wrap gap-1.5">
              {locationHistory.slice(0, 12).map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocation(loc)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs border transition",
                    location === loc
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300"
                  )}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* レンタルジム */}
      <div>
        <label className={labelClass}><MapPin size={12} /> レンタルジム</label>
        <select name="rentalGymId" value={rentalGymId} onChange={(e) => onRentalGymChange(e.target.value)} className={inputClass}>
          <option value="">なし（自社・その他）</option>
          {rentalGyms.map((g) => (
            <option key={g.id} value={g.id}>{g.name}（¥{g.fee.toLocaleString("ja-JP")}）</option>
          ))}
        </select>
        {rentalGymId && (
          <div className="mt-2">
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">レンタルジム代（税込）</label>
            <input
              name="rentalGymFee"
              type="number"
              min="0"
              step="1"
              value={rentalGymFee}
              onChange={(e) => setRentalGymFee(e.target.value)}
              className={inputClass}
            />
            <p className="text-xs text-gray-400 mt-1">マスタの料金が初期値です。利益の計算でこの額を差し引きます（歩合は差し引きません）。</p>
          </div>
        )}
      </div>

      {/* 店舗（レンタルジムとは別概念・一律2000円） */}
      <div>
        <label className={labelClass}><Building2 size={12} /> 店舗</label>
        <select name="storeId" value={storeId} onChange={(e) => onStoreChange(e.target.value)} className={inputClass}>
          <option value="">なし</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>{s.name}（¥{s.fee.toLocaleString("ja-JP")}）</option>
          ))}
        </select>
        {storeId && (
          <div className="mt-2">
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">店舗利用料（税込）</label>
            <input
              name="storeFee"
              type="number"
              min="0"
              step="1"
              value={storeFee}
              onChange={(e) => setStoreFee(e.target.value)}
              className={inputClass}
            />
            <p className="text-xs text-gray-400 mt-1">既定は一律2000円です。利益の計算でこの額を差し引きます（歩合は差し引きません）。</p>
          </div>
        )}
      </div>

      <div>
        <label className={labelClass}>コース</label>
        <select name="course" value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} className={inputClass}>
          <option value="">未選択</option>
          {passCourses.length > 0 && (
            <optgroup label="回数券">
              {passCourses.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </optgroup>
          )}
          {monthlyCourses.length > 0 && (
            <optgroup label="月会費">
              {monthlyCourses.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </optgroup>
          )}
          <optgroup label="単発">
            {singleCourses.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </optgroup>
        </select>
        {selectedCustomerId !== "" && passCourses.length === 0 && monthlyCourses.length === 0 && (
          <p className="text-xs text-gray-400 mt-1.5">
            この顧客は有効な回数券・加入中プランがありません（都度のみ選択できます）
          </p>
        )}
      </div>

      {/* 単発（都度・オンライン）の金額。店舗とオンラインで単価が違う場合に入力 */}
      {courseToPaymentType(selectedCourse) === "single" && (
        <div>
          <label className={labelClass}>金額（単価）</label>
          <input
            name="amount"
            type="number"
            min="0"
            inputMode="numeric"
            defaultValue={defaultValues?.amount ?? customers.find((c) => c.id === selectedCustomerId)?.singleSessionPrice ?? ""}
            placeholder="例: 8000"
            className={inputClass}
          />
          <p className="text-xs text-gray-400 mt-1">この回の金額。空欄なら顧客の都度単価を使用します。</p>
        </div>
      )}

      {/* 回数券選択（回数券コースの場合のみ） */}
      {isSessionPassCourse && (
        <div className={cn("rounded-xl p-3 border", noPassAvailable ? "bg-red-50 border-red-300" : "bg-amber-50 border-amber-200")}>
          <label className={cn(labelClass, noPassAvailable ? "text-red-600" : "text-amber-700")}>
            <Ticket size={12} /> 使用する回数券 <span className="text-red-500">*</span>
          </label>
          {noPassAvailable ? (
            <p className="text-xs text-red-600 font-medium">
              有効な回数券がありません。プラン管理から追加してください。
            </p>
          ) : (
            <select name="sessionPassId" required defaultValue={defaultValues?.sessionPassId ?? ""} className={inputClass}>
              <option value="">回数券を選択...</option>
              {availablePasses.map((p) => (
                <option key={p.id} value={p.id}>{passLabel(p)}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {defaultValues?.id && (
        <div>
          <label className={labelClass}>ステータス</label>
          <select name="status" defaultValue={defaultValues?.status ?? "scheduled"} className={inputClass}>
            <option value="scheduled">予定</option>
            <option value="completed">完了</option>
            <option value="cancelled">キャンセル</option>
          </select>
        </div>
      )}

      <div>
        <label className={labelClass}><StickyNote size={12} /> 備考</label>
        <textarea name="note" defaultValue={defaultValues?.note} rows={2}
          placeholder="連絡事項など" className={cn(inputClass, "resize-none")} />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
          キャンセル
        </button>
        <button type="submit" disabled={loading || noPassAvailable}
          className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold transition flex items-center justify-center gap-2">
          {loading && <Spinner size={14} />}{loading ? "保存中..." : submitLabel}
        </button>
      </div>
    </form>
  );
}


// ─── 回数券セクション（閲覧のみ） ────────────────────
function SessionPassSection({ passes }: { passes: SessionPass[] }) {
  return (
    <div className="py-3 border-t border-gray-100">
      <p className="text-xs font-bold text-gray-500 flex items-center gap-1.5 mb-2">
        <Ticket size={11} /> 回数券
      </p>
      {passes.length === 0 ? (
        <p className="text-xs text-gray-400">回数券なし（顧客マスタから追加できます）</p>
      ) : (
        <div className="space-y-1.5">
          {passes.map((pass) => (
            <div key={pass.id} className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl text-xs border",
              pass.remainingCount === 0
                ? "bg-gray-50 border-gray-200 text-gray-400"
                : pass.remainingCount <= 2
                  ? "bg-red-50 border-red-200"
                  : "bg-amber-50 border-amber-200"
            )}>
              <Ticket size={12} className={pass.remainingCount === 0 ? "text-gray-300" : "text-amber-500"} />
              <div className="flex-1">
                <span className="font-semibold">{pass.totalCount}回券</span>
                <span className="ml-2 text-gray-500">{pass.totalCount - pass.remainingCount}/{pass.totalCount}回 消化</span>
                <span className={cn(
                  "ml-2 font-bold",
                  pass.remainingCount === 0 ? "text-gray-400" :
                  pass.remainingCount <= 2  ? "text-red-600"  : "text-amber-700"
                )}>
                  残り{pass.remainingCount}回
                </span>
                {pass.remainingCount === 0 && <span className="ml-1 text-gray-400">（使い切り）</span>}
              </div>
              <div className="text-gray-400 text-right">
                <p>{pass.purchasedAt}</p>
                {pass.expiredAt && <p>～{pass.expiredAt}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── レッスン1件 ──────────────────────────────────────
function LessonItem({ lesson, customers, members, sessionPasses, customerPlans, allLessons, rentalGyms, stores, isAdmin, currentMemberId }: {
  lesson: Lesson; customers: Customer[]; members: Member[]; sessionPasses: SessionPass[];
  customerPlans: CustomerPlanRecord[]; allLessons: Lesson[]; rentalGyms: RentalGym[]; stores: Store[]; isAdmin: boolean; currentMemberId?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const boundUpdate = updateLessonAction.bind(null, lesson.id);
  // 編集/削除は管理者 or 追加した本人のみ
  const canEdit = isAdmin || (!!lesson.createdById && lesson.createdById === currentMemberId);

  const scheduledDate = new Date(lesson.scheduledAt);
  const dateStr = scheduledDate.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", weekday: "short", timeZone: "Asia/Tokyo" });
  const timeStr = scheduledDate.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" });

  const linkedPass = lesson.sessionPassId ? sessionPasses.find((p) => p.id === lesson.sessionPassId) : undefined;
  // この回数券レッスンが何回目か（同じ回数券に紐づく非キャンセルのレッスンを日付順に並べた順位）
  const sessionNumber = linkedPass
    ? allLessons
        .filter((l) => l.sessionPassId === linkedPass.id && l.status !== "cancelled")
        .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
        .findIndex((l) => l.id === lesson.id) + 1
    : 0;

  if (editing) return (
    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 my-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-gray-700">レッスンを編集</p>
        <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
      </div>
      <LessonForm defaultValues={lesson} customers={customers} members={members} sessionPasses={sessionPasses}
        customerPlans={customerPlans} allLessons={allLessons} rentalGyms={rentalGyms} stores={stores}
        fixedCustomerId={lesson.customerId} onClose={() => setEditing(false)}
        action={boundUpdate} submitLabel="保存する" />
    </div>
  );

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="w-16 flex-shrink-0 text-center">
        <p className="text-xs font-semibold text-gray-900">{dateStr}</p>
        <p className="text-xs text-gray-400">{timeStr}</p>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          <StatusBadge status={lesson.status} />
          <CourseBadge course={lesson.course} />
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          <p className={cn("text-xs flex items-center gap-1",
            lesson.trainerMemberId ? "text-gray-600" : "text-amber-600 font-medium")}>
            <User size={10} className="flex-shrink-0" />
            {lesson.trainerMemberName ?? "担当未設定"}
          </p>
          {lesson.location && (
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <MapPin size={10} className="flex-shrink-0" />{lesson.location}
            </p>
          )}
        </div>
        {linkedPass && (
          <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
            <Ticket size={10} /> {linkedPass.totalCount}回券
            {sessionNumber > 0 && <span className="font-semibold">・{sessionNumber}回目/全{linkedPass.totalCount}回</span>}
            （残り{linkedPass.remainingCount}回）
          </p>
        )}
        {lesson.note && <p className="text-xs text-gray-400 mt-0.5 truncate">{lesson.note}</p>}
        {lesson.createdByName && (
          <p className="text-[11px] text-gray-400 mt-0.5">追加: {lesson.createdByName}</p>
        )}
        <AuthorStamp
          createdByName={lesson.createdByName}
          createdAt={lesson.createdAt}
          updatedByName={members.find((m) => m.id === lesson.updatedById)?.name}
          updatedAt={lesson.updatedAt}
          className="mt-1.5"
        />
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {canEdit && (
          <>
          <button onClick={() => setEditing(true)}
            className="p-1.5 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
            <Pencil size={12} />
          </button>
          <button onClick={async () => {
            if (!confirm("このレッスンを削除しますか？")) return;
            setDeleting(true);
            await deleteLessonAction(lesson.id);
          }} disabled={deleting}
            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50">
            {deleting ? <Spinner size={12} /> : <Trash2 size={12} />}
          </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── 顧客グループ ─────────────────────────────────────
function CustomerGroup({ customer, lessons, sessionPasses, customerPlans, allLessons, customers, members, rentalGyms, stores, isAdmin, currentMemberId }: {
  customer: Customer;
  lessons: Lesson[];
  sessionPasses: SessionPass[];
  customerPlans: CustomerPlanRecord[];
  allLessons: Lesson[];
  customers: Customer[];
  members: Member[];
  rentalGyms: RentalGym[];
  stores: Store[];
  isAdmin: boolean;
  currentMemberId?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const hasUnassigned = lessons.some((l) => !l.trainerMemberId);
  const scheduledCount = lessons.filter((l) => l.status === "scheduled").length;
  const customerPasses = sessionPasses.filter((p) => p.customerId === customer.id);
  const lowPassCount = customerPasses.some((p) => p.remainingCount > 0 && p.remainingCount <= 2);
  const exhaustedPass = customerPasses.some((p) => p.remainingCount === 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition text-left">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-gray-900">{customer.fullName}</p>
            {hasUnassigned && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                <AlertTriangle size={10} /> 担当未設定
              </span>
            )}
            {lowPassCount && (
              <span className="inline-flex items-center gap-1 text-xs text-red-500 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full font-medium">
                <Ticket size={10} /> 回数券残りわずか
              </span>
            )}
            {exhaustedPass && !lowPassCount && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full font-medium">
                <Ticket size={10} /> 回数券使い切り
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {lessons.length}件{scheduledCount > 0 && `（予定 ${scheduledCount}件）`}
            {customerPasses.length > 0 && `　回数券: ${customerPasses.reduce((s, p) => s + p.remainingCount, 0)}回残`}
          </p>
        </div>
        <div className="flex-shrink-0 text-gray-400">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4">
          {/* レッスン一覧 */}
          {lessons.map((l) => (
            <LessonItem key={l.id} lesson={l} customers={customers} members={members}
              sessionPasses={sessionPasses} customerPlans={customerPlans} allLessons={allLessons} rentalGyms={rentalGyms} stores={stores}
              isAdmin={isAdmin} currentMemberId={currentMemberId} />
          ))}

          {showAdd ? (
            <div className="py-3">
              <LessonForm customers={customers} members={members} sessionPasses={sessionPasses}
                customerPlans={customerPlans} allLessons={allLessons} rentalGyms={rentalGyms} stores={stores}
                fixedCustomerId={customer.id} onClose={() => setShowAdd(false)}
                action={createLessonAction} multiAction={createLessonsAction} submitLabel="追加する" />
            </div>
          ) : (
            <div className="py-2">
              <button onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium">
                <Plus size={13} /> レッスンを追加
              </button>
            </div>
          )}

          {/* 回数券セクション（閲覧のみ） */}
          <SessionPassSection passes={customerPasses} />
        </div>
      )}
    </div>
  );
}

// ─── メインコンポーネント ─────────────────────────────
export function RegularLessonsClient({ lessons, customers, members, sessionPasses, customerPlans, rentalGyms = [], stores = [], isAdmin, currentMemberId, initialSearch = "" }: {
  lessons: Lesson[]; customers: Customer[]; members: Member[];
  sessionPasses: SessionPass[]; customerPlans: CustomerPlanRecord[]; rentalGyms?: RentalGym[]; stores?: Store[]; isAdmin: boolean; currentMemberId?: string;
  initialSearch?: string;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState(initialSearch);

  const grouped = useMemo(() => {
    const map = new Map<string, { customer: Customer; lessons: Lesson[] }>();
    lessons.forEach((l) => {
      if (!map.has(l.customerId)) {
        const customer = customers.find((c) => c.id === l.customerId);
        if (customer) map.set(l.customerId, { customer, lessons: [] });
      }
      map.get(l.customerId)?.lessons.push(l);
    });
    map.forEach((g) => g.lessons.sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt)));
    return Array.from(map.values());
  }, [lessons, customers]);

  const filtered = grouped.filter(({ customer }) => {
    const q = search.toLowerCase();
    return !q || customer.fullName.toLowerCase().includes(q);
  });

  const totalUnassigned = grouped.reduce(
    (acc, { lessons: ls }) => acc + ls.filter((l) => !l.trainerMemberId).length, 0
  );

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-4 hidden md:flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">通常レッスン</h1>
          <div className="flex items-center gap-3 mt-0.5">
            <p className="text-sm text-gray-500">{lessons.length}件</p>
            {totalUnassigned > 0 && (
              <p className="text-xs text-amber-600 flex items-center gap-1 font-medium">
                <AlertTriangle size={11} /> 担当未設定 {totalUnassigned}件
              </p>
            )}
          </div>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition">
          <Plus size={16} /> レッスンを追加
        </button>
      </div>

      <div className="md:hidden mb-4">
        <h1 className="text-lg font-bold text-gray-900">通常レッスン</h1>
        {totalUnassigned > 0 && (
          <p className="text-xs text-amber-600 flex items-center gap-1 font-medium mt-0.5">
            <AlertTriangle size={11} /> 担当未設定 {totalUnassigned}件
          </p>
        )}
      </div>

      <div className="mb-4 relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="顧客名で検索..."
          className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {showAdd && (
        <div className="hidden md:block bg-white rounded-2xl border-2 border-blue-400 p-5 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-900">レッスンを追加</p>
            <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <LessonForm customers={customers} members={members} sessionPasses={sessionPasses}
            customerPlans={customerPlans} allLessons={lessons} rentalGyms={rentalGyms} stores={stores}
            onClose={() => setShowAdd(false)} action={createLessonAction} multiAction={createLessonsAction} submitLabel="追加する" />
        </div>
      )}

      {grouped.length === 0 && !showAdd ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🏋️</p>
          <p className="text-sm font-semibold text-gray-600">レッスンが登録されていません</p>
          <button onClick={() => setShowAdd(true)}
            className="mt-5 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition">
            <Plus size={15} /> レッスンを追加
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">該当する顧客が見つかりません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(({ customer, lessons: ls }) => (
            <CustomerGroup key={customer.id} customer={customer} lessons={ls}
              sessionPasses={sessionPasses} customerPlans={customerPlans} allLessons={lessons}
              customers={customers} members={members} rentalGyms={rentalGyms} stores={stores} isAdmin={isAdmin} currentMemberId={currentMemberId} />
          ))}
        </div>
      )}

      <button onClick={() => setShowAdd(true)}
        className="md:hidden fixed bottom-6 right-4 w-14 h-14 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-full shadow-lg shadow-blue-200 flex items-center justify-center transition z-30"
        aria-label="レッスンを追加">
        <Plus size={26} />
      </button>

      {showAdd && (
        <BottomSheet title="レッスンを追加" onClose={() => setShowAdd(false)} scrollable>
          <LessonForm customers={customers} members={members} sessionPasses={sessionPasses}
            customerPlans={customerPlans} allLessons={lessons} rentalGyms={rentalGyms} stores={stores}
            onClose={() => setShowAdd(false)} action={createLessonAction} multiAction={createLessonsAction} submitLabel="追加する" />
        </BottomSheet>
      )}
    </div>
  );
}

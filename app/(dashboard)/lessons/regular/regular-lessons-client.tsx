"use client";

import { useState, useMemo, useId } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Plus, Pencil, Trash2, X, Search, MapPin, Calendar,
  User, StickyNote, ChevronDown, ChevronUp, AlertTriangle,
  CheckCircle, Clock, XCircle, Ticket, Building2, FlaskConical,
} from "lucide-react";
import { Lesson, LessonStatus, LESSON_STATUS_LABEL, COURSE_OPTIONS, courseToPaymentType, isFreeLesson, isPassPendingLesson, DELIVERY_MODE_OPTIONS, venueKindOf, venueKindOptions, venueKey, recentVenues, venueKindLabel, matchVenueByText, type DeliveryMode, type VenueKind } from "@/lib/lessons-types";
import { SessionPass, passUsageOrdinals } from "@/lib/session-passes-types";
import { CustomerPlanRecord } from "@/lib/customer-plans-types";
import { Customer, isFctCustomer } from "@/lib/customers-types";
import { Member } from "@/lib/members";
import { RentalGym } from "@/lib/rental-gyms";
import { Store } from "@/lib/stores";
import Link from "next/link";
import type { TrialLesson } from "@/lib/trial-lessons-types";
import { FctStore } from "@/lib/fct-stores";
import type { AvenirStore } from "@/lib/avenir-stores";
import type { CustomerVenueFee } from "@/lib/customer-venue-fees-types";
import { resolveVenueFee } from "@/lib/customer-venue-fees-types";
import { fctLessonPay, FCT_DEFAULT_RATE } from "@/lib/fct-types";
import { createLessonAction, createLessonsAction, updateLessonAction, deleteLessonAction } from "./actions";
import { cn } from "@/lib/cn";
import { useSubmitLock } from "@/lib/use-submit-lock";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Spinner } from "@/components/ui/spinner";
import { AuthorStamp } from "@/components/ui/author-stamp";
import { CustomerPicker } from "@/components/ui/customer-picker";
import { MultiDateCalendar } from "@/components/ui/multi-date-calendar";
import { SessionPassForm } from "../../plans/session-pass-form";
import { assertActionOk, type ActionResult } from "@/lib/action-result";

import { PageTitle, tabsWrap, tabButton } from "@/components/ui/page-title";
import { useLang } from "@/components/i18n/lang-provider";
import { makeT, courseLabel, dateLocale, LESSON_STATUS_EN, DELIVERY_MODE_EN, VENUE_KIND_EN, type Lang } from "@/lib/i18n";
// ─── バッジ ───────────────────────────────────────────
function CourseBadge({ course }: { course?: string }) {
  const lang = useLang();
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
      {courseLabel(course, lang)}
    </span>
  );
}

function StatusBadge({ status }: { status: LessonStatus }) {
  const lang = useLang();
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
      status === "scheduled" ? "bg-blue-100 text-blue-700"   :
      status === "completed" ? "bg-green-100 text-green-700" :
      status === "cancelled_same_day" ? "bg-amber-100 text-amber-700" :
                               "bg-gray-100 text-gray-500"
    )}>
      {status === "scheduled" && <Clock size={9} />}
      {status === "completed" && <CheckCircle size={9} />}
      {(status === "cancelled" || status === "cancelled_same_day") && <XCircle size={9} />}
      {lang === "en" ? LESSON_STATUS_EN[status] : LESSON_STATUS_LABEL[status]}
    </span>
  );
}

// レッスン日時 → "2026年6月" 形式（顧客ごとの一覧を月単位でかためて見やすくするための小見出し）
function monthLabel(iso: string, lang: Lang): string {
  const d = new Date(iso);
  if (lang === "en") return d.toLocaleDateString("en-US", { year: "numeric", month: "long" });
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

// ─── 月ごとのアコーディオン（顧客アコーディオンの中に入れ子で表示） ───
function LessonMonthGroup({
  label, lessons, customers, members, sessionPasses, customerPlans, allLessons, rentalGyms, stores, fctStores, avenirStores, venueFees, isAdmin, currentMemberId, defaultOpen,
}: {
  label: string;
  lessons: Lesson[];
  customers: Customer[];
  members: Member[];
  sessionPasses: SessionPass[];
  customerPlans: CustomerPlanRecord[];
  allLessons: Lesson[];
  rentalGyms: RentalGym[];
  fctStores: FctStore[];
  avenirStores: AvenirStore[];
  venueFees: CustomerVenueFee[];
  stores: Store[];
  isAdmin: boolean;
  currentMemberId?: string;
  defaultOpen?: boolean;
}) {
  const lang = useLang();
  const tt = makeT(lang);
  const [open, setOpen] = useState(!!defaultOpen);
  const scheduledCount = lessons.filter((l) => l.status === "scheduled").length;

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 py-2.5 -mx-1 px-1 text-left rounded-lg hover:bg-gray-50 transition"
      >
        <span className="text-xs font-bold text-gray-600">{label}</span>
        <span className="text-[11px] text-gray-400">
          {tt(`${lessons.length}件`, `${lessons.length}`)}{scheduledCount > 0 && tt(`・予定 ${scheduledCount}件`, ` · ${scheduledCount} upcoming`)}
        </span>
        <span className="ml-auto text-gray-300 flex-shrink-0">
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>
      {open && (
        <div className="pb-1">
          {lessons.map((l) => (
            <LessonItem key={l.id} lesson={l} customers={customers} members={members}
              sessionPasses={sessionPasses} customerPlans={customerPlans} allLessons={allLessons} rentalGyms={rentalGyms} stores={stores} fctStores={fctStores} avenirStores={avenirStores} venueFees={venueFees}
              isAdmin={isAdmin} currentMemberId={currentMemberId} />
          ))}
        </div>
      )}
    </div>
  );
}

function passLabel(pass: SessionPass, lang: Lang) {
  if (lang === "en") return `${pass.totalCount}-session pass (${pass.remainingCount} left)${pass.expiredAt ? "  expires " + pass.expiredAt : ""}`;
  return `${pass.totalCount}回券（残り${pass.remainingCount}回）${pass.expiredAt ? "　期限: " + pass.expiredAt : ""}`;
}

// ─── プラン照合ロジック ───────────────────────────────
function computeSuggestion(
  customerId: string,
  scheduledAt: string,
  allLessons: Lesson[],
  customerPlans: CustomerPlanRecord[],
  excludeLessonId?: string,
  lang: Lang = "ja",
): { course: string; withinPlan: boolean; noPlan?: boolean; message: string } | null {
  const tt = makeT(lang);
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
    return { course: "", withinPlan: false, noPlan: true, message: tt("この日付に適用中のプランがありません", "No monthly plan on this date") };
  }

  const planSessions = parseInt(activePlan.plan.replace("月", "").replace("回", ""), 10);
  if (monthCount < planSessions) {
    return {
      course: activePlan.plan,
      withinPlan: true,
      message: tt(`プラン内（${activePlan.plan}：今月 ${monthCount + 1} / ${planSessions} 回目）`, `Within plan (${courseLabel(activePlan.plan, lang)}: ${monthCount + 1} of ${planSessions} this month)`),
    };
  }
  return {
    course: "",
    withinPlan: false,
    message: tt(`${activePlan.plan} の上限（${planSessions}回/月）を超えています。都度 または 回数券 を選択してください。`, `Over the ${courseLabel(activePlan.plan, lang)} limit (${planSessions}/month). Choose Pay per session or Session pass.`),
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

/**
 * 会場の利用料。
 *
 * 金額を決められるのは管理者だけ。トレーナーには読むだけで見せる
 * （どの会場がいくらかは分かった方がいいが、勝手に変えられると利益がズレる）。
 * この金額はトレーナーの歩合からは引かれない（利益の計算でだけ差し引く）。
 */
function VenueFeeField({
  label, name, value, onChange, isAdmin, note,
}: {
  label: string; name: string; value: string;
  onChange: (v: string) => void; isAdmin: boolean; note: string;
}) {
  const tt = makeT(useLang());
  return (
    <div className="mt-2">
      <label className="text-xs font-semibold text-gray-600 mb-1.5 block">{label}</label>
      {isAdmin ? (
        <>
          <input
            name={name} type="number" min="0" step="1" value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">{note}</p>
        </>
      ) : (
        <>
          <p className="px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-700">
            {value !== "" ? `¥${Number(value).toLocaleString("ja-JP")}` : "—"}
          </p>
          <input type="hidden" name={name} value={value} />
          <p className="text-xs text-gray-400 mt-1">
            {tt("会場の料金です（変更できるのは管理者のみ）。あなたの歩合からは引かれません。", "Venue fee (only admins can change it). It is not taken from your pay.")}
          </p>
        </>
      )}
    </div>
  );
}

// ─── レッスンフォーム ─────────────────────────────────
export function LessonForm({
  defaultValues, customers, members, sessionPasses, customerPlans, allLessons,
  rentalGyms = [], stores = [], fctStores = [], avenirStores = [], venueFees = [], fixedCustomerId, isAdmin = false, onClose, action, multiAction, onDelete, submitLabel,
}: {
  defaultValues?: Partial<Lesson>;
  customers: Customer[];
  members: Member[];
  sessionPasses: SessionPass[];
  customerPlans: CustomerPlanRecord[];
  allLessons: Lesson[];
  rentalGyms?: RentalGym[];
  fctStores?: FctStore[];
  avenirStores?: AvenirStore[];
  stores?: Store[];
  /** 顧客ごとの会場料金（マスタの料金の上書き） */
  venueFees?: CustomerVenueFee[];
  fixedCustomerId?: string;
  /** 金額（単価）は管理者だけが入力できる。トレーナーには出さない */
  isAdmin?: boolean;
  onClose: () => void;
  action: (fd: FormData) => Promise<ActionResult | void>;
  multiAction?: (fd: FormData) => Promise<ActionResult | void>; // 作成時の複数日時・繰り返し用
  onDelete?: () => Promise<ActionResult | void>;  // 編集時の削除（管理者または登録者本人）
  submitLabel: string;
}) {
  const lang = useLang();
  const tt = makeT(lang);
  const router = useRouter();
  const { locked, run } = useSubmitLock();
  const [error, setError] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState(fixedCustomerId ?? defaultValues?.customerId ?? "");
  const [selectedCourse, setSelectedCourse] = useState(defaultValues?.course ?? "");
  const [selectedPassId, setSelectedPassId] = useState(() => {
    const id = defaultValues?.sessionPassId ?? "";
    if (defaultValues?.id) return id;   // 編集は、今付いている回数券のまま
    // 新しく作る・複製するとき：使い切った回数券は選ばない。使える券が1枚だけなら、それを選んでおく
    if (id && sessionPasses.some((p) => p.id === id && p.remainingCount > 0)) return id;
    const cid = fixedCustomerId ?? defaultValues?.customerId ?? "";
    const usable = sessionPasses.filter((p) => p.customerId === cid && p.remainingCount > 0);
    return usable.length === 1 && (defaultValues?.course ?? "").startsWith("回数券") ? usable[0].id : "";
  });
  // 開始・終了で管理（基本60分。開始を入れたら終了は1時間後が初期値）
  const startLocalInit = defaultValues?.scheduledAt ? isoToLocalInput(defaultValues.scheduledAt) : "";
  const [startLocal, setStartLocal] = useState(startLocalInit);
  const [endLocal, setEndLocal] = useState(
    defaultValues?.endAt ? isoToLocalInput(defaultValues.endAt) : localPlusHour(startLocalInit)
  );
  const scheduledDate = startLocal ? startLocal.slice(0, 10) : "";
  function onStartChange(v: string) {
    // 複数日時で足した日のうち、開始と同じ時刻のものは、開始の時刻を変えたら一緒に変える
    // （カレンダーで日だけ選んだあとに時刻を直しても、全部の日がそろうように）
    const oldTime = startLocal.slice(11), newTime = v.slice(11);
    if (oldTime && newTime && oldTime !== newTime) {
      setExtraStarts((prev) => prev.map((x) => (x.slice(11) === oldTime ? `${x.slice(0, 10)}T${newTime}` : x)));
    }
    setStartLocal(v);
    setEndLocal(localPlusHour(v));
    const d = v.slice(0, 10);
    revalidateCourse(selectedCustomerId, d || today);
    applySuggestion(selectedCustomerId, d);
  }

  async function handleDelete() {
    if (!onDelete) return;
    if (!confirm(tt("このレッスンを削除しますか？", "Delete this lesson?"))) return;
    setError("");
    await run(async () => {
      try { assertActionOk(await onDelete()); router.refresh(); onClose(); }
      catch (e) { setError(e instanceof Error ? e.message : tt("削除に失敗しました", "Could not delete")); }
    });
  }

  // 作成時のみ：複数日時／繰り返し（個人予定と同様・排他）
  const isCreate = !defaultValues?.id && !!multiAction;
  const [multiMode, setMultiMode] = useState<"single" | "multiple" | "recurring">("single");
  const [extraStarts, setExtraStarts] = useState<string[]>([]); // datetime-local の開始
  const [recurrence, setRecurrence] = useState<"daily" | "weekly" | "biweekly" | "monthly">("weekly");
  const [recurUntil, setRecurUntil] = useState("");

  /** カレンダーで日をタップ：その日が入っていなければ開始と同じ時刻で足し、入っていれば外す */
  function toggleExtraDate(date: string) {
    const time = startLocal.slice(11);
    if (!time) return;
    setExtraStarts((prev) => prev.some((x) => x.slice(0, 10) === date)
      ? prev.filter((x) => x.slice(0, 10) !== date)
      : [...prev.filter(Boolean), `${date}T${time}`].sort());
  }

  // その場で回数券を足す（管理者だけ）。足した券は、一覧が読み直されたらそのまま選ぶ
  const [showAddPass, setShowAddPass] = useState(false);
  const [pendingPassId, setPendingPassId] = useState("");

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
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>(defaultValues?.deliveryMode ?? "store");
  const [rentalGymId, setRentalGymId] = useState(defaultValues?.rentalGymId ?? "");
  const [rentalGymFee, setRentalGymFee] = useState(
    defaultValues?.rentalGymFee != null ? String(defaultValues.rentalGymFee) : ""
  );
  // 店舗（レンタルジムとは別概念。利用料は無い）
  const [storeId, setStoreId] = useState(defaultValues?.storeId ?? "");
  const [storeFee, setStoreFee] = useState(
    defaultValues?.storeFee != null ? String(defaultValues.storeFee) : ""
  );
  // FCT店舗（レンタルジムと同じく1回あたりの利用料がある）
  const [fctStoreId, setFctStoreId] = useState(defaultValues?.fctStoreId ?? "");
  const [fctStoreFee, setFctStoreFee] = useState(
    defaultValues?.fctStoreFee != null ? String(defaultValues.fctStoreFee) : ""
  );
  const [avenirStoreId, setAvenirStoreId] = useState(defaultValues?.avenirStoreId ?? "");
  const [avenirStoreFee, setAvenirStoreFee] = useState(
    defaultValues?.avenirStoreFee != null ? String(defaultValues.avenirStoreFee) : ""
  );

  /**
   * その会場の利用料（初期値）。
   * FCT経由のお客さまはFCTが場所を用意してくれるので、FCT店舗は0円になる。
   */
  function venueFeeFor(cid: string, kind: VenueKind, venueId: string, masterFee: number): number {
    return resolveVenueFee(cid, kind, venueId, masterFee, venueFees, {
      fctCustomer: isFctCustomer(customers.find((c) => c.id === cid)),
    });
  }

  // 場所はレンタルジム／店舗／FCT店舗のいずれか1つ（同じ回に2つの場所は無いため排他）
  function clearPlaces() {
    setRentalGymId(""); setRentalGymFee("");
    setStoreId(""); setStoreFee("");
    setFctStoreId(""); setFctStoreFee("");
    setAvenirStoreId(""); setAvenirStoreFee("");
  }

  function onRentalGymChange(id: string) {
    clearPlaces();
    setRentalGymId(id);
    const gym = rentalGyms.find((g) => g.id === id);
    if (gym) {
      setRentalGymFee(String(venueFeeFor(selectedCustomerId, "gym", id, gym.fee)));
      setLocation(gym.name); // 場所を自動入力（編集可）
    }
  }

  function onStoreChange(id: string) {
    clearPlaces();
    setStoreId(id);
    const store = stores.find((s) => s.id === id);
    if (store) {
      setStoreFee(String(venueFeeFor(selectedCustomerId, "store", id, store.fee)));
      setLocation(store.name); // 場所を自動入力（編集可）
    }
  }

  function onFctStoreChange(id: string) {
    clearPlaces();
    setFctStoreId(id);
    const fct = fctStores.find((f) => f.id === id);
    if (fct) {
      setFctStoreFee(String(venueFeeFor(selectedCustomerId, "fct", id, fct.fee)));
      setLocation(fct.name); // 場所を自動入力（編集可）
    }
  }

  function onAvenirStoreChange(id: string) {
    clearPlaces();
    setAvenirStoreId(id);
    const av = avenirStores.find((a) => a.id === id);
    if (av) {
      setAvenirStoreFee(String(venueFeeFor(selectedCustomerId, "avenir", id, av.fee)));
      setLocation(av.name); // 場所を自動入力（編集可）
    }
  }

  // 会場は「店舗 / レンタルジム / FCT店舗」のどれか1つ。
  // 全部を1つのプルダウンに並べると数十件が一気に出て選びにくいので、
  // まず種類を選び、その種類のぶんだけ出す。
  const [venueKind, setVenueKind] = useState<VenueKind>(venueKindOf(defaultValues));
  const venueKinds = venueKindOptions(stores.length, rentalGyms.length, fctStores.length, avenirStores.length);
  /** FCT経由のお客さまか（FCT店舗でやる・会場代はかからない・請求書は出さない） */
  const fctCustomer = isFctCustomer(customers.find((c) => c.id === selectedCustomerId));
  /** 選んだFCT店舗の歩合率（%）。店舗を選ぶまでは既定の45%で見込みを出す */
  const fctRate = fctStores.find((f) => f.id === fctStoreId)?.rate ?? FCT_DEFAULT_RATE;
  /** FCTから入る額（お客さまの単価の税抜 × 歩合率） */
  const fctPay  = fctLessonPay(customers.find((c) => c.id === selectedCustomerId)?.singleSessionPrice, fctRate);

  /** 顧客を選び直したとき、すでに選んでいる会場の料金を引き直す */
  function syncVenueFeeFor(customerId: string) {
    if (storeId) {
      const st = stores.find((x) => x.id === storeId);
      if (st) setStoreFee(String(venueFeeFor(customerId, "store", st.id, st.fee)));
    }
    if (rentalGymId) {
      const gym = rentalGyms.find((g) => g.id === rentalGymId);
      if (gym) setRentalGymFee(String(venueFeeFor(customerId, "gym", gym.id, gym.fee)));
    }
    if (fctStoreId) {
      const fct = fctStores.find((f) => f.id === fctStoreId);
      if (fct) setFctStoreFee(String(venueFeeFor(customerId, "fct", fct.id, fct.fee)));
    }
    if (avenirStoreId) {
      const av = avenirStores.find((a) => a.id === avenirStoreId);
      if (av) setAvenirStoreFee(String(venueFeeFor(customerId, "avenir", av.id, av.fee)));
    }
  }

  function onVenueKindChange(kind: VenueKind) {
    setVenueKind(kind);
    clearPlaces();  // 種類を変えたら選び直し。場所の手入力はそのまま残す
  }

  /**
   * FCT経由のお客さまを選んだら、会場の種類を「FCT」に寄せる。
   * FCTのお客さまはFCTの店舗でやる決まりなので、毎回選ぶ手間を省く。
   * すでに別の会場を選んでいるときは触らない。
   */
  function applyFctVenue(cid: string) {
    if (!isFctCustomer(customers.find((c) => c.id === cid))) return;
    if (deliveryMode === "onsite") return;
    if (storeId || rentalGymId || avenirStoreId) return;
    setVenueKind("fct");
  }

  // 出張はお客さんのところへ行くので会場（店舗・レンタルジム等）を選ばない。
  // 訪問先は場所欄に住所を手で書く（任意）。
  const onsite = deliveryMode === "onsite";
  function onDeliveryModeChange(mode: DeliveryMode) {
    setDeliveryMode(mode);
    if (mode === "onsite") { clearPlaces(); setVenueKind("none"); }
  }

  const currentVenueKey =
    rentalGymId ? venueKey("gym", rentalGymId) :
    fctStoreId  ? venueKey("fct", fctStoreId)  :
    avenirStoreId ? venueKey("avenir", avenirStoreId) :
    storeId     ? venueKey("store", storeId)   : "";

  // その顧客が前に使った会場（直近順）。タップで一発選択できるようにする
  const venueHistory = useMemo(
    () => recentVenues(allLessons, selectedCustomerId, { stores, rentalGyms, fctStores, avenirStores }),
    [allLessons, selectedCustomerId, rentalGyms, stores, fctStores, avenirStores],
  );

  function applyVenue(kind: VenueKind, id: string) {
    setVenueKind(kind);
    if (kind === "gym")      onRentalGymChange(id);
    else if (kind === "fct") onFctStoreChange(id);
    else                     onStoreChange(id);
  }

  // 場所の入力候補: 選択中の顧客が過去に手入力した場所のみ。
  // 会場（店舗・レンタルジム・FCT店舗）から自動入力されたぶんは「よく使う会場」に出るので、
  // ここに出すと同じ名前が2か所に並んでしまう。
  const locationListId = useId();
  const locationHistory = useMemo(() => {
    if (!selectedCustomerId) return [];
    const set = new Set<string>();
    for (const l of allLessons) {
      if (l.customerId !== selectedCustomerId || !l.location) continue;
      if (venueKindOf(l) !== "none") continue;
      set.add(l.location);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ja"));
  }, [allLessons, selectedCustomerId]);

  const suggestion = useMemo(
    () => selectedCustomerId && scheduledDate
      ? computeSuggestion(selectedCustomerId, scheduledDate, allLessons, customerPlans, defaultValues?.id, lang)
      : null,
    [selectedCustomerId, scheduledDate, allLessons, customerPlans, defaultValues?.id, lang]
  );

  function applySuggestion(customerId: string, date: string) {
    if (defaultValues?.id) return;
    const sug = computeSuggestion(customerId, date, allLessons, customerPlans);
    if (sug?.course) { setSelectedCourse(sug.course); return; }
    // プランも有効な回数券も無い顧客は「都度」を既定にする。
    // コース未選択のまま登録されると請求書の明細に載らず、請求漏れになるため。
    if (!customerId) return;
    const hasPass = sessionPasses.some((p) => p.customerId === customerId && p.remainingCount > 0);
    if (hasPass) return;
    // 回数券を使ってきたお客様（券は使い切っている）は「回数券」のままにして、「回数券がありません」と出す。
    // 「都度」に変えてしまうと、都度の料金で請求が立ってしまう（2026-11-19 尚樹）。
    const usedPassBefore = sessionPasses.some((p) => p.customerId === customerId);
    setSelectedCourse(usedPassBefore ? "回数券" : "都度");
  }

  async function handleSubmit(fd: FormData) {
    setError("");
    if (!startLocal) { setError(tt("開始日時を入力してください", "Enter the start time")); return; }
    // 回数券が無い・足りないときは「仮押さえ」で入れる。登録する前に、はっきり知らせる
    if (isCreate && pendingCount > 0) {
      if (!confirm(tt(
        `${pendingCount === plannedCount ? "回数券がありません。" : "回数券が足りません。"}\n${pendingCount === plannedCount ? `${plannedCount > 1 ? `${plannedCount}件とも` : "このレッスンは"}` : `${plannedCount}件のうち${pendingCount}件は`}「仮押さえ」として登録します（回数券はまだ使われません）。\n${isAdmin ? "回数券を追加すると、日付の早い順に自動で使われます。" : "管理者に回数券の追加を頼んでください。"}\nこのまま登録しますか？`,
        `There is no session pass.\n${pendingCount === plannedCount ? "This will be" : `${pendingCount} of ${plannedCount} will be`} saved as a hold (no session is used yet).\n${isAdmin ? "When a pass is added, it is used from the earliest date." : "Ask an admin to add a pass."}\nSave anyway?`,
      ))) return;
    }
    // 担当が空のまま作ると、本人のダッシュボードの「完了待ち」に出ず、スケジュールで完了も押せない
    // （2026-11-16、担当なしのレッスンが残っていて気づけなかった）。作るときだけ確かめる。
    if (isCreate && !String(fd.get("trainerMemberId") ?? "").trim()) {
      const n = buildLessonSlots().length;
      if (!confirm(tt(
        `担当トレーナーが「未設定」のまま${n > 1 ? `${n}件` : ""}登録します。\n担当が空だと、トレーナー本人の画面に出ず、完了も押せません。\nこのまま登録しますか？`,
        `No trainer is set${n > 1 ? ` for these ${n} lessons` : ""}.\nWithout a trainer, it won't show on the trainer's screen and can't be marked done.\nSave anyway?`,
      ))) return;
    }
    // run() が実行中の連打を同期的に無視するため、二重作成が起きない
    await run(async () => {
      try {
        if (isCreate) {
          // 作成は複数日時・繰り返しに対応（単発でも1件の配列）
          fd.set("slots", JSON.stringify(buildLessonSlots()));
          assertActionOk(await multiAction!(fd));
        } else {
          // datetime-local はローカル時刻なので UTC ISO に変換して送信
          fd.set("scheduledAt", localInputToISO(startLocal));
          fd.set("endAt", endLocal ? localInputToISO(endLocal) : "");
          assertActionOk(await action(fd));
        }
        router.refresh();
        onClose();
      } catch (e) { setError(e instanceof Error ? e.message : tt("エラー", "Error")); }
    });
  }

  const inputClass = "w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelClass = "text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5";
  const locationLocked = !!rentalGymId || !!storeId || !!fctStoreId || !!avenirStoreId; // レンタルジム/店舗/FCT店舗のときは場所を自動設定

  /** 会場を選ばずに場所へ会場名を打っていないか（利用料の付け忘れ防止） */
  const venueHint = useMemo(
    () => (locationLocked || onsite)
      ? null
      : matchVenueByText(location, { stores, rentalGyms, fctStores, avenirStores }),
    [locationLocked, onsite, location, stores, rentalGyms, fctStores, avenirStores],
  );


  const isSessionPassCourse = selectedCourse.startsWith("回数券");
  // 選べる回数券：残りのあるもの。編集のときは、今付いている券（使い切っていても）も出す
  const availablePasses = sessionPasses.filter(
    (p) => p.customerId === selectedCustomerId && (p.remainingCount > 0 || (!!defaultValues?.id && p.id === defaultValues?.sessionPassId))
  );
  const noPassAvailable = isSessionPassCourse && selectedCustomerId !== "" && availablePasses.length === 0;
  /** 編集しているレッスンが「仮押さえ」（回数券なし）か。回数券なしのままでも保存できるようにする */
  const editingPending = !!defaultValues?.id && isPassPendingLesson(defaultValues);

  // 作成する件数（単発は1件、複数日時・繰り返しはその件数）と回数券の残数の突き合わせ。
  // 残数を超えた件数をまとめて登録すると、超過分が0消費のまま登録されてしまうため事前に止める。
  const plannedCount = isCreate && startLocal ? buildLessonSlots().length : 1;
  // その場で足した回数券が一覧に入ってきたら、コースを「回数券」にしてその券を選ぶ
  if (pendingPassId && sessionPasses.some((p) => p.id === pendingPassId)) {
    setSelectedCourse("回数券");
    setSelectedPassId(pendingPassId);
    setPendingPassId("");
  }
  const selectedPass = sessionPasses.find((p) => p.id === selectedPassId);
  /** このお客様に、残りのある回数券があるか */
  const hasUsablePass = sessionPasses.some((p) => p.customerId === selectedCustomerId && p.remainingCount > 0);
  /** その場で回数券を足せるか（管理者で、お客様を選んでいるとき） */
  const canAddPass = isAdmin && selectedCustomerId !== "";
  // このお客様のレッスンがすでに入っている日（複数日時のカレンダーに点を付ける）
  const busyDates = useMemo(() => {
    const set = new Set<string>();
    if (!selectedCustomerId) return set;
    for (const l of allLessons) {
      if (l.customerId !== selectedCustomerId || l.status === "cancelled" || l.id === defaultValues?.id) continue;
      set.add(isoToLocalInput(l.scheduledAt).slice(0, 10));
    }
    return set;
  }, [allLessons, selectedCustomerId, defaultValues?.id]);
  const passShortage = isCreate && isSessionPassCourse && selectedPass
    ? Math.max(0, plannedCount - selectedPass.remainingCount)
    : 0;
  /** 仮押さえ（回数券を付けずに入れる）になる件数。回数券が無ければ全部、足りなければ足りないぶん */
  const pendingCount = !isSessionPassCourse || selectedCustomerId === "" ? 0
    : noPassAvailable ? plannedCount
    : passShortage;

  // ─── 選択可能なコースの算出 ───────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const refDate = scheduledDate || today;

  function courseAllowed(value: string, paymentType: string, customerId: string, date: string): boolean {
    if (value === defaultValues?.course) return true;          // 編集時は元のコースを常に許可
    if (paymentType === "single") return true;                 // 都度は常に選べる
    if (!customerId) return false;                             // 顧客未選択なら都度のみ
    // 回数券は、券が無くても選べる（「回数券がありません」と出して、仮押さえで入れる。2026-11-19）
    if (paymentType === "session_pass") return true;
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
    // action(フォームアクション)ではなく onSubmit を使う。React のフォームアクションは
    // トランザクション扱いで locked の反映（ボタンのスピナー表示）が遅れることがあるため、
    // preventDefault + 手動 FormData で「押した瞬間に」ローディングを出す。
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(new FormData(e.currentTarget)); }} className="space-y-4">
      {fixedCustomerId ? (
        <input type="hidden" name="customerId" value={fixedCustomerId} />
      ) : (
        <div>
          <label className={labelClass}><User size={12} /> {tt("顧客", "Client")} <span className="text-red-500">*</span></label>
          <CustomerPicker
            customers={customers} name="customerId" required value={selectedCustomerId}
            onChange={(id) => { setSelectedCustomerId(id); setSelectedPassId(""); syncVenueFeeFor(id); applyFctVenue(id); revalidateCourse(id, refDate); applySuggestion(id, scheduledDate); }}
          />
        </div>
      )}

      <div>
        <label className={labelClass}><User size={12} /> {tt("担当トレーナー", "Trainer")}</label>
        <select name="trainerMemberId" defaultValue={defaultValues?.trainerMemberId ?? ""} className={inputClass}>
          <option value="">{tt("未設定", "Not set")}</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}{m.role ? `（${m.role}）` : ""}</option>)}
        </select>
      </div>

      <div>
        <label className={labelClass}><Calendar size={12} /> {tt("開始", "Start")} <span className="text-red-500">*</span></label>
        <input type="datetime-local" required value={startLocal} onChange={(e) => onStartChange(e.target.value)}
          className={inputClass} />
      </div>

      <div>
        <label className={labelClass}><Calendar size={12} /> {tt("終了", "End")}</label>
        <input type="datetime-local" value={endLocal} onChange={(e) => setEndLocal(e.target.value)}
          className={inputClass} />
        <p className="text-xs text-gray-400 mt-1">{tt("基本60分。開始を入れると終了は1時間後が初期値になります（変更可）。", "Usually 60 min. End is set to 1 hour after start (you can change it).")}</p>
      </div>

      {/* 登録方法（作成時のみ・単発／複数日時／繰り返しは排他） */}
      {isCreate && (
        <div className="space-y-3">
          <div className={tabsWrap}>
            {([["single", tt("単発", "Single")], ["multiple", tt("複数日時", "Several dates")], ["recurring", tt("繰り返し", "Repeat")]] as const).map(([key, label]) => (
              <button key={key} type="button" onClick={() => setMultiMode(key)} className={tabButton(multiMode === key, "sm")}>
                {label}
              </button>
            ))}
          </div>

          {multiMode === "multiple" && (
            <div className="rounded-xl border border-gray-200 p-3 bg-gray-50/60">
              <p className="text-[11px] text-gray-500 mb-2 leading-relaxed">
                {startLocal
                  ? tt(`カレンダーで日をタップすると、開始と同じ時刻（${startLocal.slice(11)}）で追加されます。もう一度タップすると外れます（各60分）。`,
                       `Tap days on the calendar to add them at the same time as the start (${startLocal.slice(11)}). Tap again to remove (60 min each).`)
                  : tt("先に上の「開始」に日時を入れてください。", "Enter the start date and time first.")}
              </p>
              <MultiDateCalendar
                key={startLocal.slice(0, 7) || "none"}
                baseDate={startLocal.slice(0, 10)}
                selected={extraStarts.filter(Boolean).map((x) => x.slice(0, 10))}
                onToggle={toggleExtraDate}
                busyDates={busyDates}
                lang={lang}
                disabled={!startLocal}
              />
              <p className="text-xs font-semibold text-gray-700 mt-2.5 mb-2">
                {tt(`登録する件数：${plannedCount}件（開始の日を含む）`, `Lessons to add: ${plannedCount} (including the start date)`)}
              </p>
              {extraStarts.length > 0 && (
                <p className="text-[11px] text-gray-400 mb-1.5">{tt("時刻を変えたい日は、下で直せます。", "You can change the time of each date below.")}</p>
              )}
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
                <Plus size={14} /> {tt("日時を1件ずつ追加", "Add one date")}
              </button>
            </div>
          )}

          {multiMode === "recurring" && (
            <div className="rounded-xl border border-gray-200 p-3 bg-gray-50/60">
              <div className="flex gap-2">
                <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as typeof recurrence)}
                  className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="daily">{tt("毎日", "Daily")}</option>
                  <option value="weekly">{tt("毎週", "Weekly")}</option>
                  <option value="biweekly">{tt("隔週", "Every 2 weeks")}</option>
                  <option value="monthly">{tt("毎月", "Monthly")}</option>
                </select>
                <input type="date" value={recurUntil} min={startLocal.slice(0, 10)} onChange={(e) => setRecurUntil(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                {recurUntil ? tt("開始日から終了日まで、同じ時間・長さで繰り返し作成します。", "Repeats at the same time and length from the start date to the end date.") : tt("繰り返しの終了日を選んでください。", "Choose the last date.")}
                {selectedCourse.startsWith("回数券") ? tt(" ※回数券は作成数だけ消費されます。", " Each lesson uses one session from the pass.") : ""}
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
            : suggestion.noPlan
              ? "bg-gray-50 border border-gray-200 text-gray-500"
              : "bg-orange-50 border border-orange-200 text-orange-700"
        )}>
          {suggestion.withinPlan ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
          {suggestion.message}
        </div>
      )}

      {/* 実施形態（どこでやるか）。請求書の品目にも出るので、推測ではなく明示的に選ぶ */}
      <div>
        <label className={labelClass}><MapPin size={12} /> {tt("実施形態", "Where")}</label>
        <div className="flex gap-2">
          {DELIVERY_MODE_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => onDeliveryModeChange(o.value)}
              className={cn(
                "flex-1 py-2 rounded-xl border text-sm font-medium transition",
                deliveryMode === o.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300"
              )}
            >
              {lang === "en" ? DELIVERY_MODE_EN[o.value] : o.label}
            </button>
          ))}
        </div>
        <input type="hidden" name="deliveryMode" value={deliveryMode} />
        <p className="text-xs text-gray-400 mt-1">
          {tt("出張・オンラインは請求書の品目に「（出張）」「（オンライン）」と出ます。店舗は無印です。", "On-site and Online are shown on the invoice. Studio has no mark.")}
        </p>
      </div>

      {/* 会場（店舗・レンタルジム・FCT店舗のどれか1つ）。
          選択肢に料金は入れない。スマホだと1件が2行に折り返して一覧がとても縦長になるため、
          料金は選んだあとに下の入力欄で見せる。 */}
      <div className={cn(onsite && "hidden")}>
        <label className={labelClass}><Building2 size={12} /> {tt("会場", "Venue")}</label>
        {fctCustomer && (fctStoreId ? (
          <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 mb-2 leading-relaxed">
            {tt("FCTのお客さま。この会場の歩合は ", "FCT client. The rate at this venue is ")}<span className="font-semibold">{fctRate}%</span>{tt(" です（会場代は0円）。", " (no venue fee).")}
            {isAdmin && fctPay > 0 && <> FCTから入るのは <span className="font-semibold">¥{fctPay.toLocaleString("ja-JP")}</span> / 回。</>}
          </p>
        ) : (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-2 leading-relaxed">
            {tt("FCTのお客さまです。", "FCT client. ")}<span className="font-semibold">{tt("会場でFCT店舗を選んでください", "Choose an FCT venue")}</span>{tt("。", ".")}
            {tt(`選ばないと歩合率が決まらないので、${FCT_DEFAULT_RATE}%で計算されます。`, ` Otherwise ${FCT_DEFAULT_RATE}% is used.`)}
          </p>
        ))}
        {venueHistory.length > 0 && (
          <div className="mb-2">
            <p className="text-[11px] text-gray-400 mb-1">{tt("よく使う会場（タップで選択）", "Recent venues (tap to choose)")}</p>
            <div className="flex flex-wrap gap-1.5">
              {venueHistory.map((v) => (
                <button
                  key={venueKey(v.kind, v.id)}
                  type="button"
                  onClick={() => applyVenue(v.kind, v.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs border transition",
                    currentVenueKey === venueKey(v.kind, v.id)
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300"
                  )}
                >
                  {v.name}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="grid grid-cols-3 gap-1.5">
          {venueKinds.map((k) => (
            <button
              key={k.value}
              type="button"
              onClick={() => onVenueKindChange(k.value)}
              className={cn(
                "py-2 rounded-xl border text-xs font-medium transition",
                venueKind === k.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300"
              )}
            >
              {lang === "en" ? VENUE_KIND_EN[k.value] ?? k.label : k.label}
            </button>
          ))}
        </div>
        {venueKind === "store" && (
          <select value={storeId} onChange={(e) => onStoreChange(e.target.value)} className={cn(inputClass, "mt-2")}>
            <option value="">{tt("FIT STAGEの店舗を選択", "Choose a FIT STAGE studio")}</option>
            {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        {venueKind === "gym" && (
          <select value={rentalGymId} onChange={(e) => onRentalGymChange(e.target.value)} className={cn(inputClass, "mt-2")}>
            <option value="">{tt("レンタルジムを選択", "Choose a rental gym")}</option>
            {rentalGyms.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}
        {venueKind === "fct" && (
          <select value={fctStoreId} onChange={(e) => onFctStoreChange(e.target.value)} className={cn(inputClass, "mt-2")}>
            <option value="">{tt("FCT店舗を選択", "Choose an FCT venue")}</option>
            {fctStores.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        )}
        {venueKind === "avenir" && (
          <select value={avenirStoreId} onChange={(e) => onAvenirStoreChange(e.target.value)} className={cn(inputClass, "mt-2")}>
            <option value="">{tt("アヴニール店舗を選択", "Choose an Avenir venue")}</option>
            {avenirStores.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        )}
        {/* 保存する形はこれまでどおり3つに分かれている */}
        <input type="hidden" name="storeId"     value={storeId} />
        <input type="hidden" name="rentalGymId" value={rentalGymId} />
        <input type="hidden" name="fctStoreId"  value={fctStoreId} />
        <input type="hidden" name="avenirStoreId" value={avenirStoreId} />
        {storeId && (
          <VenueFeeField label={tt("店舗の利用料（税込）", "Studio fee (incl. tax)")} name="storeFee" value={storeFee}
            onChange={setStoreFee} isAdmin={isAdmin} note={"マスタの料金が初期値です。利益の計算でこの額を差し引きます（歩合は差し引きません）。"} />
        )}
        {rentalGymId && (
          <VenueFeeField label={tt("レンタルジム代（税込）", "Rental gym fee (incl. tax)")} name="rentalGymFee" value={rentalGymFee}
            onChange={setRentalGymFee} isAdmin={isAdmin} note={"マスタの料金が初期値です。利益の計算でこの額を差し引きます（歩合は差し引きません）。"} />
        )}
        {fctStoreId && (
          <VenueFeeField label={tt("FCT店舗の利用料（税込）", "FCT venue fee (incl. tax)")} name="fctStoreFee" value={fctStoreFee}
            onChange={setFctStoreFee} isAdmin={isAdmin}
            note={fctCustomer
              ? "FCTのお客さまなので0円です（場所はFCTが用意してくれるため）。"
              : "マスタの料金が初期値です。利益の計算でこの額を差し引きます（歩合は差し引きません）。"} />
        )}
        {avenirStoreId && (
          <VenueFeeField label={tt("アヴニール店舗の利用料（税込）", "Avenir venue fee (incl. tax)")} name="avenirStoreFee" value={avenirStoreFee}
            onChange={setAvenirStoreFee} isAdmin={isAdmin} note={"マスタの料金が初期値です。利益の計算でこの額を差し引きます（歩合は差し引きません）。"} />
        )}
      </div>

      {/* 場所。会場を選んだらその名前で決まるので入力欄は出さない（会場と二重に見えて、
          会場を選ばずに場所へ会場名を打ってしまう＝利用料が引かれない事故が起きていた）。
          会場マスタに無いところでやるときだけ手で書く。 */}
      <div>
        <label className={labelClass}><MapPin size={12} /> {onsite ? tt("訪問先（住所など）", "Visit address") : tt("場所", "Place")}</label>
        {locationLocked ? (
          <>
            <p className="px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-700">{location || "—"}</p>
            <input type="hidden" name="location" value={location} />
            <p className="text-[11px] text-gray-400 mt-1">
              {tt(`上で選んだ${venueKindLabel(rentalGymId, fctStoreId, avenirStoreId)}の名前が入ります`, "Filled in from the venue chosen above")}
            </p>
          </>
        ) : (
          <>
            <input
              name="location"
              list={locationListId}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={onsite ? tt("住所や施設名（任意）", "Address or building (optional)") : tt("会場マスタに無い場所だけ入力（任意）", "Only for places not in the venue list (optional)")}
              className={inputClass}
            />
            <datalist id={locationListId}>
              {locationHistory.map((loc) => <option key={loc} value={loc} />)}
            </datalist>
            <p className="text-[11px] text-gray-400 mt-1">
              {onsite
                ? tt("出張は会場を選びません。訪問先の住所を入れておくと後で分かりやすいです（空欄でOK）", "No venue for on-site. Adding the address helps later (optional).")
                : tt("上で会場を選んだときは入力不要です。分からなければ空欄でかまいません。", "Not needed if you chose a venue above. Leave blank if unsure.")}
            </p>
            {venueHint && (
              <button
                type="button"
                onClick={() => applyVenue(venueHint.kind, venueHint.id)}
                className="mt-2 w-full text-left rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 hover:bg-amber-100 transition"
              >
                <p className="text-xs font-semibold text-amber-800">{tt(`「${venueHint.name}」は会場に登録されています`, `"${venueHint.name}" is in the venue list`)}</p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  {tt("タップして会場に設定してください。いまのままだと利用料が引かれません。", "Tap to set it as the venue. Otherwise the venue fee is not counted.")}
                </p>
              </button>
            )}
            {locationHistory.length > 0 && (
              <div className="mt-2">
                <p className="text-[11px] text-gray-400 mb-1">{tt("よく使う場所（タップで入力）", "Recent places (tap to fill in)")}</p>
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
          </>
        )}
      </div>

      <div>
        <label className={labelClass}>{tt("コース", "Course")} <span className="text-red-500">*</span></label>
        {/* 必須。未選択だと請求書の明細に載らず請求漏れになるため空のまま登録させない */}
        <select name="course" required value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} className={inputClass}>
          <option value="">{tt("選択してください", "Choose")}</option>
          {passCourses.length > 0 && (
            <optgroup label={tt("回数券", "Session pass")}>
              {passCourses.map((o) => <option key={o.value} value={o.value}>{lang === "en" ? courseLabel(o.value, lang) : o.label}</option>)}
            </optgroup>
          )}
          {monthlyCourses.length > 0 && (
            <optgroup label={tt("月会費", "Monthly")}>
              {monthlyCourses.map((o) => <option key={o.value} value={o.value}>{lang === "en" ? courseLabel(o.value, lang) : o.label}</option>)}
            </optgroup>
          )}
          <optgroup label={tt("単発", "Single")}>
            {singleCourses.map((o) => <option key={o.value} value={o.value}>{lang === "en" ? (isFreeLesson(o.value) ? "Free (not billed)" : courseLabel(o.value, lang)) : o.label}</option>)}
          </optgroup>
        </select>
        {canAddPass && !isSessionPassCourse && !hasUsablePass && (
          <button type="button" onClick={() => setShowAddPass(true)}
            className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-amber-700 hover:bg-amber-50 rounded-lg px-2 py-1 -ml-2 transition">
            <Plus size={13} /> {tt("回数券を追加して、このレッスンに使う", "Add a pass and use it for this lesson")}
          </button>
        )}
      </div>

      {/* 単発（都度・オンライン）の金額。この回だけ単価が違うときに入力する。
          以前は顧客の都度単価を初期値として入れていたが、そうするとレッスン1件ごとに
          そのときの単価が焼き付き、あとから顧客マスタを変えても請求書に反映されなかった。
          既定は空欄にして、顧客マスタの単価は下に案内だけ出す。 */}
      {/* 無料レッスンは必ず0円。金額欄を出すと「空欄なら顧客の都度単価」になってしまうので、
          欄自体を出さずに0円を送る。 */}
      {isFreeLesson(selectedCourse) && (
        <>
          <input type="hidden" name="amount" value="0" />
          <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
            {tt("この回は", "This lesson is ")}<span className="font-semibold">{tt("無料", "free")}</span>{tt("です。請求書には0円で載り、売上には入りません。", ". It shows as ¥0 on the invoice and is not counted as sales.")}
          </p>
        </>
      )}

      {courseToPaymentType(selectedCourse) === "single" && !isFreeLesson(selectedCourse) && (() => {
        const customerPrice = customers.find((c) => c.id === selectedCustomerId)?.singleSessionPrice;
        // 金額はトレーナーには触らせない。編集で消えないよう、今の値はそのまま持っておく
        if (!isAdmin) return <input type="hidden" name="amount" defaultValue={defaultValues?.amount ?? ""} />;
        return (
          <div>
            <label className={labelClass}>金額（単価）</label>
            <input
              name="amount"
              type="number"
              min="0"
              inputMode="numeric"
              defaultValue={defaultValues?.amount ?? ""}
              placeholder={customerPrice != null ? `空欄なら ¥${customerPrice.toLocaleString("ja-JP")}` : "例: 8000"}
              className={inputClass}
            />
            <p className="text-xs text-gray-400 mt-1">
              {fctCustomer && customerPrice != null
                ? `空欄のままならFCTから入る額（¥${fctPay.toLocaleString("ja-JP")}）を使います。`
                  + `お客さまの単価¥${customerPrice.toLocaleString("ja-JP")}の税抜に歩合${fctRate}%をかけた額です。`
                : customerPrice != null
                  ? `空欄のままなら顧客の都度単価（¥${customerPrice.toLocaleString("ja-JP")}）を使います。この回だけ違う金額のときに入力してください。`
                  : "この回の金額。空欄なら顧客の都度単価を使用します。"}
            </p>
          </div>
        );
      })()}

      {/* 回数券選択（回数券コースの場合のみ）。
          回数券が無い・足りないときも登録は止めない。「回数券がありません」と出して、仮押さえ（回数券を付けない）で入れる。
          回数券を足せるのは管理者だけ（ボタンは管理者にだけ出す。サーバー側も requireAdmin）。 */}
      {isSessionPassCourse && (
        <div className={cn("rounded-xl p-3 border", noPassAvailable ? "bg-red-50 border-red-300" : "bg-amber-50 border-amber-200")}>
          <label className={cn(labelClass, noPassAvailable ? "text-red-600" : "text-amber-700")}>
            <Ticket size={12} /> {tt("使用する回数券", "Pass to use")} {!noPassAvailable && !editingPending && <span className="text-red-500">*</span>}
          </label>
          {noPassAvailable ? (
            <div data-pass-warning="none">
              <p className="text-sm text-red-600 font-bold flex items-center gap-1.5">
                <AlertTriangle size={14} className="flex-shrink-0" /> {tt("回数券がありません", "No session pass")}
              </p>
              <p className="text-xs text-red-600 mt-1 leading-relaxed">
                {tt("このお客様には、使える回数券がありません。", "This client has no pass with sessions left. ")}
                {canAddPass
                  ? tt("下のボタンから追加できます。", "Add one with the button below.")
                  : tt("管理者に回数券の追加を頼んでください。", "Ask an admin to add a pass.")}
              </p>
              <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                {defaultValues?.id
                  ? tt("回数券なしのまま（仮押さえ）で保存できます。", "You can save it as a hold, without a pass.")
                  : tt("このまま登録すると「仮押さえ」になります。予定は入りますが、回数券はまだ使われません。回数券が追加されると、日付の早い順に自動で使われます。",
                       "If you save now, it becomes a hold: it is on the schedule, but no session is used yet. When a pass is added, it is used from the earliest date.")}
              </p>
            </div>
          ) : (
            <select name="sessionPassId" required={!editingPending} value={selectedPassId}
              onChange={(e) => setSelectedPassId(e.target.value)} className={inputClass}>
              <option value="">{editingPending ? tt("回数券なし（仮押さえのまま）", "No pass (keep as a hold)") : tt("回数券を選択...", "Choose a pass...")}</option>
              {availablePasses.map((p) => (
                <option key={p.id} value={p.id}>{passLabel(p, lang)}</option>
              ))}
            </select>
          )}
          {passShortage > 0 && selectedPass && (
            <p data-pass-warning="short" className="text-xs text-red-600 font-medium mt-2 flex items-start gap-1 leading-relaxed">
              <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
              <span>
                {tt(`回数券が足りません（残り${selectedPass.remainingCount}回・登録する件数 ${plannedCount}件）。日付の早い${selectedPass.remainingCount}件に回数券を使い、残りの${passShortage}件は「仮押さえ」になります（回数券はまだ使われません）。`,
                  `Not enough sessions (${selectedPass.remainingCount} left, adding ${plannedCount}). The earliest ${selectedPass.remainingCount} use the pass; the other ${passShortage} are saved as holds.`)}
                {!canAddPass && tt("管理者に回数券の追加を頼んでください。", " Ask an admin to add a pass.")}
              </span>
            </p>
          )}
          {canAddPass && (
            <button type="button" onClick={() => setShowAddPass(true)}
              className={cn(
                "mt-2 w-full flex items-center justify-center gap-1.5 rounded-xl text-xs font-semibold py-2.5 transition border",
                noPassAvailable || passShortage > 0
                  ? "bg-amber-500 border-amber-500 text-white hover:bg-amber-600"
                  : "bg-white border-amber-300 text-amber-700 hover:bg-amber-100",
              )}>
              <Plus size={14} /> {tt("回数券を追加する", "Add a pass")}
            </button>
          )}
          {pendingPassId && (
            <p className="text-xs text-amber-700 mt-2 flex items-center gap-1.5"><Spinner size={12} /> {tt("追加した回数券を読み込んでいます…", "Loading the new pass…")}</p>
          )}
        </div>
      )}

      {defaultValues?.id && (
        <div>
          <label className={labelClass}>{tt("ステータス", "Status")}</label>
          <select name="status" defaultValue={defaultValues?.status ?? "scheduled"} className={inputClass}>
            <option value="scheduled">{tt("予定", "Scheduled")}</option>
            <option value="completed">{tt("完了", "Done")}</option>
            <option value="cancelled_same_day">{tt("当日キャンセル（前日21時以降・実施扱い・売上/歩合あり）", "Late cancel (after 9 pm the day before — counted, you get paid)")}</option>
            <option value="cancelled">{tt("キャンセル（白紙）", "Cancelled (not counted)")}</option>
          </select>
        </div>
      )}

      <div>
        <label className={labelClass}><StickyNote size={12} /> {tt("備考", "Notes")}</label>
        <textarea name="note" defaultValue={defaultValues?.note} rows={2}
          placeholder={tt("連絡事項など", "Anything to share")} className={cn(inputClass, "resize-none")} />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onClose}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
          {tt("キャンセル", "Cancel")}
        </button>
        <button type="submit" disabled={locked}
          className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold transition flex items-center justify-center gap-2">
          {locked && <Spinner size={14} />}{locked ? tt("保存中...", "Saving...") : submitLabel}
        </button>
      </div>
      {onDelete && (
        <button type="button" onClick={handleDelete} disabled={locked}
          className="w-full mt-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 transition disabled:opacity-50">
          {locked ? <Spinner size={15} /> : <Trash2 size={15} />} {locked ? tt("削除中…", "Deleting…") : tt("このレッスンを削除", "Delete this lesson")}
        </button>
      )}

      {/* その場で回数券を足す窓。フォームの中にフォームは置けないので、画面のいちばん外（body）に出す。
          クリックがこのフォームや外側の窓の「閉じる」に伝わらないよう、ここで止める。 */}
      {showAddPass && canAddPass && createPortal(
        <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center"
          onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddPass(false)} />
          <div role="dialog" aria-modal="true" aria-label={tt("回数券を追加", "Add a pass")}
            className="relative w-full md:max-w-md bg-white rounded-t-3xl md:rounded-2xl p-4 pb-8 md:pb-4 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5"><Ticket size={15} className="text-amber-500" /> {tt("回数券を追加", "Add a pass")}</p>
              <button type="button" onClick={() => setShowAddPass(false)} className="p-1.5 text-gray-400 hover:text-gray-600" aria-label={tt("閉じる", "Close")}><X size={18} /></button>
            </div>
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">
              {customers.find((c) => c.id === selectedCustomerId)?.fullName ?? ""}{tt(" 様の回数券。追加すると、このレッスンにそのまま使えます（入力中の内容は消えません）。", " — once added, it is used for this lesson (what you entered stays).")}
            </p>
            <SessionPassForm
              customerId={selectedCustomerId}
              onClose={() => setShowAddPass(false)}
              onCreated={(id) => setPendingPassId(id)}
            />
          </div>
        </div>,
        document.body,
      )}
    </form>
  );
}


// ─── 回数券セクション（閲覧のみ） ────────────────────
function SessionPassSection({ passes }: { passes: SessionPass[] }) {
  const lang = useLang();
  const tt = makeT(lang);
  return (
    <div className="py-3 border-t border-gray-100">
      <p className="text-xs font-bold text-gray-500 flex items-center gap-1.5 mb-2">
        <Ticket size={11} /> {tt("回数券", "Session passes")}
      </p>
      {passes.length === 0 ? (
        <p className="text-xs text-gray-400">{tt("回数券なし（顧客マスタから追加できます）", "No passes")}</p>
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
                <span className="font-semibold">{tt(`${pass.totalCount}回券`, `${pass.totalCount}-session pass`)}</span>
                <span className="ml-2 text-gray-500">{tt(`${pass.totalCount - pass.remainingCount}/${pass.totalCount}回 消化`, `${pass.totalCount - pass.remainingCount}/${pass.totalCount} used`)}</span>
                <span className={cn(
                  "ml-2 font-bold",
                  pass.remainingCount === 0 ? "text-gray-400" :
                  pass.remainingCount <= 2  ? "text-red-600"  : "text-amber-700"
                )}>
                  {tt(`残り${pass.remainingCount}回`, `${pass.remainingCount} left`)}
                </span>
                {pass.remainingCount === 0 && <span className="ml-1 text-gray-400">{tt("（使い切り）", "(used up)")}</span>}
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
function LessonItem({ lesson, customers, members, sessionPasses, customerPlans, allLessons, rentalGyms, stores, fctStores, avenirStores, venueFees, isAdmin, currentMemberId }: {
  lesson: Lesson; customers: Customer[]; members: Member[]; sessionPasses: SessionPass[];
  customerPlans: CustomerPlanRecord[]; allLessons: Lesson[]; rentalGyms: RentalGym[]; stores: Store[]; fctStores: FctStore[];
  avenirStores: AvenirStore[];
  venueFees: CustomerVenueFee[]; isAdmin: boolean; currentMemberId?: string;
}) {
  const lang = useLang();
  const tt = makeT(lang);
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const { locked: deleting, run: runDelete } = useSubmitLock();
  const boundUpdate = updateLessonAction.bind(null, lesson.id);
  // 編集/削除は管理者 or 追加した本人のみ
  const canEdit = isAdmin || (!!lesson.createdById && lesson.createdById === currentMemberId);

  const scheduledDate = new Date(lesson.scheduledAt);
  const dateStr = scheduledDate.toLocaleDateString(dateLocale(lang), { month: "numeric", day: "numeric", weekday: "short", timeZone: "Asia/Tokyo" });
  const timeStr = scheduledDate.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" });
  const endTimeStr = lesson.endAt
    ? new Date(lesson.endAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" })
    : undefined;

  const linkedPass = lesson.sessionPassId ? sessionPasses.find((p) => p.id === lesson.sessionPassId) : undefined;
  // この回数券レッスンが何回目か。キャンセルした回は消費しないので数に入らない（0になる）
  // （スケジュール画面と同じ passUsageOrdinals を使い、画面ごとに回数がズレないようにする）
  const passLessons = linkedPass ? allLessons.filter((l) => l.sessionPassId === linkedPass.id) : [];
  const ordinals = linkedPass ? passUsageOrdinals(passLessons) : new Map<string, number>();
  const sessionNumber = ordinals.get(lesson.id) ?? 0;
  // キャンセルした回（消化しない回）は、それより前に消化した回数で数える。
  // 前は 0回目として扱い「残り36回」と券を買ったときの数字に戻って見えていた（2026-11-12）。
  const usedBefore = sessionNumber > 0 ? sessionNumber : passLessons.filter((l) => {
    if (!ordinals.has(l.id)) return false;
    const a = new Date(l.scheduledAt).getTime(), b = scheduledDate.getTime();
    return a < b || (a === b && l.createdAt < lesson.createdAt);
  }).length;
  // 「この回を消化した時点での残り」。回数券の現在の残数をそのまま出すと、過去の回にも同じ数字が
  // 並び、消化済みなのに「残り1回」のように見えてしまうため、回数から逆算する。
  const remainingAfter = linkedPass ? linkedPass.totalCount - usedBefore : 0;
  const overConsumed = sessionNumber > 0 && !!linkedPass && sessionNumber > linkedPass.totalCount;

  if (editing) return (
    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 my-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-gray-700">{tt("レッスンを編集", "Edit lesson")}</p>
        <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
      </div>
      <LessonForm isAdmin={isAdmin} defaultValues={lesson} customers={customers} members={members} sessionPasses={sessionPasses}
        customerPlans={customerPlans} allLessons={allLessons} rentalGyms={rentalGyms} stores={stores} fctStores={fctStores} avenirStores={avenirStores} venueFees={venueFees}
        fixedCustomerId={lesson.customerId} onClose={() => setEditing(false)}
        action={boundUpdate} submitLabel={tt("保存する", "Save")} />
    </div>
  );

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="w-16 flex-shrink-0 text-center">
        <p className="text-xs font-semibold text-gray-900">{dateStr}</p>
        <p className="text-xs text-gray-400">{timeStr}{endTimeStr ? `〜${endTimeStr}` : ""}</p>
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
            {lesson.trainerMemberName ?? tt("担当未設定", "No trainer")}
          </p>
          {lesson.location && (
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <MapPin size={10} className="flex-shrink-0" />{lesson.location}
            </p>
          )}
        </div>
        {linkedPass && (
          // 1行の文として流す（前は flex で文字の切れ端ごとに箱になり、狭い画面で「36／回／券」と縦に割れていた）
          <p className={cn("text-xs mt-0.5", overConsumed ? "text-red-600" : "text-amber-600")}>
            <Ticket size={10} className="inline-block align-[-1px] mr-1" />
            <span className="whitespace-nowrap">{tt(`${linkedPass.totalCount}回券`, `${linkedPass.totalCount}-session pass`)}</span>
            {sessionNumber > 0 && <span className="font-semibold whitespace-nowrap">{tt(`の${sessionNumber}回目`, ` · #${sessionNumber}`)}</span>}
            {sessionNumber === 0 && <span className="whitespace-nowrap">{tt("・消化なし", " · not used")}</span>}
            <span className="whitespace-nowrap">{overConsumed ? tt("・回数超過", " · over the limit") : tt(`・残り${remainingAfter}回`, ` · ${remainingAfter} left`)}</span>
          </p>
        )}
        {isPassPendingLesson(lesson) && (
          // 仮押さえ：コースは回数券だが、回数券がまだ付いていない（回数券は減っていない）
          <p className="text-xs mt-0.5 text-red-600 font-semibold">
            <AlertTriangle size={10} className="inline-block align-[-1px] mr-1" />
            {lesson.status === "scheduled" ? tt("仮押さえ（回数券がありません）", "Hold (no session pass)") : tt("回数券がありません", "No session pass")}
          </p>
        )}
        {lesson.note && <p className="text-xs text-gray-400 mt-0.5 truncate">{lesson.note}</p>}
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
          <button onClick={() => {
            if (deleting) return;
            if (!confirm(tt("このレッスンを削除しますか？", "Delete this lesson?"))) return;
            runDelete(async () => {
              try { assertActionOk(await deleteLessonAction(lesson.id)); router.refresh(); }
              catch (e) { alert(e instanceof Error ? e.message : tt("削除に失敗しました", "Could not delete")); }
            });
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
/** その顧客の体験レッスン。編集は体験レッスン管理で行うので、ここは見るだけ。 */
function TrialSection({ trials }: { trials: TrialLesson[] }) {
  const lang = useLang();
  const tt = makeT(lang);
  if (trials.length === 0) return null;
  const sorted = [...trials].sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
  return (
    <div className="py-3 border-t border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
          <FlaskConical size={12} className="text-purple-500" /> {tt("体験レッスン", "Trial lessons")}
        </p>
        <Link href="/lessons/trial" className="text-xs text-blue-600 hover:underline">{tt("体験レッスン管理 →", "Trial lessons →")}</Link>
      </div>
      <div className="space-y-1.5">
        {sorted.map((t) => (
          <div key={t.id} className="flex items-center gap-2 text-xs">
            <span className="text-gray-500 w-20 flex-shrink-0">{t.scheduledAt.slice(0, 10).replace(/-/g, "/")}</span>
            <span className={cn(
              "px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0",
              t.status === "completed" ? "bg-green-100 text-green-700" :
              t.status === "cancelled" ? "bg-gray-100 text-gray-500" : "bg-blue-100 text-blue-700",
            )}>
              {t.status === "completed" ? tt("完了", "Done") : t.status === "cancelled" ? tt("キャンセル", "Cancelled") : tt("予定", "Scheduled")}
            </span>
            {t.status === "completed" && (
              <span className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0",
                t.contracted === true ? "bg-blue-50 text-blue-700" :
                t.contracted === false ? "bg-gray-50 text-gray-500" : "bg-amber-50 text-amber-700",
              )}>
                {t.contracted === true ? tt("成約", "Signed up") : t.contracted === false ? tt("不成立", "Not signed") : tt("結果未入力", "No result yet")}
              </span>
            )}
            <span className="text-gray-400 truncate">{t.trainerMemberName ?? ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CustomerGroup({ customer, lessons, trialLessons, sessionPasses, customerPlans, allLessons, customers, members, rentalGyms, stores, fctStores, avenirStores, venueFees, isAdmin, currentMemberId }: {
  customer: Customer;
  lessons: Lesson[];
  sessionPasses: SessionPass[];
  customerPlans: CustomerPlanRecord[];
  allLessons: Lesson[];
  customers: Customer[];
  members: Member[];
  rentalGyms: RentalGym[];
  fctStores: FctStore[];
  avenirStores: AvenirStore[];
  trialLessons: TrialLesson[];
  venueFees: CustomerVenueFee[];
  stores: Store[];
  isAdmin: boolean;
  currentMemberId?: string;
}) {
  const lang = useLang();
  const tt = makeT(lang);
  const [expanded, setExpanded] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const hasUnassigned = lessons.some((l) => !l.trainerMemberId);
  const scheduledCount = lessons.filter((l) => l.status === "scheduled").length;
  const customerPasses = sessionPasses.filter((p) => p.customerId === customer.id);

  // 月ごとにグルーピング（lessons は新しい順ソート済みなので、そのまま先頭から束ねる）
  const monthGroups = useMemo(() => {
    const map = new Map<string, Lesson[]>();
    for (const l of lessons) {
      const label = monthLabel(l.scheduledAt, lang);
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(l);
    }
    return Array.from(map.entries()).map(([label, ls]) => ({ label, lessons: ls }));
  }, [lessons, lang]);
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
                <AlertTriangle size={10} /> {tt("担当未設定", "No trainer")}
              </span>
            )}
            {lowPassCount && (
              <span className="inline-flex items-center gap-1 text-xs text-red-500 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full font-medium">
                <Ticket size={10} /> {tt("回数券残りわずか", "Pass almost used up")}
              </span>
            )}
            {exhaustedPass && !lowPassCount && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full font-medium">
                <Ticket size={10} /> {tt("回数券使い切り", "Pass used up")}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {tt(`${lessons.length}件`, `${lessons.length} lessons`)}{scheduledCount > 0 && tt(`（予定 ${scheduledCount}件）`, ` (${scheduledCount} upcoming)`)}
            {trialLessons.length > 0 && tt(`　体験 ${trialLessons.length}件`, `  ${trialLessons.length} trial`)}
            {customerPasses.length > 0 && tt(`　回数券: ${customerPasses.reduce((s, p) => s + p.remainingCount, 0)}回残`, `  Pass: ${customerPasses.reduce((s, p) => s + p.remainingCount, 0)} left`)}
          </p>
        </div>
        <div className="flex-shrink-0 text-gray-400">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4">
          {/* レッスン一覧（月ごとのアコーディオンでかためて表示・直近月だけ初期展開） */}
          {monthGroups.map((g, i) => (
            <LessonMonthGroup key={g.label} label={g.label} lessons={g.lessons} defaultOpen={i === 0}
              customers={customers} members={members} sessionPasses={sessionPasses}
              customerPlans={customerPlans} allLessons={allLessons} rentalGyms={rentalGyms} stores={stores} fctStores={fctStores} avenirStores={avenirStores} venueFees={venueFees}
              isAdmin={isAdmin} currentMemberId={currentMemberId} />
          ))}

          {showAdd ? (
            <div className="py-3">
              <LessonForm isAdmin={isAdmin} customers={customers} members={members} sessionPasses={sessionPasses}
                customerPlans={customerPlans} allLessons={allLessons} rentalGyms={rentalGyms} stores={stores} fctStores={fctStores} avenirStores={avenirStores} venueFees={venueFees}
                fixedCustomerId={customer.id} onClose={() => setShowAdd(false)}
                action={createLessonAction} multiAction={createLessonsAction} submitLabel={tt("追加する", "Add")} />
            </div>
          ) : (
            <div className="py-2">
              <button onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium">
                <Plus size={13} /> {tt("レッスンを追加", "Add lesson")}
              </button>
            </div>
          )}

          {/* 体験レッスン（閲覧のみ。編集は体験レッスン管理で） */}
          <TrialSection trials={trialLessons} />

          {/* 回数券セクション（閲覧のみ） */}
          <SessionPassSection passes={customerPasses} />
        </div>
      )}
    </div>
  );
}

// ─── メインコンポーネント ─────────────────────────────
export function RegularLessonsClient({ lessons, trialLessons = [], customers, members, sessionPasses, customerPlans, rentalGyms = [], stores = [], fctStores = [], avenirStores = [], venueFees = [], isAdmin, currentMemberId, initialSearch = "" }: {
  lessons: Lesson[]; trialLessons?: TrialLesson[]; customers: Customer[]; members: Member[];
  sessionPasses: SessionPass[]; customerPlans: CustomerPlanRecord[]; rentalGyms?: RentalGym[]; stores?: Store[]; fctStores?: FctStore[];
  avenirStores?: AvenirStore[];
  venueFees?: CustomerVenueFee[]; isAdmin: boolean; currentMemberId?: string;
  initialSearch?: string;
}) {
  const lang = useLang();
  const tt = makeT(lang);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState(initialSearch);

  // 顧客ごとにまとめる。体験しか無い顧客（初回のお客さん）も出す
  const grouped = useMemo(() => {
    const map = new Map<string, { customer: Customer; lessons: Lesson[]; trials: TrialLesson[] }>();
    const ensure = (customerId: string) => {
      if (!map.has(customerId)) {
        const customer = customers.find((c) => c.id === customerId);
        if (customer) map.set(customerId, { customer, lessons: [], trials: [] });
      }
      return map.get(customerId);
    };
    lessons.forEach((l) => { ensure(l.customerId)?.lessons.push(l); });
    trialLessons.forEach((t) => { ensure(t.customerId)?.trials.push(t); });
    map.forEach((g) => {
      g.lessons.sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
      g.trials.sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
    });
    // 直近のレッスン（体験も含む）がある顧客ほど上に来るよう並べる
    const latest = (g: { lessons: Lesson[]; trials: TrialLesson[] }) =>
      [g.lessons[0]?.scheduledAt, g.trials[0]?.scheduledAt].filter(Boolean).sort().reverse()[0] ?? "";
    return Array.from(map.values()).sort((a, b) => latest(b).localeCompare(latest(a)));
  }, [lessons, trialLessons, customers]);

  const filtered = grouped.filter(({ customer }) => {
    const q = search.toLowerCase();
    return !q || customer.fullName.toLowerCase().includes(q);
  });

  const totalUnassigned = grouped.reduce(
    (acc, { lessons: ls }) => acc + ls.filter((l) => !l.trainerMemberId).length, 0
  );

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <PageTitle
        title={tt("通常レッスン", "Lessons")}
        sub={
          <span className="flex items-center gap-3">
            <span>{tt(`${lessons.length}件`, `${lessons.length} lessons`)}</span>
            {totalUnassigned > 0 && (
              <span className="text-amber-600 flex items-center gap-1 font-medium">
                <AlertTriangle size={11} /> {tt(`担当未設定 ${totalUnassigned}件`, `${totalUnassigned} without trainer`)}
              </span>
            )}
          </span>
        }
        right={
          <button onClick={() => setShowAdd(true)}
            className="hidden md:flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition">
            <Plus size={16} /> {tt("レッスンを追加", "Add lesson")}
          </button>
        }
      />

      <div className="mb-4 relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={tt("顧客名で検索...", "Search by client name...")}
          className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {showAdd && (
        <div className="hidden md:block bg-white rounded-2xl border-2 border-blue-400 p-5 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-900">{tt("レッスンを追加", "Add lesson")}</p>
            <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <LessonForm isAdmin={isAdmin} customers={customers} members={members} sessionPasses={sessionPasses}
            customerPlans={customerPlans} allLessons={lessons} rentalGyms={rentalGyms} stores={stores} fctStores={fctStores} avenirStores={avenirStores} venueFees={venueFees}
            onClose={() => setShowAdd(false)} action={createLessonAction} multiAction={createLessonsAction} submitLabel={tt("追加する", "Add")} />
        </div>
      )}

      {grouped.length === 0 && !showAdd ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🏋️</p>
          <p className="text-sm font-semibold text-gray-600">{tt("レッスンが登録されていません", "No lessons yet")}</p>
          <button onClick={() => setShowAdd(true)}
            className="mt-5 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition">
            <Plus size={15} /> {tt("レッスンを追加", "Add lesson")}
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">{tt("該当する顧客が見つかりません", "No matching clients")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(({ customer, lessons: ls, trials }) => (
            <CustomerGroup key={customer.id} customer={customer} lessons={ls} trialLessons={trials}
              sessionPasses={sessionPasses} customerPlans={customerPlans} allLessons={lessons}
              customers={customers} members={members} rentalGyms={rentalGyms} stores={stores} fctStores={fctStores} avenirStores={avenirStores} venueFees={venueFees} isAdmin={isAdmin} currentMemberId={currentMemberId} />
          ))}
        </div>
      )}

      <button onClick={() => setShowAdd(true)}
        className="md:hidden fixed bottom-6 right-4 w-14 h-14 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-full shadow-lg shadow-blue-200 flex items-center justify-center transition z-30"
        aria-label={tt("レッスンを追加", "Add lesson")}>
        <Plus size={26} />
      </button>

      {showAdd && (
        <BottomSheet title={tt("レッスンを追加", "Add lesson")} onClose={() => setShowAdd(false)} scrollable>
          <LessonForm isAdmin={isAdmin} customers={customers} members={members} sessionPasses={sessionPasses}
            customerPlans={customerPlans} allLessons={lessons} rentalGyms={rentalGyms} stores={stores} fctStores={fctStores} avenirStores={avenirStores} venueFees={venueFees}
            onClose={() => setShowAdd(false)} action={createLessonAction} multiAction={createLessonsAction} submitLabel={tt("追加する", "Add")} />
        </BottomSheet>
      )}
    </div>
  );
}

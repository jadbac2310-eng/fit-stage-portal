"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Pencil, Trash2, X, Search, MapPin, Calendar,
  User, StickyNote, CheckCircle, XCircle, Clock, ClipboardList, Building2, Coins, ChevronDown, Mail,
} from "lucide-react";
import { AuthorStamp } from "@/components/ui/author-stamp";
import { TrialLesson, TrialLessonStatus, STATUS_LABEL, TRIAL_COURSE_OPTIONS } from "@/lib/trial-lessons-types";
import type { TrialNoteItem } from "@/lib/trial-note";
import { TRIAL_LESSON_COURSE_NAME, isOnsiteTrialPrice, isStorePairTrialPeriod } from "@/lib/commissions-types";
import { parseTrialNote, isShortNote, looksLikeApplication, joinTrialNote, isPairTrialNote } from "@/lib/trial-note";
import { Customer, isFctCustomer } from "@/lib/customers-types";
import { Member } from "@/lib/members";
import type { RentalGym } from "@/lib/rental-gyms";
import type { Store } from "@/lib/stores";
import type { FctStore } from "@/lib/fct-stores";
import type { AvenirStore } from "@/lib/avenir-stores";
import type { CustomerVenueFee } from "@/lib/customer-venue-fees-types";
import { resolveVenueFee } from "@/lib/customer-venue-fees-types";
import {
  createTrialLessonAction,
  updateTrialLessonAction,
  saveContractResultAction,
  deleteTrialLessonAction,
} from "./actions";
import { DELIVERY_MODE_OPTIONS, venueKindOf, venueKindOptions, venueKindLabel, matchVenueByText, type DeliveryMode, type VenueKind } from "@/lib/lessons-types";
import { cn } from "@/lib/cn";
import { useSubmitLock } from "@/lib/use-submit-lock";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { ConfirmMailSheet, ConfirmedBadge, type TrialConfirmInfo } from "./confirm-mail-sheet";
import { Spinner } from "@/components/ui/spinner";
import { assertActionOk, type ActionResult } from "@/lib/action-result";
import { Confetti } from "@/components/ui/confetti";
import { CustomerPicker } from "@/components/ui/customer-picker";

import { PageTitle } from "@/components/ui/page-title";
import { useLang } from "@/components/i18n/lang-provider";
import { makeT, courseLabel, dateLocale, DELIVERY_MODE_EN, VENUE_KIND_EN } from "@/lib/i18n";
// ─── バッジ ───────────────────────────────────────────
function StatusBadge({ status }: { status: TrialLessonStatus }) {
  const lang = useLang();
  const tt = makeT(lang);
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
      status === "scheduled" ? "bg-blue-100 text-blue-700"  :
      status === "completed" ? "bg-green-100 text-green-700" :
                               "bg-gray-100 text-gray-500"
    )}>
      {status === "scheduled" && <Clock size={10} />}
      {status === "completed" && <CheckCircle size={10} />}
      {status === "cancelled" && <XCircle size={10} />}
      {tt(STATUS_LABEL[status], { scheduled: "Scheduled", completed: "Done", cancelled: "Cancelled" }[status])}
    </span>
  );
}

function ContractBadge({ contracted }: { contracted: boolean | null }) {
  const lang = useLang();
  const tt = makeT(lang);
  if (contracted === null) return null;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
      contracted ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
    )}>
      {contracted ? <CheckCircle size={10} /> : <XCircle size={10} />}
      {contracted ? tt("契約成功", "Signed up") : tt("不成立", "Not signed")}
    </span>
  );
}

// 料金区分バッジ。既定（体験レッスン・金額指定なし）のときは何も出さず、
// 都度などに切り替えた回だけ一覧で分かるようにする。
function CourseBadge({ course, amount, onsitePrice, pair, storePair }: { course?: string; amount?: number; onsitePrice?: boolean; pair?: boolean; storePair?: boolean }) {
  const lang = useLang();
  const tt = makeT(lang);
  const badge = (text: string) => (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
      <Coins size={10} />
      {text}
    </span>
  );
  // 料金区分が「体験レッスン」のままで、この回だけの金額も無い体験（resolveTrialFee が標準の額を返すもの）
  const standard = (!course || course === TRIAL_LESSON_COURSE_NAME) && amount == null;
  // 出張の体験と、店舗のペアの体験は、店舗の1名（6,600円）と金額が違うので、一覧でも分かるようにする
  if (standard && onsitePrice) {
    return badge(pair ? tt("出張の体験（2名）・¥13,500", "On-site trial (2) · ¥13,500") : tt("出張の体験・¥9,900", "On-site trial · ¥9,900"));
  }
  if (standard && storePair) return badge(tt("体験（2名）・¥9,900", "Trial (2) · ¥9,900"));
  if (!course && amount == null) return null;
  return badge(`${courseLabel(course ?? TRIAL_LESSON_COURSE_NAME, lang)}${amount != null ? `・¥${amount.toLocaleString("ja-JP")}` : ""}`);
}

// ─── 備考（申込フォームの回答） ───────────────────────
// 申込フォームからの備考は「ラベル: 値」が6行ほど並び、値には英訳も併記されるため、
// そのまま出すと一覧がテキストの壁になる。項目に分解して英訳を落とし、既定は畳んでおく。
// 項目リスト本体（一覧の折りたたみの中身と、編集画面の読み取り専用表示で共用）
function NoteItems({ items, freeText, className }: {
  items: TrialNoteItem[]; freeText?: string; className?: string;
}) {
  const lang = useLang();
  const tt = makeT(lang);
  return (
    <div className={cn("rounded-xl bg-gray-50 border border-gray-100 px-3 py-2 space-y-1.5 text-xs", className)}>
      {items.map((item, i) => (
        <div key={i}>
          <p className="text-[11px] text-gray-400">{item.label}</p>
          <p className="text-gray-700 leading-snug">{item.value}</p>
        </div>
      ))}
      {freeText && (
        <div>
          <p className="text-[11px] text-gray-400">{tt("メモ", "Memo")}</p>
          <p className="text-gray-700 leading-snug whitespace-pre-wrap">{freeText}</p>
        </div>
      )}
    </div>
  );
}

// 一覧用: 既定は畳んでおき、タップで項目リストを開く
function NoteBlock({ note }: { note?: string }) {
  const lang = useLang();
  const tt = makeT(lang);
  const [open, setOpen] = useState(false);
  if (!note?.trim()) return null;

  // 手入力の短いメモは畳まずそのまま出す（1行なので邪魔にならない）
  if (isShortNote(note)) {
    return (
      <p className="text-xs text-gray-500 flex items-start gap-1.5">
        <StickyNote size={11} className="text-gray-400 flex-shrink-0 mt-0.5" />
        <span className="whitespace-pre-wrap">{note.trim()}</span>
      </p>
    );
  }

  const { items, freeText } = parseTrialNote(note);
  const count = items.length + (freeText ? 1 : 0);

  return (
    <div className="text-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-gray-500 hover:text-blue-600 transition"
      >
        <StickyNote size={11} className="text-gray-400 flex-shrink-0" />
        <span className="font-medium">{tt("申込内容", "Booking form")}{count > 0 && tt(`（${count}項目）`, ` (${count})`)}</span>
        <ChevronDown size={12} className={cn("text-gray-400 transition-transform", open && "rotate-180")} />
      </button>

      {open && <NoteItems items={items} freeText={freeText} className="mt-1.5" />}
    </div>
  );
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

// ─── 体験レッスン作成・編集フォーム ──────────────────
function LessonForm({
  defaultValues, customers, members, rentalGyms = [], stores = [], fctStores = [], avenirStores = [], venueFees = [], isAdmin = false, onClose, action, submitLabel,
}: {
  defaultValues?: Partial<TrialLesson>;
  customers: Customer[];
  members: Member[];
  rentalGyms?: RentalGym[];
  stores?: Store[];
  fctStores?: FctStore[];
  avenirStores?: AvenirStore[];
  /** 顧客ごとの会場料金（マスタの料金の上書き） */
  venueFees?: CustomerVenueFee[];
  /** 金額は管理者だけが入力できる。トレーナーには出さない */
  isAdmin?: boolean;
  onClose: () => void;
  action: (fd: FormData) => Promise<ActionResult | void>;
  submitLabel: string;
}) {
  const lang = useLang();
  const tt = makeT(lang);
  const router = useRouter();
  const { locked: loading, run } = useSubmitLock();
  const [error, setError] = useState("");

  // 場所（通常レッスンと同じ挙動）: レンタルジム/店舗を選ぶと場所名を自動入力し、手入力は不可にする。
  // レンタルジムと店舗は排他（どちらか一方だけ）。
  const [customerId, setCustomerId] = useState(defaultValues?.customerId ?? "");
  const [location, setLocation] = useState(defaultValues?.location ?? "");
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>(defaultValues?.deliveryMode ?? "store");
  // 出張の体験は 9,900円（2026-11-18 以降に登録した分）。新しく作る体験は登録日が今日なので、出張なら 9,900円
  const onsiteTrialPrice = deliveryMode === "onsite"
    && (!defaultValues?.createdAt || isOnsiteTrialPrice({ deliveryMode, createdAt: defaultValues.createdAt }));
  const [rentalGymId, setRentalGymId] = useState(defaultValues?.rentalGymId ?? "");
  const [rentalGymFee, setRentalGymFee] = useState(
    defaultValues?.rentalGymFee != null ? String(defaultValues.rentalGymFee) : ""
  );
  const [storeId, setStoreId] = useState(defaultValues?.storeId ?? "");
  const [storeFee, setStoreFee] = useState(
    defaultValues?.storeFee != null ? String(defaultValues.storeFee) : ""
  );
  const [fctStoreId, setFctStoreId] = useState(defaultValues?.fctStoreId ?? "");
  const [fctStoreFee, setFctStoreFee] = useState(
    defaultValues?.fctStoreFee != null ? String(defaultValues.fctStoreFee) : ""
  );
  const [avenirStoreId, setAvenirStoreId] = useState(defaultValues?.avenirStoreId ?? "");
  const [avenirStoreFee, setAvenirStoreFee] = useState(
    defaultValues?.avenirStoreFee != null ? String(defaultValues.avenirStoreFee) : ""
  );
  const [course, setCourse] = useState(defaultValues?.course ?? TRIAL_LESSON_COURSE_NAME);

  // 備考: 申込フォームの回答（ラベル: 値 が2項目以上）は読み取り専用で見せ、
  // 編集できるのは申し送りメモだけにする。回答をテキストエリアに丸ごと出すと
  // 中身が読めないうえ、うっかり消してしまえるため。
  const originalNote = defaultValues?.note ?? "";
  const isApplication = looksLikeApplication(originalNote);
  const parsedNote = parseTrialNote(originalNote);
  const [memo, setMemo] = useState(isApplication ? parsedNote.freeText : originalNote);
  // メモを触っていなければ原文をそのまま保存する（行の並びまで元のまま保つ）
  const noteToSave = !isApplication
    ? memo
    : memo.trim() === parsedNote.freeText.trim()
      ? originalNote
      : joinTrialNote(parsedNote.structuredText, memo);

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
      setRentalGymFee(String(venueFeeFor(customerId, "gym", id, gym.fee)));
      setLocation(gym.name);
    }
  }

  function onStoreChange(id: string) {
    clearPlaces();
    setStoreId(id);
    const store = stores.find((s) => s.id === id);
    if (store) {
      setStoreFee(String(venueFeeFor(customerId, "store", id, store.fee)));
      setLocation(store.name);
    }
  }

  function onFctStoreChange(id: string) {
    clearPlaces();
    setFctStoreId(id);
    const fct = fctStores.find((f) => f.id === id);
    if (fct) {
      setFctStoreFee(String(venueFeeFor(customerId, "fct", id, fct.fee)));
      setLocation(fct.name);
    }
  }

  function onAvenirStoreChange(id: string) {
    clearPlaces();
    setAvenirStoreId(id);
    const av = avenirStores.find((a) => a.id === id);
    if (av) {
      setAvenirStoreFee(String(venueFeeFor(customerId, "avenir", id, av.fee)));
      setLocation(av.name);
    }
  }

  /** 顧客を選び直したとき、すでに選んでいる会場の料金を引き直す */
  function syncVenueFeeFor(cid: string) {
    if (storeId) {
      const st = stores.find((x) => x.id === storeId);
      if (st) setStoreFee(String(venueFeeFor(cid, "store", st.id, st.fee)));
    }
    if (rentalGymId) {
      const gym = rentalGyms.find((g) => g.id === rentalGymId);
      if (gym) setRentalGymFee(String(venueFeeFor(cid, "gym", gym.id, gym.fee)));
    }
    if (fctStoreId) {
      const fct = fctStores.find((f) => f.id === fctStoreId);
      if (fct) setFctStoreFee(String(venueFeeFor(cid, "fct", fct.id, fct.fee)));
    }
    if (avenirStoreId) {
      const av = avenirStores.find((a) => a.id === avenirStoreId);
      if (av) setAvenirStoreFee(String(venueFeeFor(cid, "avenir", av.id, av.fee)));
    }
  }

  // 会場は上の3つのどれか1つ。全部を1つのプルダウンに並べると数十件が一気に出るので、
  // まず種類を選び、その種類のぶんだけ出す。
  const [venueKind, setVenueKind] = useState<VenueKind>(venueKindOf(defaultValues));
  const venueKinds = venueKindOptions(stores.length, rentalGyms.length, fctStores.length, avenirStores.length);

  function onVenueKindChange(kind: VenueKind) {
    setVenueKind(kind);
    clearPlaces();  // 種類を変えたら選び直し。場所の手入力はそのまま残す
  }

  // 出張はお客さんのところへ行くので会場（店舗・レンタルジム等）を選ばない。
  // 訪問先は場所欄に住所を手で書く（任意）。
  const onsite = deliveryMode === "onsite";
  function onDeliveryModeChange(mode: DeliveryMode) {
    setDeliveryMode(mode);
    if (mode === "onsite") { clearPlaces(); setVenueKind("none"); }
  }

  const locationLocked = !!rentalGymId || !!storeId || !!fctStoreId || !!avenirStoreId;

  /** 会場を選ばずに場所へ会場名を打っていないか（利用料の付け忘れ防止） */
  const venueHint = useMemo(
    () => (locationLocked || deliveryMode === "onsite")
      ? null
      : matchVenueByText(location, { stores, rentalGyms, fctStores, avenirStores }),
    [locationLocked, deliveryMode, location, stores, rentalGyms, fctStores, avenirStores],
  );

  function applyVenue(kind: VenueKind, id: string) {
    setVenueKind(kind);
    if (kind === "gym")         onRentalGymChange(id);
    else if (kind === "fct")    onFctStoreChange(id);
    else if (kind === "avenir") onAvenirStoreChange(id);
    else                        onStoreChange(id);
  }

  async function handleSubmit(fd: FormData) {
    setError("");
    // datetime-local はローカル時刻を返すので、UTC ISO に変換してから送信
    const raw = fd.get("scheduledAt") as string;
    if (raw) fd.set("scheduledAt", localInputToISO(raw));
    await run(async () => {
      try { assertActionOk(await action(fd)); router.refresh(); onClose(); }
      catch (e) { setError(e instanceof Error ? e.message : tt("エラー", "Error")); }
    });
  }

  const inputClass = "w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelClass = "text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5";
  const defaultScheduledAt = defaultValues?.scheduledAt
    ? isoToLocalInput(defaultValues.scheduledAt) : "";

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass}><User size={12} /> {tt("顧客", "Client")} <span className="text-red-500">*</span></label>
        <CustomerPicker
          customers={customers} name="customerId" required value={customerId}
          onChange={(id) => { setCustomerId(id); syncVenueFeeFor(id); }}
        />
      </div>

      <div>
        <label className={labelClass}><User size={12} /> {tt("営業担当者", "Sales")} <span className="text-red-500">*</span></label>
        <select name="salesMemberId" required defaultValue={defaultValues?.salesMemberId ?? ""} className={inputClass}>
          <option value="">{tt("営業担当者を選択...", "Choose sales...")}</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}{m.role ? `（${m.role}）` : ""}</option>)}
        </select>
      </div>

      <div>
        <label className={labelClass}><User size={12} /> {tt("トレーニング担当者", "Trainer")}</label>
        <select name="trainerMemberId" defaultValue={defaultValues?.trainerMemberId ?? ""} className={inputClass}>
          <option value="">{tt("未定", "Not decided")}</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}{m.role ? `（${m.role}）` : ""}</option>)}
        </select>
      </div>

      <div>
        <label className={labelClass}><Calendar size={12} /> {tt("予定日時", "Date & time")} <span className="text-red-500">*</span></label>
        <input name="scheduledAt" type="datetime-local" required defaultValue={defaultScheduledAt} className={inputClass} />
      </div>

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
            onChange={setStoreFee} isAdmin={isAdmin} note={"マスタの料金が初期値です。利益の計算でこの額を差し引きます。"} />
        )}
        {rentalGymId && (
          <VenueFeeField label={tt("レンタルジム代（税込）", "Rental gym fee (incl. tax)")} name="rentalGymFee" value={rentalGymFee}
            onChange={setRentalGymFee} isAdmin={isAdmin} note={"マスタの料金が初期値です。利益の計算でこの額を差し引きます。"} />
        )}
        {fctStoreId && (
          <VenueFeeField label={tt("FCT店舗の利用料（税込）", "FCT venue fee (incl. tax)")} name="fctStoreFee" value={fctStoreFee}
            onChange={setFctStoreFee} isAdmin={isAdmin} note={"マスタの料金が初期値です。利益の計算でこの額を差し引きます。"} />
        )}
        {avenirStoreId && (
          <VenueFeeField label={tt("アヴニール店舗の利用料（税込）", "Avenir venue fee (incl. tax)")} name="avenirStoreFee" value={avenirStoreFee}
            onChange={setAvenirStoreFee} isAdmin={isAdmin} note={"マスタの料金が初期値です。利益の計算でこの額を差し引きます。"} />
        )}
      </div>

      {/* 場所。会場を選んだらその名前で決まるので入力欄は出さない（会場と二重に見えて、
          会場を選ばずに場所へ会場名を打ってしまう＝利用料が引かれない事故を防ぐ）。 */}
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
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={onsite ? tt("住所や施設名（任意）", "Address or building (optional)") : tt("会場マスタに無い場所だけ入力（任意）", "Only for places not in the venue list (optional)")}
              className={inputClass}
            />
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
          </>
        )}
      </div>

      {/* 料金区分。基本は体験レッスンだが、都度料金で実施する場合などに切り替える */}
      <div>
        <label className={labelClass}><Coins size={12} /> {tt("料金区分", "Price type")}</label>
        <select name="course" value={course} onChange={(e) => setCourse(e.target.value)} className={inputClass}>
          {TRIAL_COURSE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{lang === "en" ? courseLabel(o.value, lang) : o.label}</option>)}
        </select>
        <p className="text-xs text-gray-400 mt-1">
          {course !== TRIAL_LESSON_COURSE_NAME
            ? tt(`売上・歩合・請求は「${course}」の単価で計上されます。`, `Sales, pay and invoice use the "${courseLabel(course, lang)}" price.`)
            : onsiteTrialPrice
              ? tt("通常はこのまま。出張の体験は 1名 9,900円、2名は 13,500円で計上されます（2名のときは備考に「利用人数: 2名」と書いてください。店舗の体験は 6,600円）。", "Usually leave as is. On-site trial is ¥9,900 for 1 person, ¥13,500 for 2 (for 2 people, write 「利用人数: 2名」 in the notes). Studio trial is ¥6,600.")
              : tt("通常はこのまま。売上・歩合・請求は体験レッスンの単価で計上されます（店舗は 1名 6,600円。2名は 9,900円で、備考に「利用人数: 2名」と書いてください）。", "Usually leave as is. The trial price is used (studio: ¥6,600 for 1 person, ¥9,900 for 2 — for 2 people, write 「利用人数: 2名」 in the notes).")}
        </p>
      </div>

      {/* 金額はトレーナーには触らせない。編集で消えないよう、今の値はそのまま持っておく */}
      {isAdmin ? (
        <div>
          <label className={labelClass}><Coins size={12} /> 金額（この回だけ）</label>
          <input name="amount" type="number" min="0" inputMode="numeric"
            defaultValue={defaultValues?.amount ?? ""} placeholder="空欄なら料金区分の単価"
            className={inputClass} />
          <p className="text-xs text-gray-400 mt-1">いつもと違う金額のときだけ入力してください。</p>
        </div>
      ) : (
        <input type="hidden" name="amount" defaultValue={defaultValues?.amount ?? ""} />
      )}

      {/* 申込フォームの回答（読み取り専用）。編集できるのは下のメモだけ */}
      {isApplication && (
        <div>
          <label className={labelClass}><ClipboardList size={12} /> {tt(`申込内容（${parsedNote.items.length}項目）`, `Booking form (${parsedNote.items.length})`)}</label>
          <NoteItems items={parsedNote.items} />
          <p className="text-xs text-gray-400 mt-1">{tt("申込フォームの回答です。編集せずそのまま保存されます。", "Answers from the booking form. Saved as is.")}</p>
        </div>
      )}

      <div>
        <label className={labelClass}><StickyNote size={12} /> {isApplication ? tt("メモ（申し送り）", "Memo (handover)") : tt("備考", "Notes")}</label>
        {/* 保存する備考は「申込内容の原文 ＋ メモ」を組み立てたもの */}
        <input type="hidden" name="note" value={noteToSave} />
        <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={3}
          placeholder={isApplication ? tt("当日の申し送りなど...", "Notes for the day...") : tt("第2希望日時、申し送りなど...", "Second choice time, notes...")}
          className={cn(inputClass, "resize-none")} />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">{tt("キャンセル", "Cancel")}</button>
        <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold transition flex items-center justify-center gap-2">
          {loading && <Spinner size={14} />}{loading ? tt("保存中...", "Saving...") : submitLabel}
        </button>
      </div>
    </form>
  );
}

// ─── 契約結果フォーム ─────────────────────────────────
// 体験レッスンの成約結果を記録する（種目ログ等のレポートはレポート管理画面で扱う）。
function ContractResultForm({
  lesson, onClose,
}: {
  lesson: TrialLesson;
  onClose: () => void;
}) {
  const lang = useLang();
  const tt = makeT(lang);
  const router = useRouter();
  const { locked: loading, run } = useSubmitLock();
  const [contracted, setContracted] = useState<string>(
    lesson.contracted === true ? "true" : lesson.contracted === false ? "false" : "null"
  );
  const [error, setError] = useState("");
  // 成約を記録した瞬間だけ紙吹雪を出す。いちばん気持ちいいところなので盛る。
  const [celebrate, setCelebrate] = useState(false);
  const boundSave = saveContractResultAction.bind(null, lesson.id);

  async function handleSubmit(fd: FormData) {
    setError("");
    await run(async () => {
      try {
        assertActionOk(await boundSave(fd));
        router.refresh();
        // もともと成約だったものを編集しただけのときは出さない
        if (contracted === "true" && lesson.contracted !== true) {
          setCelebrate(true);
          setTimeout(onClose, 2600);
        } else {
          onClose();
        }
      } catch (e) { setError(e instanceof Error ? e.message : tt("エラー", "Error")); }
    });
  }

  const inputClass = "w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelClass = "text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5";

  if (celebrate) {
    return (
      <div className="py-8 text-center">
        <Confetti />
        <p className="text-4xl">🎉</p>
        <p className="mt-3 text-lg font-bold text-gray-900">{tt("成約おめでとうございます！", "Congratulations on the sign-up!")}</p>
        <p className="mt-1 text-sm text-gray-500">{tt(`${lesson.customerName} さん`, lesson.customerName)}</p>
        <p className="mt-3 text-xs text-gray-400">{tt("みんなのLINEにもお知らせしました。", "The team was told on LINE.")}</p>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700 font-medium">
        {tt("記録するとステータスが「完了」になります", "Saving this marks the trial as Done")}
      </div>

      <div>
        <label className={labelClass}>{tt("契約結果", "Result")}</label>
        <select name="contracted" value={contracted} onChange={(e) => setContracted(e.target.value)} className={inputClass}>
          <option value="null">{tt("未確定", "Not decided")}</option>
          <option value="true">{tt("契約成功", "Signed up")}</option>
          <option value="false">{tt("不成立", "Not signed")}</option>
        </select>
      </div>

      <div>
        <label className={labelClass}><StickyNote size={12} /> {tt("備考", "Notes")}</label>
        <textarea name="note" defaultValue={lesson.note} rows={2}
          placeholder={tt("次回アクション、申し送りなど...", "Next step, notes...")}
          className={cn(inputClass, "resize-none")} />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">{tt("キャンセル", "Cancel")}</button>
        <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-semibold transition flex items-center justify-center gap-2">
          {loading && <Spinner size={14} />}{loading ? tt("記録中...", "Saving...") : tt("契約結果を記録", "Save result")}
        </button>
      </div>
    </form>
  );
}

// ─── テーブル行 ───────────────────────────────────────
function LessonRow({ lesson, customers, members, rentalGyms, stores, fctStores, avenirStores, venueFees, isAdmin, currentMemberId, openReportId, mailFrom = null, mailSent, confirmState }: {
  lesson: TrialLesson; customers: Customer[]; members: Member[];
  rentalGyms: RentalGym[]; stores: Store[]; fctStores: FctStore[];
  avenirStores: AvenirStore[];
  venueFees: CustomerVenueFee[];
  isAdmin: boolean; currentMemberId?: string; openReportId?: string;
  mailFrom?: string | null; mailSent?: { at: string; by?: string }; confirmState?: TrialConfirmInfo;
}) {
  const lang = useLang();
  const tt = makeT(lang);
  const [mode, setMode] = useState<"view" | "edit" | "report">(lesson.id === openReportId ? "report" : "view");
  const [mailOpen, setMailOpen] = useState(false);
  const mailSheet = mailOpen ? (
    <ConfirmMailSheet lesson={lesson} mailFrom={mailFrom} sent={mailSent} confirmState={confirmState}
      email={customers.find((c) => c.id === lesson.customerId)?.email}
      storeName={stores.find((st) => st.id === lesson.storeId)?.name}
      onClose={() => setMailOpen(false)} />
  ) : null;
  const router = useRouter();
  const { locked: deleting, run: runDelete } = useSubmitLock();
  const boundUpdate = updateTrialLessonAction.bind(null, lesson.id);
  // 契約結果は管理者・担当トレーナー・担当営業が記録できる
  const canRecordResult = isAdmin
    || (!!currentMemberId && (lesson.trainerMemberId === currentMemberId || lesson.salesMemberId === currentMemberId));

  const scheduledDate = new Date(lesson.scheduledAt);
  const dateStr = scheduledDate.toLocaleDateString(dateLocale(lang), { month: "numeric", day: "numeric", weekday: "short", timeZone: "Asia/Tokyo" });
  const timeStr = scheduledDate.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" });

  if (mode === "edit") return (
    <tr><td colSpan={7} className="px-4 py-3">
      <div className="bg-white rounded-2xl border-2 border-blue-400 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-gray-900">{tt("体験レッスンを編集", "Edit trial lesson")}</p>
          <button onClick={() => setMode("view")} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <LessonForm isAdmin={isAdmin} defaultValues={lesson} customers={customers} members={members} rentalGyms={rentalGyms} stores={stores} fctStores={fctStores} avenirStores={avenirStores} venueFees={venueFees}
          onClose={() => setMode("view")} action={boundUpdate} submitLabel={tt("保存する", "Save")} />
      </div>
    </td></tr>
  );

  if (mode === "report") return (
    <tr><td colSpan={7} className="px-4 py-3">
      <div className="bg-white rounded-2xl border-2 border-green-400 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-gray-900">
            {tt("契約結果", "Result")} — {lesson.customerName}
          </p>
          <button onClick={() => setMode("view")} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <ContractResultForm lesson={lesson} onClose={() => setMode("view")} />
      </div>
    </td></tr>
  );

  return (
    <tr className="hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
      <td className="px-4 py-3">
        <p className="text-xs font-semibold text-gray-900">{dateStr}</p>
        <p className="text-xs text-gray-400">{timeStr}</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-sm font-semibold text-gray-900">{lesson.customerName}</p>
        <div className="mt-1"><NoteBlock note={lesson.note} /></div>
        <AuthorStamp
          createdByName={members.find((m) => m.id === lesson.createdById)?.name}
          createdAt={lesson.createdAt}
          updatedByName={members.find((m) => m.id === lesson.updatedById)?.name}
          updatedAt={lesson.updatedAt}
          className="mt-1"
        />
      </td>
      <td className="px-4 py-3">
        <p className="text-xs text-gray-600">{lesson.salesMemberName || <span className="text-gray-300">{tt("未割当", "Not set")}</span>}</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-xs text-gray-600">{lesson.trainerMemberName ?? <span className="text-gray-300">—</span>}</p>
      </td>
      <td className="px-4 py-3">
        {lesson.location
          ? <p className="text-xs text-gray-600 flex items-center gap-1"><MapPin size={10} className="flex-shrink-0" />{lesson.location}</p>
          : <span className="text-xs text-gray-300">—</span>}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1">
          <StatusBadge status={lesson.status} />
          <ContractBadge contracted={lesson.contracted} />
          <CourseBadge course={lesson.course} amount={lesson.amount} onsitePrice={isOnsiteTrialPrice(lesson)} pair={isPairTrialNote(lesson.note)}
            storePair={isStorePairTrialPeriod(lesson) && isPairTrialNote(lesson.note)} />
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 justify-end">
          {canRecordResult && lesson.status === "scheduled" && (
            <button onClick={() => setMailOpen(true)}
              className={cn(
                "flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition border",
                mailSent
                  ? "text-gray-600 bg-gray-50 hover:bg-blue-50 border-gray-200 hover:border-blue-300 hover:text-blue-600"
                  : "text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-300"
              )}>
              <Mail size={11} />
              {mailSent ? tt("確定メール済", "Email sent") : tt("確定メール", "Confirm email")}
            </button>
          )}
          {lesson.status === "scheduled" && <ConfirmedBadge confirmState={confirmState} sent={!!mailSent} />}
          {canRecordResult && lesson.status !== "cancelled" && (
            <button onClick={() => setMode("report")}
              className={cn(
                "flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition border",
                lesson.contracted === null || lesson.contracted === undefined
                  ? "text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 border-green-300"
                  : "text-gray-600 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 border-gray-200 hover:border-blue-300"
              )}>
              <ClipboardList size={11} />
              {tt("契約結果", "Result")}
            </button>
          )}
          {isAdmin && (
            <>
              <button onClick={() => setMode("edit")}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                <Pencil size={13} />
              </button>
              <button onClick={() => {
                if (deleting) return;
                if (!confirm(tt(`${lesson.customerName} の体験レッスンを削除しますか？`, `Delete the trial lesson for ${lesson.customerName}?`))) return;
                runDelete(async () => {
                  try { assertActionOk(await deleteTrialLessonAction(lesson.id)); router.refresh(); }
                  catch (e) { alert(e instanceof Error ? e.message : tt("削除に失敗しました", "Could not delete")); }
                });
              }} disabled={deleting}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50">
                {deleting ? <Spinner size={13} /> : <Trash2 size={13} />}
              </button>
            </>
          )}
        </div>
        {mailSheet}
      </td>
    </tr>
  );
}

// ─── モバイルカード ───────────────────────────────────
function LessonCard({ lesson, customers, members, rentalGyms, stores, fctStores, avenirStores, venueFees, isAdmin, currentMemberId, openReportId, mailFrom = null, mailSent, confirmState }: {
  lesson: TrialLesson; customers: Customer[]; members: Member[];
  rentalGyms: RentalGym[]; stores: Store[]; fctStores: FctStore[];
  avenirStores: AvenirStore[];
  venueFees: CustomerVenueFee[];
  isAdmin: boolean; currentMemberId?: string; openReportId?: string;
  mailFrom?: string | null; mailSent?: { at: string; by?: string }; confirmState?: TrialConfirmInfo;
}) {
  const lang = useLang();
  const tt = makeT(lang);
  const [mode, setMode] = useState<"view" | "edit" | "report">(lesson.id === openReportId ? "report" : "view");
  const [mailOpen, setMailOpen] = useState(false);
  const mailSheet = mailOpen ? (
    <ConfirmMailSheet lesson={lesson} mailFrom={mailFrom} sent={mailSent} confirmState={confirmState}
      email={customers.find((c) => c.id === lesson.customerId)?.email}
      storeName={stores.find((st) => st.id === lesson.storeId)?.name}
      onClose={() => setMailOpen(false)} />
  ) : null;
  const router = useRouter();
  const { locked: deleting, run: runDelete } = useSubmitLock();
  const boundUpdate = updateTrialLessonAction.bind(null, lesson.id);
  // 契約結果は管理者・担当トレーナー・担当営業が記録できる
  const canRecordResult = isAdmin
    || (!!currentMemberId && (lesson.trainerMemberId === currentMemberId || lesson.salesMemberId === currentMemberId));

  const scheduledDate = new Date(lesson.scheduledAt);
  const dateStr = scheduledDate.toLocaleDateString(dateLocale(lang), { year: "numeric", month: "numeric", day: "numeric", weekday: "short", timeZone: "Asia/Tokyo" });
  const timeStr = scheduledDate.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" });

  if (mode === "edit") return (
    <div className="bg-white rounded-2xl border-2 border-blue-400 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold text-gray-900">{tt("体験レッスンを編集", "Edit trial lesson")}</p>
        <button onClick={() => setMode("view")} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
      </div>
      <LessonForm isAdmin={isAdmin} defaultValues={lesson} customers={customers} members={members} rentalGyms={rentalGyms} stores={stores} fctStores={fctStores} avenirStores={avenirStores} venueFees={venueFees}
        onClose={() => setMode("view")} action={boundUpdate} submitLabel={tt("保存する", "Save")} />
    </div>
  );

  if (mode === "report") return (
    <div className="bg-white rounded-2xl border-2 border-green-400 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold text-gray-900">{tt("契約結果", "Result")} — {lesson.customerName}</p>
        <button onClick={() => setMode("view")} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
      </div>
      <ContractResultForm lesson={lesson} onClose={() => setMode("view")} />
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="text-sm font-bold text-gray-900">{lesson.customerName}</p>
          <p className="text-xs text-gray-500 mt-0.5">{tt("営業", "Sales")}: {lesson.salesMemberName || tt("未割当", "Not set")}</p>
          {lesson.trainerMemberName && <p className="text-xs text-gray-500">TR: {lesson.trainerMemberName}</p>}
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={lesson.status} />
          <ContractBadge contracted={lesson.contracted} />
          <CourseBadge course={lesson.course} amount={lesson.amount} onsitePrice={isOnsiteTrialPrice(lesson)} pair={isPairTrialNote(lesson.note)}
            storePair={isStorePairTrialPeriod(lesson) && isPairTrialNote(lesson.note)} />
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-xs text-gray-600 flex items-center gap-1.5"><Calendar size={11} className="text-gray-400" />{dateStr} {timeStr}</p>
        {lesson.location && <p className="text-xs text-gray-600 flex items-center gap-1.5"><MapPin size={11} className="text-gray-400" />{lesson.location}</p>}
        <NoteBlock note={lesson.note} />
        <AuthorStamp
          createdByName={members.find((m) => m.id === lesson.createdById)?.name}
          createdAt={lesson.createdAt}
          updatedByName={members.find((m) => m.id === lesson.updatedById)?.name}
          updatedAt={lesson.updatedAt}
        />
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
        {canRecordResult && lesson.status === "scheduled" && (
          <button onClick={() => setMailOpen(true)}
            className={cn(
              "flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition border",
              mailSent
                ? "text-gray-600 bg-gray-50 hover:bg-blue-50 border-gray-200 hover:border-blue-300 hover:text-blue-600"
                : "text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-300"
            )}>
            <Mail size={11} />
            {mailSent ? tt("確定メール済", "Email sent") : tt("確定メール", "Confirm email")}
          </button>
        )}
        {lesson.status === "scheduled" && <ConfirmedBadge confirmState={confirmState} sent={!!mailSent} />}
        {canRecordResult && lesson.status !== "cancelled" && (
          <button onClick={() => setMode("report")}
            className={cn(
              "flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition border",
              lesson.contracted === null || lesson.contracted === undefined
                ? "text-green-600 bg-green-50 hover:bg-green-100 border-green-300"
                : "text-gray-600 bg-gray-50 hover:bg-blue-50 border-gray-200 hover:border-blue-300 hover:text-blue-600"
            )}>
            <ClipboardList size={11} />
            {tt("契約結果", "Result")}
          </button>
        )}
        {isAdmin && (
          <>
            <button onClick={() => setMode("edit")}
              className="flex items-center gap-1 text-xs text-gray-600 hover:text-blue-600 font-medium bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 px-2.5 py-1.5 rounded-lg transition">
              <Pencil size={11} /> {tt("編集", "Edit")}
            </button>
            <button onClick={() => {
              if (deleting) return;
              if (!confirm(tt(`${lesson.customerName} の体験レッスンを削除しますか？`, `Delete the trial lesson for ${lesson.customerName}?`))) return;
              runDelete(async () => {
                  try { assertActionOk(await deleteTrialLessonAction(lesson.id)); router.refresh(); }
                  catch (e) { alert(e instanceof Error ? e.message : tt("削除に失敗しました", "Could not delete")); }
                });
            }} disabled={deleting}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium bg-red-50 hover:bg-red-100 border border-red-300 px-2.5 py-1.5 rounded-lg transition">
              {deleting ? <><Spinner size={11} /> {tt("削除中...", "Deleting...")}</> : <><Trash2 size={11} /> {tt("削除", "Delete")}</>}
            </button>
          </>
        )}
      </div>
      {mailSheet}
    </div>
  );
}

// ─── メインコンポーネント ─────────────────────────────
export function TrialLessonsClient({ lessons, customers, members, rentalGyms = [], stores = [], fctStores = [], avenirStores = [], venueFees = [], isAdmin, currentMemberId, initialSearch = "", openReportId, mailFrom = null, mailSent = {}, confirmInfo = {} }: {
  lessons: TrialLesson[]; customers: Customer[]; members: Member[];
  rentalGyms?: RentalGym[]; stores?: Store[]; fctStores?: FctStore[];
  avenirStores?: AvenirStore[];
  venueFees?: CustomerVenueFee[];
  isAdmin: boolean; currentMemberId?: string;
  initialSearch?: string; openReportId?: string;
  mailFrom?: string | null; mailSent?: Record<string, { at: string; by?: string }>; confirmInfo?: Record<string, TrialConfirmInfo>;
}) {
  const lang = useLang();
  const tt = makeT(lang);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState(initialSearch);
  const [filterStatus, setFilterStatus] = useState<TrialLessonStatus | "">("");

  const filtered = lessons.filter((l) => {
    const q = search.toLowerCase();
    const matchSearch = !q || l.customerName.toLowerCase().includes(q) || l.salesMemberName.toLowerCase().includes(q) || (l.trainerMemberName ?? "").toLowerCase().includes(q) || (l.location ?? "").toLowerCase().includes(q);
    const matchStatus = !filterStatus || l.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <PageTitle
        title={tt("体験レッスン", "Trial lessons")}
        sub={tt(`${lessons.length}件`, `${lessons.length} trials`)}
        right={
          <button onClick={() => setShowAdd(true)}
            className="hidden md:flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition">
            <Plus size={16} /> {tt("体験レッスンを追加", "Add trial lesson")}
          </button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={tt("顧客名・担当者・場所で検索...", "Search by client, staff or place...")}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as TrialLessonStatus | "")}
          className="px-3.5 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="">{tt("全ステータス", "All statuses")}</option>
          <option value="scheduled">{tt("予定", "Scheduled")}</option>
          <option value="completed">{tt("完了", "Done")}</option>
          <option value="cancelled">{tt("キャンセル", "Cancelled")}</option>
        </select>
      </div>

      {showAdd && (
        <div className="hidden md:block bg-white rounded-2xl border-2 border-blue-400 p-5 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-900">{tt("体験レッスンを追加", "Add trial lesson")}</p>
            <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <LessonForm isAdmin={isAdmin} customers={customers} members={members} rentalGyms={rentalGyms} stores={stores} fctStores={fctStores} avenirStores={avenirStores} venueFees={venueFees}
            onClose={() => setShowAdd(false)} action={createTrialLessonAction} submitLabel={tt("追加する", "Add")} />
        </div>
      )}

      {lessons.length === 0 && !showAdd ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🗓️</p>
          <p className="text-sm font-semibold text-gray-600">{tt("体験レッスンが登録されていません", "No trial lessons yet")}</p>
          <button onClick={() => setShowAdd(true)}
            className="mt-5 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition">
            <Plus size={15} /> {tt("体験レッスンを追加", "Add trial lesson")}
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">{tt("該当する体験レッスンが見つかりません", "No matching trial lessons")}</p>
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{tt("日時", "Date")}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{tt("顧客", "Client")}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{tt("営業担当", "Sales")}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{tt("トレーナー", "Trainer")}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{tt("場所", "Place")}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{tt("状態", "Status")}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <LessonRow key={l.id} lesson={l} customers={customers} members={members} rentalGyms={rentalGyms} stores={stores} fctStores={fctStores} avenirStores={avenirStores} venueFees={venueFees} isAdmin={isAdmin} currentMemberId={currentMemberId} openReportId={openReportId} mailFrom={mailFrom} mailSent={mailSent[l.id]} confirmState={confirmInfo[l.id]} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-2">
            {filtered.map((l) => (
              <LessonCard key={l.id} lesson={l} customers={customers} members={members} rentalGyms={rentalGyms} stores={stores} fctStores={fctStores} avenirStores={avenirStores} venueFees={venueFees} isAdmin={isAdmin} currentMemberId={currentMemberId} openReportId={openReportId} mailFrom={mailFrom} mailSent={mailSent[l.id]} confirmState={confirmInfo[l.id]} />
            ))}
          </div>
        </>
      )}

      <button onClick={() => setShowAdd(true)}
        className="md:hidden fixed bottom-6 right-4 w-14 h-14 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-full shadow-lg shadow-blue-200 flex items-center justify-center transition z-30"
        aria-label={tt("体験レッスンを追加", "Add trial lesson")}>
        <Plus size={26} />
      </button>

      {showAdd && (
        <BottomSheet title={tt("体験レッスンを追加", "Add trial lesson")} onClose={() => setShowAdd(false)} scrollable>
          <LessonForm isAdmin={isAdmin} customers={customers} members={members} rentalGyms={rentalGyms} stores={stores} fctStores={fctStores} avenirStores={avenirStores} venueFees={venueFees}
            onClose={() => setShowAdd(false)} action={createTrialLessonAction} submitLabel={tt("追加する", "Add")} />
        </BottomSheet>
      )}
    </div>
  );
}

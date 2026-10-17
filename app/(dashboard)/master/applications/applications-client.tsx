"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search, ChevronDown, Trash2, AlertTriangle, Check, RotateCcw,
  Phone, Mail, Copy, ExternalLink,
} from "lucide-react";
import {
  MembershipApplication, ApplicationStatus,
  APPLICATION_STATUS_LABEL, hasHealthFlag,
} from "@/lib/membership-applications-types";
import { setApplicationStatusAction, deleteApplicationAction } from "./actions";
import { cn } from "@/lib/cn";
import { useSubmitLock } from "@/lib/use-submit-lock";
import { Spinner } from "@/components/ui/spinner";

// ─── 表示の小物 ───────────────────────────────────────
function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function fmtDate(v?: string) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

/** 生年月日から満年齢。入会資格（18歳以上）の確認にそのまま使う */
function age(dateOfBirth?: string): number | null {
  if (!dateOfBirth) return null;
  const d = new Date(dateOfBirth);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a -= 1;
  return a;
}

const STATUS_OPTIONS: ApplicationStatus[] = ["new", "done"];

function StatusSelect({ id, status }: { id: string; status: ApplicationStatus }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(status);
  const { locked, run } = useSubmitLock();

  async function handleChange(next: ApplicationStatus) {
    if (next === current) { setOpen(false); return; }
    await run(async () => {
      await setApplicationStatusAction(id, next);
      router.refresh();
      setCurrent(next);
      setOpen(false);
    });
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        disabled={locked}
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition hover:opacity-80 disabled:opacity-60",
          current === "new" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500"
        )}
      >
        {locked ? <Spinner size={10} /> : APPLICATION_STATUS_LABEL[current]}
        <ChevronDown size={10} className="flex-shrink-0" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-28">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={(e) => { e.stopPropagation(); handleChange(s); }}
                className={cn(
                  "w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2",
                  s === current && "font-semibold"
                )}
              >
                {s === "new" ? <RotateCcw size={11} className="text-yellow-500" /> : <Check size={11} className="text-gray-400" />}
                {APPLICATION_STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** 項目1行。値が空なら「—」を出して、聞き漏れと空欄の区別をつける */
function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex gap-3 py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500 w-28 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-900 break-words min-w-0">{value && value !== "" ? value : "—"}</span>
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        });
      }}
      className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 transition"
    >
      {done ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
      {done ? "コピーしました" : label}
    </button>
  );
}

// ─── 明細 ─────────────────────────────────────────────
function Detail({ a, isAdmin }: { a: MembershipApplication; isAdmin: boolean }) {
  const router = useRouter();
  const { locked, run } = useSubmitLock();
  const [confirming, setConfirming] = useState(false);
  const years = age(a.dateOfBirth);

  const healthLines = [
    a.healthCondition ? `持病・通院: ${a.healthCondition}` : null,
    a.healthMedicine  ? `服薬: ${a.healthMedicine}` : null,
    a.healthInjury    ? `過去のケガ・手術: ${a.healthInjury}` : null,
    a.healthMaternity ? "妊娠中・産後1年以内" : null,
  ].filter(Boolean) as string[];

  return (
    <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/60">
      {hasHealthFlag(a) && (
        <div className="flex items-start gap-2 mb-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200">
          <AlertTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            健康状態に申告があります。初回セッションの前に、内容を口頭で伺ってください。
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-x-6">
        <div>
          <p className="text-[11px] font-semibold text-gray-400 tracking-wide mb-1">お客さま</p>
          <Row label="お名前" value={a.fullName} />
          <Row label="フリガナ" value={a.fullNameKana} />
          <Row label="生年月日" value={a.dateOfBirth ? `${fmtDate(a.dateOfBirth)}${years !== null ? `（${years}歳）` : ""}` : undefined} />
          <Row label="電話番号" value={a.phoneNumber} />
          <Row label="メール" value={a.email} />
          <Row label="郵便番号" value={a.postalCode ? `〒${a.postalCode.replace(/^〒/, "")}` : undefined} />
          <Row label="ご住所" value={a.address} />

          <p className="text-[11px] font-semibold text-gray-400 tracking-wide mt-4 mb-1">緊急連絡先</p>
          <Row label="お名前" value={a.emergencyName} />
          <Row label="続柄" value={a.emergencyRelation} />
          <Row label="電話番号" value={a.emergencyPhone} />
        </div>

        <div>
          <p className="text-[11px] font-semibold text-gray-400 tracking-wide mb-1 mt-4 md:mt-0">お申し込み内容</p>
          <Row label="希望店舗" value={a.storeName} />
          <Row label="プラン" value={a.plan} />
          <Row label="お支払い方法" value={a.paymentMethod} />
          <Row label="写真の掲載" value={a.photoConsent} />
          <Row label="ご要望・ご質問" value={a.requestNote} />

          <p className="text-[11px] font-semibold text-gray-400 tracking-wide mt-4 mb-1">健康状態</p>
          {healthLines.length > 0
            ? healthLines.map((l) => (
                <p key={l} className="text-sm text-gray-900 py-1 border-b border-gray-100 last:border-0">{l}</p>
              ))
            : <p className="text-sm text-gray-400 py-1">—</p>}

          <p className="text-[11px] font-semibold text-gray-400 tracking-wide mt-4 mb-1">同意</p>
          <Row label="会員規約" value={a.agreedToTerms ? "同意済み" : "未同意"} />
          <Row label="ご署名" value={a.signatureName} />
          <Row label="同意日時" value={a.agreedAt ? new Date(a.agreedAt).toLocaleString("ja-JP") : undefined} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-gray-200">
        {a.phoneNumber && (
          <a href={`tel:${a.phoneNumber.replace(/[^0-9+]/g, "")}`} className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 transition">
            <Phone size={12} /> 電話する
          </a>
        )}
        {a.email && (
          <a href={`mailto:${a.email}`} className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 transition">
            <Mail size={12} /> メールする
          </a>
        )}
        {a.email && <CopyButton text={a.email} label="メールをコピー" />}
        {a.customerId && (
          <Link href="/master/customers" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 transition">
            <ExternalLink size={12} /> 顧客マスタを開く
          </Link>
        )}

        {isAdmin && (
          <div className="ml-auto">
            {confirming ? (
              <span className="inline-flex items-center gap-2">
                <span className="text-xs text-gray-500">削除すると戻せません。</span>
                <button
                  disabled={locked}
                  onClick={() => run(async () => {
                    await deleteApplicationAction(a.id, a.fullName);
                    router.refresh();
                  })}
                  className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-60"
                >
                  {locked ? <Spinner size={11} /> : <Trash2 size={12} />} 削除する
                </button>
                <button onClick={() => setConfirming(false)} className="text-xs text-gray-400 hover:text-gray-600">
                  やめる
                </button>
              </span>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-600 transition"
              >
                <Trash2 size={12} /> 削除
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 一覧 ─────────────────────────────────────────────
type Filter = "all" | ApplicationStatus;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all",  label: "すべて" },
  { key: "new",  label: "未対応" },
  { key: "done", label: "対応済み" },
];

export function ApplicationsClient({
  applications,
  isAdmin,
}: {
  applications: MembershipApplication[];
  isAdmin: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const newCount = useMemo(
    () => applications.filter((a) => a.status === "new").length,
    [applications]
  );

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return applications.filter((a) => {
      if (filter !== "all" && a.status !== filter) return false;
      if (!needle) return true;
      return [a.fullName, a.fullNameKana, a.email, a.phoneNumber, a.storeName, a.plan]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(needle));
    });
  }, [applications, filter, q]);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-5 hidden md:block">
        <h1 className="text-xl font-bold text-gray-900">入会申し込み</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          HPの入会申し込みフォームから届いた申込書
          {newCount > 0 && <span className="text-yellow-700 font-medium">（未対応 {newCount}件）</span>}
        </p>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="お名前・メール・店舗で検索"
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-blue-300"
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5 mb-3">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition",
              filter === f.key
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300"
            )}
          >
            {f.label}
            {f.key === "new" && newCount > 0 && <span className="ml-1">{newCount}</span>}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500">
            {applications.length === 0
              ? "まだお申し込みはありません。"
              : "条件に合うお申し込みはありません。"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {shown.map((a) => {
            const open = openId === a.id;
            return (
              <div key={a.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setOpenId(open ? null : a.id)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 text-sm">{a.fullName}</p>
                      {hasHealthFlag(a) && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                          <AlertTriangle size={9} /> 健康申告
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {[a.storeName, a.plan, fmtDateTime(a.createdAt)].filter(Boolean).join("・")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <StatusSelect id={a.id} status={a.status} />
                    <ChevronDown size={16} className={cn("text-gray-400 transition", open && "rotate-180")} />
                  </div>
                </button>
                {open && <Detail a={a} isAdmin={isAdmin} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

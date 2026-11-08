"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, ChevronDown, X, Clock } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * 顧客を選ぶ欄（どの画面でも同じもの）。
 *
 * お客さまが増えて、プルダウンを指でずっと送って探すのが大変になったので作った（2026-11-08）。
 * - タップすると検索欄つきの一覧が開く。名前の一部・メール・電話で絞り込める。ひらがな／カタカナは同じに扱う（漢字の名前をひらがなでは引けない。読みの列が無いため）。
 * - 一覧は「最近えらんだ人」→「在籍中」→「体験・審査中」→「退会」の順。退会は検索したときだけ出す。
 * - 最近えらんだ人はこの端末に覚えておく（localStorage。消えても困らない）。
 * - フォームの中で使うときは name を渡すと、その名前で値が送られる（いままでの select と同じ）。
 */

export type PickerCustomer = {
  id: string;
  /** 顧客マスタは fullName、ほかの画面では name で来ることがあるので両方受ける */
  fullName?: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  status?: string;
};

type Props = {
  customers: PickerCustomer[];
  /** フォームで送る名前（例: "customerId"）。無ければ値を送らない */
  name?: string;
  /** 外から値を持つとき */
  value?: string;
  /** 外で値を持たないときの最初の値 */
  defaultValue?: string;
  onChange?: (id: string) => void;
  required?: boolean;
  placeholder?: string;
  /** 「すべての顧客」のような、顧客でない選択肢（値は空文字や "all"） */
  emptyOption?: { value: string; label: string };
  /** 一覧から外す顧客（自分自身を請求まとめ先に選べないように、など） */
  excludeIds?: string[];
  className?: string;
};

const RECENT_KEY = "fs.recentCustomers";
const RECENT_MAX = 5;

function readRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch { return []; }
}
function pushRecent(id: string) {
  try {
    const next = [id, ...readRecent().filter((x) => x !== id)].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch { /* 覚えられなくても選ぶことはできる */ }
}

/** 検索用にそろえる：カタカナ→ひらがな、全角英数→半角、空白を消す、小文字 */
export function normalizeForSearch(s: string): string {
  return s
    .normalize("NFKC")
    .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
    .replace(/[\s　・]/g, "")
    .toLowerCase();
}

function labelOf(c: PickerCustomer): string {
  return c.fullName ?? c.name ?? "";
}

const STATUS_RANK: Record<string, number> = { active: 0, pending: 1, trial: 1, inactive: 2 };
const STATUS_CHIP: Record<string, { label: string; cls: string }> = {
  pending:  { label: "審査中", cls: "bg-amber-50 text-amber-700" },
  trial:    { label: "体験",   cls: "bg-purple-50 text-purple-700" },
  inactive: { label: "退会",   cls: "bg-gray-100 text-gray-500" },
};

export function CustomerPicker({
  customers, name, value, defaultValue, onChange, required, placeholder = "顧客をえらぶ…",
  emptyOption, excludeIds, className,
}: Props) {
  const controlled = value !== undefined;
  const [inner, setInner] = useState(defaultValue ?? emptyOption?.value ?? "");
  const selectedId = controlled ? value : inner;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // 開くときに最近の人を読み直し、検索欄を空にする
  function toggle() {
    if (!open) { setRecent(readRecent()); setQuery(""); }
    setOpen((v) => !v);
  }

  // 開いたら検索欄にすぐ打てるようにする
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => searchRef.current?.focus(), 30);
    // 欄の外をタップしたら閉じる
    function onDown(e: PointerEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    return () => { clearTimeout(t); document.removeEventListener("pointerdown", onDown); };
  }, [open]);

  const pool = useMemo(() => {
    const ex = new Set(excludeIds ?? []);
    return customers.filter((c) => !ex.has(c.id) && labelOf(c));
  }, [customers, excludeIds]);

  const selected = pool.find((c) => c.id === selectedId) ?? customers.find((c) => c.id === selectedId);

  const sections = useMemo(() => {
    const q = normalizeForSearch(query);
    const hit = (c: PickerCustomer) => !q || [labelOf(c), c.email ?? "", (c.phoneNumber ?? "").replace(/\D/g, "")]
      .some((f) => normalizeForSearch(f).includes(q));
    const byName = (a: PickerCustomer, b: PickerCustomer) => labelOf(a).localeCompare(labelOf(b), "ja");
    const matches = pool.filter(hit);

    if (q) {
      // 検索中は、前方一致を先に・退会は後ろに、1つの一覧で出す
      const starts = (c: PickerCustomer) => (normalizeForSearch(labelOf(c)).startsWith(q) ? 0 : 1);
      const rank = (c: PickerCustomer) => STATUS_RANK[c.status ?? "active"] ?? 0;
      return [{ title: `${matches.length}件`, items: [...matches].sort((a, b) => starts(a) - starts(b) || (rank(a) === 2 ? 1 : 0) - (rank(b) === 2 ? 1 : 0) || byName(a, b)) }];
    }

    const recentItems = recent.map((id) => pool.find((c) => c.id === id)).filter((c): c is PickerCustomer => !!c && c.status !== "inactive");
    const recentSet = new Set(recentItems.map((c) => c.id));
    const rest = matches.filter((c) => !recentSet.has(c.id));
    const active  = rest.filter((c) => (STATUS_RANK[c.status ?? "active"] ?? 0) === 0).sort(byName);
    const waiting = rest.filter((c) => (STATUS_RANK[c.status ?? "active"] ?? 0) === 1).sort(byName);
    const out: { title: string; items: PickerCustomer[] }[] = [];
    if (recentItems.length) out.push({ title: "最近えらんだ人", items: recentItems });
    if (active.length) out.push({ title: waiting.length || recentItems.length ? "在籍中" : "", items: active });
    if (waiting.length) out.push({ title: "体験・審査中", items: waiting });
    return out;
  }, [pool, query, recent]);

  const inactiveCount = useMemo(() => pool.filter((c) => c.status === "inactive").length, [pool]);

  function pick(id: string) {
    if (!controlled) setInner(id);
    if (id && id !== emptyOption?.value) pushRecent(id);
    onChange?.(id);
    setOpen(false);
  }

  return (
    <div ref={boxRef} className={cn("relative", className)}>
      {/* フォームに値を送る。required のときは、空なら送信を止めてこの欄に吹き出しを出す */}
      {name && (
        <input
          tabIndex={-1} aria-hidden name={name} value={selectedId === emptyOption?.value && required ? "" : selectedId}
          required={required} onChange={() => {}}
          className="absolute inset-x-0 bottom-0 h-px opacity-0 pointer-events-none"
        />
      )}
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "w-full min-w-0 flex items-center gap-2 px-3.5 py-2.5 rounded-xl border bg-white text-sm text-left transition",
          open ? "border-blue-500 ring-2 ring-blue-500" : "border-gray-300",
        )}
      >
        <span className={cn("flex-1 min-w-0 truncate", selected ? "text-gray-900" : "text-gray-400")}>
          {selected ? labelOf(selected) : (selectedId === emptyOption?.value && emptyOption ? emptyOption.label : placeholder)}
        </span>
        {selected?.status && STATUS_CHIP[selected.status] && (
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0", STATUS_CHIP[selected.status].cls)}>
            {STATUS_CHIP[selected.status].label}
          </span>
        )}
        <ChevronDown size={15} className={cn("text-gray-400 flex-shrink-0 transition", open && "rotate-180")} />
      </button>

      {open && (
        <div className="mt-1.5 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          <div className="relative border-b border-gray-100">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
                // Enter で先頭の人を選ぶ（フォームを送信しない）
                if (e.key === "Enter") {
                  e.preventDefault();
                  const first = sections[0]?.items[0];
                  if (first) pick(first.id);
                }
              }}
              placeholder="名前の一部で検索（例：堀、田中）"
              className="w-full pl-9 pr-9 py-2.5 text-[16px] sm:text-sm focus:outline-none"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400" aria-label="検索を消す">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto overscroll-contain">
            {emptyOption && !query && (
              <Option label={emptyOption.label} active={selectedId === emptyOption.value} onPick={() => pick(emptyOption.value)} muted />
            )}
            {sections.map((s, i) => (
              <div key={i}>
                {s.title && (
                  <p className="sticky top-0 z-[1] bg-gray-50/95 px-3 py-1 text-[10px] font-semibold text-gray-500 flex items-center gap-1">
                    {s.title === "最近えらんだ人" && <Clock size={10} />}{s.title}
                  </p>
                )}
                {s.items.map((c) => (
                  <Option key={c.id} label={labelOf(c)} active={c.id === selectedId} status={c.status} onPick={() => pick(c.id)} />
                ))}
              </div>
            ))}
            {sections.every((s) => s.items.length === 0) && (
              <p className="px-3 py-6 text-center text-xs text-gray-400">
                {query ? "見つかりません。字を減らすか、別の書き方で試してください" : "顧客がいません"}
              </p>
            )}
            {!query && inactiveCount > 0 && (
              <p className="px-3 py-2 text-[10px] text-gray-400 border-t border-gray-100">退会した人（{inactiveCount}人）は、名前で検索すると出ます</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Option({ label, active, status, muted, onPick }: {
  label: string; active: boolean; status?: string; muted?: boolean; onPick: () => void;
}) {
  const chip = status ? STATUS_CHIP[status] : undefined;
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm border-b border-gray-50 last:border-0 transition",
        active ? "bg-blue-50 text-blue-700 font-semibold" : "hover:bg-gray-50 active:bg-gray-100",
        muted && !active && "text-gray-500",
      )}
    >
      <span className="flex-1 min-w-0 truncate">{label}</span>
      {chip && <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", chip.cls)}>{chip.label}</span>}
    </button>
  );
}

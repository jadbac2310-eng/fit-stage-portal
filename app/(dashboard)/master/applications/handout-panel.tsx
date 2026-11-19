"use client";

import { useState } from "react";
import NextImage from "next/image";
import { QrCode, Copy, Check, ExternalLink, ChevronDown, MessageCircle } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * お客様に入会フォームをお渡しするための道具。
 *
 * 体験が終わったその場で、QRを読んでいただくか、LINE・WhatsAppにリンクを送るか、
 * この画面の端末をそのままお渡しして書いていただくか、の3通り。
 *
 * フォームは4枚ある（2026-11-19 尚樹「店舗用も日本語・英語、出張用も日本語・英語の両方いる」）。
 * 「店舗／出張」と「日本語／English」を選ぶと、そのフォームのQR・リンク・文面に切り替わる。
 * 規約が店舗用と出張用で違う（入会金・回数券の期限など）ので、渡すフォームを間違えないこと。
 */

type Kind = "store" | "onsite";
type Lang = "ja" | "en";

const FORMS: Record<Kind, Record<Lang, { url: string; qr: string; note: string }>> = {
  store: {
    ja: { url: "https://www.fitstage.jp/store/join/",    qr: "/join-qr/qr-all.svg",       note: "店舗用・日本語（3店舗共通）" },
    en: { url: "https://www.fitstage.jp/en/store/join/", qr: "/join-qr/qr-store-en.svg",  note: "店舗用・English（3店舗共通）" },
  },
  onsite: {
    ja: { url: "https://www.fitstage.jp/join/",          qr: "/join-qr/qr-onsite-ja.svg", note: "出張用・日本語（入会金なし）" },
    en: { url: "https://www.fitstage.jp/en/join/",       qr: "/join-qr/qr-en.svg",        note: "出張用・English（入会金なし）" },
  },
};

/** 体験の後にお送りする文面（日本語。HP側のカードと同じ内容に揃えている） */
function lineMessage(url: string) {
  return [
    "本日はありがとうございました。",
    "",
    "ご入会のお手続きは、こちらのフォームからお願いいたします。",
    url,
    "",
    "・入力は5分ほどで終わります",
    "・会員規約をご確認のうえ、同意にチェックをお願いします",
    "・お支払いは初回セッションまでに（現金・カード・PayPay・銀行振込）",
    "",
    "ご不明な点があれば、こちらにご返信ください。",
  ].join("\n");
}

/** 英語のお客様にお送りする文面（WhatsApp・LINE どちらでも） */
function englishMessage(url: string) {
  return [
    "Thank you for today.",
    "",
    "To enrol, please fill in this form:",
    url,
    "",
    "- It takes about five minutes",
    "- Please read the terms and tick the box to agree",
    "- Payment is due by your first session (cash, credit card, PayPay or bank transfer)",
    "",
    "If you have any questions, just reply to this message.",
  ].join("\n");
}

function CopyButton({ text, label, className }: { text: string; label: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        });
      }}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition",
        done ? "bg-green-600 text-white" : "bg-gray-900 text-white hover:opacity-85",
        className
      )}
    >
      {done ? <Check size={13} /> : <Copy size={13} />}
      {done ? "コピーしました" : label}
    </button>
  );
}

export function HandoutPanel() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("store");
  const [lang, setLang] = useState<Lang>("ja");
  const form = FORMS[kind][lang];
  const message = lang === "en" ? englishMessage(form.url) : lineMessage(form.url);
  const seg = (on: boolean) => cn(
    "flex-1 py-2 rounded-lg text-xs font-semibold transition border",
    on ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200",
  );
  const ghost = "inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white border border-gray-200 text-gray-700 hover:border-gray-300 transition";

  return (
    <div className="bg-white rounded-2xl border border-gray-200 mb-3 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition"
      >
        <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <QrCode size={18} className="text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm">お客様にお渡しする</p>
          <p className="text-xs text-gray-500 mt-0.5">入会フォームのQR・リンク・文面（店舗用／出張用・日本語／English）</p>
        </div>
        <ChevronDown size={16} className={cn("text-gray-400 transition flex-shrink-0", open && "rotate-180")} />
      </button>

      {open && (
        <div className="border-t border-gray-100 p-4 bg-gray-50/60">
          {/* どのフォームを渡すか。店舗と出張で規約が違うので、まずここを選ぶ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            <div className="flex gap-1.5" role="group" aria-label="店舗か出張か">
              <button type="button" onClick={() => setKind("store")} aria-pressed={kind === "store"} className={seg(kind === "store")}>店舗 / Studio</button>
              <button type="button" onClick={() => setKind("onsite")} aria-pressed={kind === "onsite"} className={seg(kind === "onsite")}>出張 / On-site</button>
            </div>
            <div className="flex gap-1.5" role="group" aria-label="フォームの言語">
              <button type="button" onClick={() => setLang("ja")} aria-pressed={lang === "ja"} className={seg(lang === "ja")}>日本語</button>
              <button type="button" onClick={() => setLang("en")} aria-pressed={lang === "en"} className={seg(lang === "en")}>English</button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="bg-white p-3 rounded-xl border border-gray-200 self-start">
              <NextImage
                key={form.qr}
                src={form.qr}
                alt={`入会お申し込みフォームのQRコード（${form.note}）`}
                width={148}
                height={148}
                unoptimized
                className="block w-[148px] h-[148px]"
              />
              <p className="text-[11px] text-gray-500 text-center mt-2" data-form-note>{form.note}</p>
            </div>

            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <p className="text-[11px] font-semibold text-gray-400 tracking-wide mb-1">フォームのURL</p>
                <p className="text-xs text-gray-700 break-all bg-white border border-gray-200 rounded-xl px-3 py-2" data-form-url>
                  {form.url}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <CopyButton text={form.url} label={lang === "en" ? "Copy link" : "リンクをコピー"} />
                <CopyButton text={message} label={lang === "en" ? "Copy message" : "文面をコピー"} />
                {lang === "en" ? (
                  <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className={ghost}>
                    <MessageCircle size={13} /> WhatsApp
                  </a>
                ) : (
                  <a href={`https://line.me/R/share?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className={ghost}>
                    <MessageCircle size={13} /> LINEで送る
                  </a>
                )}
                <a href={form.url} target="_blank" rel="noopener noreferrer" className={ghost}>
                  <ExternalLink size={13} /> {lang === "en" ? "Open form" : "フォームを開く"}
                </a>
              </div>

              <p className="text-[11px] text-gray-500 leading-relaxed">
                {kind === "onsite"
                  ? "出張用は入会金なし・回数券は8／16／32回です。"
                  : "店舗用は入会金あり・回数券は2／4／8回です（3店舗共通）。"}
                その場で書いていただくときは「フォームを開く」でこの端末をお渡しください。
                {kind === "store" && lang === "ja" && (
                  <>
                    印刷して置いておくカードは
                    <a
                      href="https://www.fitstage.jp/tools/join-card/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline mx-0.5"
                    >
                      入会のご案内カード
                    </a>
                    から出せます。
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import NextImage from "next/image";
import { QrCode, Copy, Check, ExternalLink, ChevronDown, MessageCircle } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * 受付でお客様に入会フォームをお渡しするための道具。
 *
 * 体験が終わったその場で、QRを読んでいただくか、LINEにリンクを送るか、
 * この画面のタブレットをそのままお渡しして書いていただくか、の3通り。
 * HP側の /tools/join-card/ と同じことを、ポータルからもできるようにしている。
 */

const FORM_URL = "https://www.fitstage.jp/store/join/";
const QR_SRC   = "/join-qr/qr-all.svg";
/** 英語の入会フォーム（出張パーソナル用。2026-11-19〜）。規約も出張向けの英語になっている */
const FORM_URL_EN = "https://www.fitstage.jp/en/join/";
/** 英語フォームのQR。URLを変えたら作り直す（中身は FORM_URL_EN そのもの） */
const QR_SRC_EN   = "/join-qr/qr-en.svg";

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

/** 体験の後にお送りするLINEの文面。HP側のカードと同じ内容に揃えている */
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
  const url = FORM_URL;

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
          <p className="text-xs text-gray-500 mt-0.5">入会フォームのQR・リンク・LINEの文面（3店舗共通）</p>
        </div>
        <ChevronDown size={16} className={cn("text-gray-400 transition flex-shrink-0", open && "rotate-180")} />
      </button>

      {open && (
        <div className="border-t border-gray-100 p-4 bg-gray-50/60">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="bg-white p-3 rounded-xl border border-gray-200 self-start">
              <NextImage
                src={QR_SRC}
                alt="入会お申し込みフォームのQRコード"
                width={148}
                height={148}
                unoptimized
                className="block w-[148px] h-[148px]"
              />
              <p className="text-[11px] text-gray-500 text-center mt-2">3店舗共通</p>
            </div>

            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <p className="text-[11px] font-semibold text-gray-400 tracking-wide mb-1">フォームのURL</p>
                <p className="text-xs text-gray-700 break-all bg-white border border-gray-200 rounded-xl px-3 py-2">
                  {url}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <CopyButton text={url} label="リンクをコピー" />
                <CopyButton text={lineMessage(url)} label="LINEの文面をコピー" />
                <a
                  href={`https://line.me/R/share?text=${encodeURIComponent(lineMessage(url))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white border border-gray-200 text-gray-700 hover:border-gray-300 transition"
                >
                  <MessageCircle size={13} /> LINEで送る
                </a>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white border border-gray-200 text-gray-700 hover:border-gray-300 transition"
                >
                  <ExternalLink size={13} /> フォームを開く
                </a>
              </div>

              <p className="text-[11px] text-gray-500 leading-relaxed">
                その場で書いていただくときは「フォームを開く」でこの端末をお渡しください。
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
              </p>
            </div>
          </div>

          {/* 英語のお客様（出張パーソナル）用。店舗用の日本語フォームとは規約が違うので、リンクを分けている */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs font-semibold text-gray-800">英語のお客様（出張パーソナル）／ English form for on-site clients</p>
            <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
              英語の入会フォームです。その場でQRを読んでもらうか、リンクを送ります。規約は出張向け（入会金なし・回数券は8／16／32回）。届いた申込は、この一覧に「出張（英語フォーム）」と出ます。
            </p>
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 mt-3">
              <div className="bg-white p-3 rounded-xl border border-gray-200 self-start">
                <NextImage
                  src={QR_SRC_EN}
                  alt="英語の入会フォーム（出張パーソナル用）のQRコード"
                  width={148}
                  height={148}
                  unoptimized
                  className="block w-[148px] h-[148px]"
                />
                <p className="text-[11px] text-gray-500 text-center mt-2">English・出張用</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-700 break-all bg-white border border-gray-200 rounded-xl px-3 py-2">
                  {FORM_URL_EN}
                </p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <CopyButton text={FORM_URL_EN} label="Copy link" />
                  <CopyButton text={englishMessage(FORM_URL_EN)} label="Copy message" />
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(englishMessage(FORM_URL_EN))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white border border-gray-200 text-gray-700 hover:border-gray-300 transition"
                  >
                    <MessageCircle size={13} /> WhatsApp
                  </a>
                  <a
                    href={FORM_URL_EN}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white border border-gray-200 text-gray-700 hover:border-gray-300 transition"
                  >
                    <ExternalLink size={13} /> Open form
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

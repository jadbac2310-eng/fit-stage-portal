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
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Share2, Send, Copy, Check, X, Mail } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { createInvoiceShareAction, createInvoiceEmailAction, sendInvoiceEmailAction } from "../actions";

/**
 * 請求書の送付。
 * - 「LINEで送る」= 内訳＋金額＋お振込先の文面を作り、共有シート/コピーで公式LINEに貼って送る。
 * - 「メール文」= 件名・本文を作る。iPhoneなら「PDFと本文を共有」でメールアプリに両方渡せる。
 * - 「共有」「PDF」= 従来どおり請求書PDFを共有/保存。
 */
export function InvoiceActions({
  pdfHref, filename, billerId, month,
}: {
  pdfHref: string; filename: string; billerId: string; month: string;
}) {
  const [busy, setBusy] = useState<"share" | "download" | "line" | "mail" | "mailshare" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [mail, setMail] = useState<{ to: string; subject: string; body: string; canSend: boolean; from: string | null } | null>(null);
  const [mailCopied, setMailCopied] = useState<"subject" | "body" | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState<string | null>(null);
  const router = useRouter();

  async function fetchFile(): Promise<File> {
    const res = await fetch(pdfHref);
    if (!res.ok) throw new Error("PDFの取得に失敗しました");
    const blob = await res.blob();
    return new File([blob], filename, { type: "application/pdf" });
  }

  function saveFile(file: File) {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function handleShare() {
    setBusy("share");
    try {
      const file = await fetchFile();
      const nav = navigator as Navigator & { canShare?: (d?: ShareData) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: filename });
      } else {
        saveFile(file); // 共有非対応端末はダウンロード
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") alert((e as Error).message || "共有に失敗しました");
    } finally {
      setBusy(null);
    }
  }

  async function handleDownload() {
    setBusy("download");
    try {
      saveFile(await fetchFile());
    } catch (e) {
      alert((e as Error).message || "ダウンロードに失敗しました");
    } finally {
      setBusy(null);
    }
  }

  async function handleLine() {
    setBusy("line");
    try {
      const res = await createInvoiceShareAction(billerId, month);
      if (res.ok) {
        setMessage(res.message);
        setCopied(false);
      } else {
        alert(res.error);
      }
    } catch {
      alert("文面の作成に失敗しました");
    } finally {
      setBusy(null);
    }
  }

  async function handleMail() {
    setBusy("mail");
    try {
      const res = await createInvoiceEmailAction(billerId, month);
      if (res.ok) {
        setMail({ to: res.to, subject: res.subject, body: res.body, canSend: res.canSend, from: res.from });
        setMailCopied(null);
        setSent(null);
      } else {
        alert(res.error);
      }
    } catch {
      alert("メール文の作成に失敗しました");
    } finally {
      setBusy(null);
    }
  }

  /** iPhone/Android の共有シートに PDF と本文を一緒に渡す（メールアプリを選ぶと添付＋本文になる） */
  async function shareMailWithPdf() {
    if (!mail) return;
    setBusy("mailshare");
    try {
      const file = await fetchFile();
      const nav = navigator as Navigator & { canShare?: (d?: ShareData) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: mail.subject, text: mail.body });
      } else {
        // 共有シートが無い端末：PDFを保存して、メールアプリを開く
        saveFile(file);
        window.location.href = mailtoHref();
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") alert((e as Error).message || "共有に失敗しました");
    } finally {
      setBusy(null);
    }
  }

  /**
   * Gmail から直接送る（PDF添付・サーバー側で送信。送信済みにも残る）。
   * 返事が戻らなかったときは「失敗」とは言わない。送れていることがあり、押し直すと2通届くため（2026-11-10 に実際に起きた）。
   * 同じ宛先へ続けて送ろうとしたら、サーバーがいったん止めて聞いてくる（duplicate）。
   */
  async function sendFromGmail() {
    if (!mail) return;
    if (!mail.body.trim()) { alert("本文が空です。本文を入れてから送ってください。"); return; }
    if (!confirm(`${mail.to} に請求書PDFを添付して送ります。よろしいですか？`)) return;
    setBusy("mailshare");
    try {
      const payload = { to: mail.to, subject: mail.subject, body: mail.body };
      let res = await sendInvoiceEmailAction(billerId, month, payload);
      if (!res.ok && res.duplicate) {
        if (!confirm(`${res.error}\n\nそれでも、もう1通送りますか？`)) return;
        res = await sendInvoiceEmailAction(billerId, month, payload, { force: true });
      }
      if (res.ok) {
        setSent(res.to);
        // 画面にも「何時に送ったか」を出し、上の「メールで送った記録」も読み直す
        setSentAt(new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", hour12: false }));
        router.refresh();
      } else alert(res.error);
    } catch {
      alert("送れたかどうか、確かめられませんでした（返事が戻る前に通信が切れました）。\n\nメールは送れていることがあります。もう一度押す前に、Gmail の「送信済み」を見てください。");
    } finally {
      setBusy(null);
    }
  }

  /** Gmail の作成画面を開く（本文・件名・宛先入り。PDFは手で添付） */
  function gmailHref(): string {
    if (!mail) return "#";
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(mail.to)}&su=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.body)}`;
  }

  function mailtoHref(): string {
    if (!mail) return "#";
    return `mailto:${encodeURIComponent(mail.to)}?subject=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.body)}`;
  }

  async function copyMail(kind: "subject" | "body") {
    if (!mail) return;
    try {
      await navigator.clipboard.writeText(kind === "subject" ? mail.subject : mail.body);
      setMailCopied(kind);
      setTimeout(() => setMailCopied(null), 2000);
    } catch {
      alert("コピーに失敗しました。長押しでコピーしてください。");
    }
  }

  async function shareMessage() {
    if (!message) return;
    try {
      if ("share" in navigator && typeof navigator.share === "function") {
        await navigator.share({ text: message });
      } else {
        await copyMessage();
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") await copyMessage();
    }
  }

  async function copyMessage() {
    if (!message) return;
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("コピーに失敗しました。文面を長押しでコピーしてください。");
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
        <button
          onClick={handleLine}
          disabled={busy !== null}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition"
        >
          {busy === "line" ? <Spinner size={16} /> : <Send size={16} />} LINEで送る
        </button>
        <button
          onClick={handleMail}
          disabled={busy !== null}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition"
        >
          {busy === "mail" ? <Spinner size={16} /> : <Mail size={16} />} メール文
        </button>
        <button
          onClick={handleShare}
          disabled={busy !== null}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 font-semibold px-3.5 py-2.5 rounded-xl text-sm transition"
        >
          <Share2 size={16} /> {busy === "share" ? "準備中…" : "PDF共有"}
        </button>
        <button
          onClick={handleDownload}
          disabled={busy !== null}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 font-semibold px-3.5 py-2.5 rounded-xl text-sm transition"
        >
          <Download size={16} /> {busy === "download" ? "準備中…" : "PDF保存"}
        </button>
      </div>

      {mail !== null && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={() => setMail(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-gray-900">メールで送る文面</h3>
              <button onClick={() => setMail(null)} className="p-1 text-gray-400 hover:text-gray-700 rounded-lg"><X size={18} /></button>
            </div>
            {sent ? (
              <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 mb-3">
                {sentAt ? `${sentAt} に送信しました` : "送信しました"}（{sent}）。Gmail の「送信済み」にも残っています。
              </div>
            ) : (
              <p className="text-xs text-gray-500 mb-2">
                {mail.canSend
                  ? `「Gmailから送信」で、${mail.from ?? "Gmail"} から請求書PDFを添付して送ります。`
                  : "Gmail の送信設定がまだ無いので、「Gmailで開く」か「PDFと本文を共有」で送ってください。"}
              </p>
            )}
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">宛先</label>
            <input
              value={mail.to}
              onChange={(e) => setMail({ ...mail, to: e.target.value })}
              placeholder="example@example.com（顧客マスタのメール）"
              className="w-full text-xs text-gray-800 border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-blue-400 mb-3"
            />
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">件名</label>
            <div className="flex gap-2 mb-3">
              <input
                value={mail.subject}
                onChange={(e) => setMail({ ...mail, subject: e.target.value })}
                className="flex-1 text-xs text-gray-800 border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-blue-400"
              />
              <button onClick={() => copyMail("subject")} className="inline-flex items-center gap-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold px-3 rounded-xl text-xs transition" aria-label="件名をコピー">
                {mailCopied === "subject" ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
              </button>
            </div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">本文</label>
            <textarea
              value={mail.body}
              onChange={(e) => setMail({ ...mail, body: e.target.value })}
              className="w-full h-48 text-xs text-gray-800 border border-gray-200 rounded-xl p-3 bg-white resize-none focus:outline-none focus:border-blue-400"
            />
            <div className="flex gap-2 mt-3">
              {mail.canSend ? (
                <button
                  onClick={sendFromGmail}
                  disabled={busy !== null || !!sent}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition"
                >
                  {busy === "mailshare" ? <Spinner size={16} /> : <Send size={16} />} {sent ? "送信済み" : "Gmailから送信（PDF添付）"}
                </button>
              ) : (
                <button
                  onClick={shareMailWithPdf}
                  disabled={busy !== null}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition"
                >
                  {busy === "mailshare" ? <Spinner size={16} /> : <Share2 size={16} />} PDFと本文を共有
                </button>
              )}
              <button
                onClick={() => copyMail("body")}
                className="inline-flex items-center justify-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold px-4 py-2.5 rounded-xl text-sm transition"
              >
                {mailCopied === "body" ? <Check size={16} className="text-green-600" /> : <Copy size={16} />} 本文
              </button>
            </div>
            <div className="flex justify-center gap-4 mt-3 text-xs">
              <a href={gmailHref()} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Gmailで開く（PDFは手で添付）</a>
              {mail.canSend && (
                <button onClick={shareMailWithPdf} disabled={busy !== null} className="text-blue-600 hover:underline">PDFと本文を共有</button>
              )}
              <a href={mailtoHref()} className="text-gray-500 hover:underline">メールアプリ</a>
            </div>
          </div>
        </div>
      )}

      {message !== null && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={() => setMessage(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-gray-900">LINEで送る文面</h3>
              <button onClick={() => setMessage(null)} className="p-1 text-gray-400 hover:text-gray-700 rounded-lg"><X size={18} /></button>
            </div>
            <p className="text-xs text-gray-500 mb-2">内容を確認して、公式LINEで顧客に送ってください。</p>
            <textarea
              readOnly
              value={message}
              className="w-full h-64 text-xs text-gray-800 border border-gray-200 rounded-xl p-3 bg-gray-50 resize-none focus:outline-none"
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={shareMessage}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition"
              >
                <Send size={16} /> LINEへ共有
              </button>
              <button
                onClick={copyMessage}
                className="flex-1 inline-flex items-center justify-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold px-4 py-2.5 rounded-xl text-sm transition"
              >
                {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />} {copied ? "コピー済" : "コピー"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

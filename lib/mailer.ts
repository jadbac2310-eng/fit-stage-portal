import nodemailer from "nodemailer";

/**
 * Gmail からメールを送る（請求書の送付に使う）。
 *
 * 使うのは Gmail の「アプリパスワード」。Vercel の環境変数に入れる：
 *   GMAIL_USER          … 送信元の Gmail アドレス（FIT STAGE の Gmail）
 *   GMAIL_APP_PASSWORD  … Google アカウント → セキュリティ → 2段階認証 → アプリパスワード で作る16文字
 *   MAIL_FROM_NAME      … 差出人の表示名（省略時 "FIT STAGE 坂根尚樹"）
 *
 * 送ったメールは Gmail の「送信済み」にも残る（SMTP経由なので）。
 * 未設定のときは isMailConfigured() が false になり、画面では「Gmailで開く」だけを出す。
 */
export function isMailConfigured(): boolean {
  return !!(process.env.GMAIL_USER?.trim() && process.env.GMAIL_APP_PASSWORD?.trim());
}

export function mailFromAddress(): string | null {
  return process.env.GMAIL_USER?.trim() || null;
}

export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export async function sendMail(input: {
  to: string;
  subject: string;
  text: string;
  attachments?: MailAttachment[];
}): Promise<{ ok: true; messageId: string } | { ok: false; error: string }> {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.trim().replace(/\s+/g, ""); // 画面でコピーすると空白が入ることがある
  if (!user || !pass) return { ok: false, error: "Gmail の送信設定（GMAIL_USER / GMAIL_APP_PASSWORD）がありません" };
  const fromName = process.env.MAIL_FROM_NAME?.trim() || "FIT STAGE 坂根尚樹";

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user, pass },
    });
    const info = await transporter.sendMail({
      from: { name: fromName, address: user },
      to: input.to,
      subject: input.subject,
      text: input.text,
      attachments: input.attachments?.map((a) => ({ filename: a.filename, content: a.content, contentType: a.contentType ?? "application/pdf" })),
    });
    return { ok: true, messageId: info.messageId };
  } catch (e) {
    console.error("[mailer] 送信に失敗", e);
    const msg = e instanceof Error ? e.message : String(e);
    // Gmail のよくある失敗を日本語に
    if (/Invalid login|Username and Password not accepted|535/.test(msg)) {
      return { ok: false, error: "Gmail にログインできませんでした。アプリパスワードが違うか、2段階認証がオフになっています" };
    }
    return { ok: false, error: `送信に失敗しました（${msg}）` };
  }
}

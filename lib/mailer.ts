import nodemailer from "nodemailer";

/**
 * Gmail からメールを送る。送信元（アカウント）は用途で2つ。
 *
 * ■ default … 請求書の送付。
 *   GMAIL_USER          … 送信元の Gmail アドレス
 *   GMAIL_APP_PASSWORD  … Google アカウント → セキュリティ → 2段階認証 → アプリパスワード で作る16文字
 *   MAIL_FROM_NAME      … 差出人の表示名（省略時 "FIT STAGE 坂根尚樹"）
 *
 * ■ store … お客様への体験の確定メール（2026-11-14〜、info@fitstage.jp から送るため）。
 *   STORE_GMAIL_USER          … FIT STAGE の Gmail（fitstage.000@gmail.com。info@fitstage.jp を「他のアドレスから送信」に登録済みのアカウント）
 *   STORE_GMAIL_APP_PASSWORD  … そのアカウントのアプリパスワード
 *   STORE_MAIL_FROM           … 差出人のアドレス（info@fitstage.jp）。Gmail に登録済みの別名でないと Gmail が書き換える
 *   STORE_MAIL_FROM_NAME      … 差出人の表示名（省略時 "FIT STAGE"）
 *   未設定のときは default のアカウントで送る（画面に送信元を出すので分かる）。
 *
 * 送ったメールは送信元の Gmail の「送信済み」にも残る（SMTP経由なので）。
 * 未設定のときは isMailConfigured() が false になり、画面では「Gmailで開く」だけを出す。
 */
export type MailAccount = "default" | "store";

interface AccountConfig { user: string; pass: string; fromAddress: string; fromName: string }

function accountConfig(account: MailAccount): AccountConfig | null {
  if (account === "store") {
    const user = process.env.STORE_GMAIL_USER?.trim();
    const pass = process.env.STORE_GMAIL_APP_PASSWORD?.trim().replace(/\s+/g, "");
    if (user && pass) {
      return {
        user, pass,
        fromAddress: process.env.STORE_MAIL_FROM?.trim() || user,
        fromName: process.env.STORE_MAIL_FROM_NAME?.trim() || "FIT STAGE",
      };
    }
    // 店舗用のログイン情報が未設定なら default のアカウントで送る。
    // ただし差出人（STORE_MAIL_FROM / STORE_MAIL_FROM_NAME）だけ入っていれば、それを使う
    // （default のアカウントに info@fitstage.jp が別名として登録されていれば、それで届く）。
  }
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.trim().replace(/\s+/g, ""); // 画面でコピーすると空白が入ることがある
  if (!user || !pass) return null;
  if (account === "store") {
    return {
      user, pass,
      fromAddress: process.env.STORE_MAIL_FROM?.trim() || user,
      fromName: process.env.STORE_MAIL_FROM_NAME?.trim() || process.env.MAIL_FROM_NAME?.trim() || "FIT STAGE",
    };
  }
  return { user, pass, fromAddress: user, fromName: process.env.MAIL_FROM_NAME?.trim() || "FIT STAGE 坂根尚樹" };
}

export function isMailConfigured(account: MailAccount = "default"): boolean {
  return accountConfig(account) !== null;
}

/** 画面に出す送信元のアドレス（未設定なら null） */
export function mailFromAddress(account: MailAccount = "default"): string | null {
  return accountConfig(account)?.fromAddress ?? null;
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
  account?: MailAccount;
}): Promise<{ ok: true; messageId: string } | { ok: false; error: string }> {
  const cfg = accountConfig(input.account ?? "default");
  if (!cfg) return { ok: false, error: "Gmail の送信設定（GMAIL_USER / GMAIL_APP_PASSWORD）がありません" };
  const { user, pass, fromName } = cfg;

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user, pass },
    });
    const info = await transporter.sendMail({
      from: { name: fromName, address: cfg.fromAddress },
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

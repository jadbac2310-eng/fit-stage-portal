import crypto from "crypto";

// LINE Messaging API クライアント。トークン未設定でも壊れず、送信はスキップする。
const API = "https://api.line.me/v2/bot/message";

export function isLineConfigured(): boolean {
  return !!process.env.LINE_CHANNEL_ACCESS_TOKEN;
}

type SendResult = { ok: boolean; skipped?: boolean; error?: string };

/** 1ユーザーへテキストをプッシュ送信する */
export async function pushLineMessage(to: string, text: string): Promise<SendResult> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    console.warn("[line] LINE_CHANNEL_ACCESS_TOKEN 未設定のため送信をスキップ");
    return { ok: false, skipped: true };
  }
  try {
    const res = await fetch(`${API}/push`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ to, messages: [{ type: "text", text }] }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[line] push 失敗", res.status, body);
      return { ok: false, error: `${res.status} ${body}` };
    }
    return { ok: true };
  } catch (e) {
    console.error("[line] push 例外", e);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Webhook の reply token を使って返信する */
export async function replyLineMessage(replyToken: string, text: string): Promise<SendResult> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return { ok: false, skipped: true };
  try {
    const res = await fetch(`${API}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ replyToken, messages: [{ type: "text", text }] }),
    });
    return res.ok ? { ok: true } : { ok: false, error: String(res.status) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Webhook 署名検証（X-Line-Signature）。secret 未設定時は false。 */
export function verifyLineSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

import crypto from "crypto";
import { type Member } from "./members";
import { portalUrl } from "./line-notify";

// LINE通知のリンクから「ログイン済み」でポータルを開くための、担当者ごとの署名トークン。
// LINEのトーク（本人のみ閲覧可）に届くリンクに埋め込み、/api/line/login で検証してセッションを張る。

const TTL_DAYS = Number(process.env.LINE_LOGIN_TTL_DAYS ?? "7");

// HMAC鍵。専用の LINE_LOGIN_SECRET があれば優先、無ければ CRON_SECRET を流用（追加設定なしで動く）。
function secret(): string | null {
  return process.env.LINE_LOGIN_SECRET || process.env.CRON_SECRET || null;
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}
function sign(payload: string, key: string): string {
  return b64url(crypto.createHmac("sha256", key).update(payload).digest());
}

/** 担当者用のログイントークンを発行（HMAC署名＋有効期限）。secret 未設定なら null。 */
export function makeLoginToken(memberId: string): string | null {
  const key = secret();
  if (!key) return null;
  const exp = Date.now() + TTL_DAYS * 86_400_000;
  const payload = `${memberId}.${exp}`;
  return `${b64url(Buffer.from(payload))}.${sign(payload, key)}`;
}

/** トークンを検証し、有効なら memberId を返す。無効・期限切れなら null。 */
export function verifyLoginToken(token: string): string | null {
  const key = secret();
  if (!key) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let payload: string;
  try {
    payload = fromB64url(payloadB64).toString("utf8");
  } catch {
    return null;
  }
  const expected = sign(payload, key);
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null; // 長さ違いなど
  }
  const [memberId, expStr] = payload.split(".");
  if (!memberId || !expStr) return null;
  if (Date.now() > Number(expStr)) return null;
  return memberId;
}

/**
 * 通知リンクのURLを返す。担当者がメール＋認証ユーザーを持ち、署名鍵もあれば
 * 自動ログイン用URL（/api/line/login）を、そうでなければ通常のポータルURLを返す。
 */
export function loginLink(member: Member | undefined, path = "/schedule"): string {
  if (member?.email && member.authUserId) {
    const token = makeLoginToken(member.id);
    if (token) {
      const q = new URLSearchParams({ t: token, to: path });
      return portalUrl(`/api/line/login?${q.toString()}`);
    }
  }
  return portalUrl(path);
}

/** メッセージ末尾に付ける「スケジュールを見る」リンク（担当者ごとに自動ログイン対応）。 */
export function scheduleLink(member?: Member): string {
  return `\n\n▶ スケジュールを見る\n${loginLink(member, "/schedule")}`;
}

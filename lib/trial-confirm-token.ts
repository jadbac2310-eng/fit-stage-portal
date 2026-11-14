import crypto from "crypto";
import { portalUrl } from "./line-notify";

/**
 * 体験の「ご予約確定」メールに入れる「予約を確認しました」ボタンのリンク（2026-11-14〜）。
 *
 * リンクには 体験のID と 予約の日時 を入れて署名する。日時を変えたあとに古いメールのボタンを
 * 押されても「日時が変わっています」と出せるように、日時も署名に含める。期限は付けない
 * （予約の日時を過ぎたら確認ページのほうで受け付けない）。
 *
 * 鍵は LINE通知の自動ログインと同じ環境変数（LINE_LOGIN_SECRET か CRON_SECRET）から作るが、
 * 用途の名前を混ぜて別の鍵にしている（このリンクをログインに使い回せないように）。
 * どちらも無ければリンクは作らず、メールにボタンの段落が入らないだけ。
 */
function key(): string | null {
  const s = process.env.LINE_LOGIN_SECRET || process.env.CRON_SECRET;
  return s ? `trial-confirm:${s}` : null;
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}
function sign(payload: string, k: string): string {
  // URL を短くするため 16バイトに切る（推測で当てるのは現実的に無理な長さ）
  return b64url(crypto.createHmac("sha256", k).update(payload).digest().subarray(0, 16));
}

export function makeTrialConfirmToken(trialId: string, scheduledAt: string): string | null {
  const k = key();
  const ms = new Date(scheduledAt).getTime();
  if (!k || !trialId || !Number.isFinite(ms)) return null;
  const payload = `${trialId}.${ms}`;
  return `${b64url(Buffer.from(payload))}.${sign(payload, k)}`;
}

export function verifyTrialConfirmToken(token: string | undefined | null): { trialId: string; scheduledMs: number } | null {
  const k = key();
  if (!k || !token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  let payload: string;
  try {
    payload = fromB64url(token.slice(0, dot)).toString("utf8");
  } catch {
    return null;
  }
  const sig = token.slice(dot + 1);
  const expected = sign(payload, k);
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  const [trialId, msStr] = payload.split(".");
  const scheduledMs = Number(msStr);
  if (!trialId || !Number.isFinite(scheduledMs)) return null;
  return { trialId, scheduledMs };
}

/** メールに入れる確認ページのURL（鍵が無ければ null） */
export function trialConfirmUrl(trialId: string, scheduledAt: string): string | null {
  const t = makeTrialConfirmToken(trialId, scheduledAt);
  return t ? portalUrl(`/trial-confirm?t=${t}`) : null;
}

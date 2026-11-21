/**
 * AIメール担当の型と、画面で使う純粋な計算（精度など）。画面から import してよい（DB に触らない）。
 * ワーカーは別リポジトリ fit-stage-agents（VPS で常駐）。表は supabase/migrations/20261121000001_ai_mail_agent.sql。
 */

export const MAIL_CATEGORIES = ["needs_review", "faq", "sales", "ignore"] as const;
export type MailCategory = (typeof MAIL_CATEGORIES)[number];

export const CATEGORY_LABEL: Record<MailCategory, string> = {
  needs_review: "要確認",
  faq: "定型",
  sales: "営業",
  ignore: "無視",
};

export const CATEGORY_HINT: Record<MailCategory, string> = {
  needs_review: "下書きを作って承認待ちへ（フェーズ2から）",
  faq: "faq に答えがある。自動返信の候補（フェーズ3から）",
  sales: "返信しない。まとめ通知で尚樹に確認",
  ignore: "迷惑メール・自動送信・お知らせ",
};

export type MailRow = {
  id: string;
  source: "email" | "contact_form";
  fromAddress: string | null;
  fromName: string | null;
  toAddress: string | null;
  subject: string | null;
  bodyText: string | null;
  receivedAt: string;
  status: "new" | "classified";
  category: MailCategory | null;
  confidence: "high" | "medium" | "low" | null;
  reason: string | null;
  summary: string | null;
  urgent: "none" | "complaint" | "same_day_change" | null;
  classifiedBy: "rule" | "ai" | null;
  humanCategory: MailCategory | null;
  humanNote: string | null;
  reviewedBy: string | null;
  error: string | null;
};

export type AgentStatus = {
  killSwitch: boolean;
  killReason: string | null;
  killedAt: string | null;
  killedBy: string | null;
  phase: number;
  monthlyBudgetUsd: number;
  heartbeatAt: string | null;
  workerVersion: string | null;
};

export type AgentEventRow = {
  id: number;
  eventType: string;
  messageId: string | null;
  detail: Record<string, unknown>;
  actor: string;
  createdAt: string;
};

/** ワーカーが止まっているとみなすまでの時間（心拍は5分ごと） */
export const HEARTBEAT_STALE_MS = 30 * 60 * 1000;

export function workerState(heartbeatAt: string | null, now = Date.now()): "never" | "alive" | "down" {
  if (!heartbeatAt) return "never";
  return now - new Date(heartbeatAt).getTime() > HEARTBEAT_STALE_MS ? "down" : "alive";
}

/**
 * 仕分けの精度（フェーズ1の報告用）。尚樹が「正解」を付けた行だけで数える。
 * 付けていない行は「AIの仕分けで合っている」とは数えない（見ていないだけかもしれないため）。
 * もっとも大事なのは「要確認なのに定型・営業・無視にした」取りこぼし（missedReview）。
 */
export function accuracy(rows: Pick<MailRow, "category" | "humanCategory">[]) {
  const reviewed = rows.filter((r) => r.category && r.humanCategory);
  const correct = reviewed.filter((r) => r.category === r.humanCategory).length;
  const missedReview = reviewed.filter((r) => r.humanCategory === "needs_review" && r.category !== "needs_review").length;
  const overReview = reviewed.filter((r) => r.category === "needs_review" && r.humanCategory !== "needs_review").length;
  return {
    reviewed: reviewed.length,
    correct,
    rate: reviewed.length ? correct / reviewed.length : null,
    missedReview,
    overReview,
  };
}

export const EVENT_LABEL: Record<string, string> = {
  worker_started: "ワーカー起動",
  worker_stopped: "ワーカー停止",
  imap_start: "受信を開始",
  imap_error: "受信エラー",
  received: "受信",
  received_ignored: "受信（決まりで無視）",
  contact_form_received: "HPフォームを受信",
  classified: "仕分け",
  classify_error: "仕分けエラー",
  process_error: "処理エラー",
  digest_sent: "まとめ通知を送信",
  urgent_notified: "緊急の LINE を送信",
  budget_alert: "費用8割の知らせ",
  notify_error: "LINE の送信エラー",
  kill_on: "緊急停止",
  kill_off: "再開",
  budget_changed: "月の上限を変更",
  human_label: "正解を付けた",
  worker_down_alert: "止まった知らせ",
};

// 請求書をメールで送った記録（いつ・どこへ）。画面からも使うので、DBを読むものはここに置かない。

export interface InvoiceMailRecord {
  /** 請求先（まとめ先）の顧客ID */
  billerId: string;
  to: string;
  /** 送った時刻（ISO） */
  at: string;
  /** 送っている途中で返事が切れた記録。届いているかは Gmail の送信済みで確かめる */
  pending: boolean;
  /** 送った人 */
  byName?: string;
}

/** 例：「11/10(火) 11:56」。日本時間で出す */
export function formatSentAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const date = d.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", weekday: "short" });
  const time = d.toLocaleTimeString("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date} ${time}`;
}

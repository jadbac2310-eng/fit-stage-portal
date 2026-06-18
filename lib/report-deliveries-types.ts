// 月次レポートの送付記録（行が存在＝その顧客のその月のレポートは送付済み）。
export interface ReportDelivery {
  id: string;
  customerId: string;
  period: string;       // 'YYYY-MM'
  sentAt: string;
  sentById?: string;
  channel?: string;     // 'line' 等
  note?: string;
}

export function deliveryKey(customerId: string, period: string): string {
  return `${customerId}__${period}`;
}

import { Document, Page, View, Text, StyleSheet, Font } from "@react-pdf/renderer";
import type { CustomerInvoice, InvoiceRow } from "./invoices";

// 日本語フォント（実行時にCDNから登録）。請求書は氏名に任意の漢字が入るため全字対応のNoto Sans JPを使用。
Font.register({
  family: "NotoSansJP",
  fonts: [
    { src: "https://cdn.jsdelivr.net/npm/@expo-google-fonts/noto-sans-jp/NotoSansJP_400Regular.ttf", fontWeight: "normal" },
    { src: "https://cdn.jsdelivr.net/npm/@expo-google-fonts/noto-sans-jp/NotoSansJP_700Bold.ttf", fontWeight: "bold" },
  ],
});

function yen(n: number): string {
  return `¥${n.toLocaleString("ja-JP")}`;
}

const C = {
  ink: "#111827",
  sub: "#6b7280",
  line: "#d1d5db",
  faint: "#f3f4f6",
};

/**
 * 1枚に収めるための余白。以前は14本のレッスンで2枚目にはみ出していたので、
 * 見出し・合計欄の余白を詰め、同じ日付・品目は「数量」でまとめ、
 * 消費税の内訳とお振込先を横に並べている。
 */
const s = StyleSheet.create({
  page: { fontFamily: "NotoSansJP", fontSize: 9, color: C.ink, paddingTop: 32, paddingBottom: 32, paddingHorizontal: 42, lineHeight: 1.3 },
  title: { fontSize: 20, fontWeight: "bold", textAlign: "center", letterSpacing: 8, marginBottom: 22 },

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  // 宛名は発行元の「FIT STAGE」の行と高さをそろえ、下に「下記のとおり…」を置いて左右の釣り合いをとる
  toBox: { width: "55%", paddingTop: 2 },
  toName: { fontSize: 14, fontWeight: "bold", borderBottomWidth: 1, borderBottomColor: "#9ca3af", paddingBottom: 5 },
  toAddr: { fontSize: 8.5, color: C.sub, marginTop: 6 },
  toNote: { fontSize: 9, color: "#374151", marginTop: 10 },
  fromBox: { width: "42%", alignItems: "flex-end" },
  fromName: { fontSize: 11, fontWeight: "bold" },
  fromLine: { fontSize: 8.5, color: C.sub },

  metaRow: { flexDirection: "row", justifyContent: "space-between", fontSize: 8.5, color: C.sub, marginBottom: 10 },

  totalBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: C.faint, borderRadius: 6, paddingVertical: 10, paddingHorizontal: 16, marginBottom: 14 },
  totalLabel: { fontSize: 10.5, fontWeight: "bold", color: "#374151", lineHeight: 1 },
  totalValue: { fontSize: 18, fontWeight: "bold", lineHeight: 1 },

  th: { flexDirection: "row", borderBottomWidth: 1.5, borderBottomColor: "#9ca3af", paddingBottom: 4, marginBottom: 1 },
  thText: { fontSize: 8.5, color: C.sub, fontWeight: "bold" },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.faint, paddingVertical: 2.5 },
  cDate: { width: "17%" },
  cLabel: { width: "43%" },
  cCount: { width: "8%", textAlign: "right" },
  cUnit: { width: "16%", textAlign: "right" },
  cAmount: { width: "16%", textAlign: "right" },

  tfoot: { flexDirection: "row", alignItems: "center", paddingTop: 5 },
  tfootLabel: { width: "84%", textAlign: "right", fontSize: 9, fontWeight: "bold", color: "#374151", paddingRight: 8, lineHeight: 1 },
  tfootValue: { width: "16%", textAlign: "right", fontSize: 10, fontWeight: "bold", lineHeight: 1 },
  tfootSub: { width: "84%", textAlign: "right", fontSize: 8.5, color: C.sub, paddingRight: 8, lineHeight: 1 },
  tfootSubValue: { width: "16%", textAlign: "right", fontSize: 9, lineHeight: 1 },

  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginTop: 14 },
  bank: { width: "52%", borderWidth: 1, borderColor: C.line, borderRadius: 6, paddingVertical: 9, paddingHorizontal: 12 },
  bankTitle: { fontSize: 9.5, fontWeight: "bold", marginBottom: 5 },
  bankRow: { flexDirection: "row", marginBottom: 2 },
  bankKey: { width: 56, color: C.sub, fontSize: 8.5 },
  bankVal: { fontSize: 8.5 },
  due: { fontSize: 8.5, color: C.sub, marginTop: 6 },

  taxBox: { width: "44%", borderWidth: 1, borderColor: C.line, borderRadius: 6, paddingVertical: 7, paddingHorizontal: 12 },
  taxRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 1.5 },
  taxKey: { fontSize: 8.5, color: C.sub },
  taxVal: { fontSize: 8.5, textAlign: "right" },
  taxTotalRow: { borderTopWidth: 0.5, borderTopColor: C.line, marginTop: 3, paddingTop: 4 },
  taxKeyBold: { fontSize: 9.5, fontWeight: "bold", color: "#374151" },
  taxValBold: { fontSize: 10.5, fontWeight: "bold", textAlign: "right" },
});

export interface InvoicePdfData {
  invoice: CustomerInvoice;
  /** 並べる行（同じ日付・品目はまとめ済み。税抜表示ならここで税抜になっている） */
  rows: InvoiceRow[];
  /** 明細が税抜か（見出しと合計欄の出し方が変わる） */
  taxExcluded: boolean;
  address?: string;
  issuer: { name: string; contact?: string; registrationNumber?: string; address: string; tel: string; email: string };
  bank: { bankName: string; accountType: string; accountNumber: string; accountHolder: string };
  invoiceNo: string;
  monthLabel: string;
  /** 締日がある取引先のみ。「2026年9月21日〜10月20日」 */
  periodLabel?: string | null;
  dueDateLabel: string;
  addresseeSuffix: string;
  tax: { rate: number; net: number; tax: number; gross: number };
}

export function InvoiceDocument({
  invoice, rows, taxExcluded, address, issuer, bank, invoiceNo, monthLabel, periodLabel, dueDateLabel, addresseeSuffix, tax,
}: InvoicePdfData) {
  const amountHead = taxExcluded ? "金額（税抜）" : "金額";
  const unitHead = taxExcluded ? "単価（税抜）" : "単価";
  return (
    <Document title={`請求書 ${invoice.customerName} ${monthLabel}`}>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>請　求　書</Text>

        <View style={s.headerRow}>
          <View style={s.toBox}>
            <Text style={s.toName}>{invoice.customerName} {addresseeSuffix}</Text>
            {address ? <Text style={s.toAddr}>{address}</Text> : null}
            <Text style={s.toNote}>下記のとおりご請求申し上げます。</Text>
          </View>
          <View style={s.fromBox}>
            <Text style={s.fromName}>{issuer.name}</Text>
            {issuer.contact ? <Text style={s.fromLine}>担当: {issuer.contact}</Text> : null}
            {issuer.registrationNumber ? <Text style={s.fromLine}>登録番号: {issuer.registrationNumber}</Text> : null}
            {issuer.address.split("\n").map((line, i) => (
              <Text key={i} style={s.fromLine}>{line}</Text>
            ))}
            <Text style={s.fromLine}>{issuer.tel}</Text>
            <Text style={s.fromLine}>{issuer.email}</Text>
          </View>
        </View>

        <View style={s.metaRow}>
          <Text>請求書番号: {invoiceNo}</Text>
          <Text>対象月: {monthLabel}</Text>
          {periodLabel && <Text>対象期間: {periodLabel}</Text>}
        </View>

        <View style={s.totalBox}>
          <Text style={s.totalLabel}>ご請求金額（税込）</Text>
          <Text style={s.totalValue}>{yen(invoice.total)}</Text>
        </View>

        {/* 明細 */}
        <View style={s.th}>
          <Text style={[s.thText, s.cDate]}>日付</Text>
          <Text style={[s.thText, s.cLabel]}>品目</Text>
          <Text style={[s.thText, s.cCount]}>数量</Text>
          <Text style={[s.thText, s.cUnit]}>{unitHead}</Text>
          <Text style={[s.thText, s.cAmount]}>{amountHead}</Text>
        </View>
        {rows.map((r, i) => (
          <View key={i} style={s.tr} wrap={false}>
            <Text style={s.cDate}>{r.noDate ? "" : r.date}</Text>
            <Text style={s.cLabel}>{r.label}</Text>
            <Text style={s.cCount}>{r.count}</Text>
            <Text style={s.cUnit}>{yen(r.unit)}</Text>
            <Text style={s.cAmount}>{yen(r.amount)}</Text>
          </View>
        ))}
        {taxExcluded ? (
          <>
            <View style={s.tfoot}>
              <Text style={s.tfootSub}>小計（税抜）</Text>
              <Text style={s.tfootSubValue}>{yen(tax.net)}</Text>
            </View>
            <View style={[s.tfoot, { paddingTop: 3 }]}>
              <Text style={s.tfootSub}>消費税（{tax.rate}%）</Text>
              <Text style={s.tfootSubValue}>{yen(tax.tax)}</Text>
            </View>
            <View style={[s.tfoot, { paddingTop: 4 }]}>
              <Text style={s.tfootLabel}>合計（税込）</Text>
              <Text style={s.tfootValue}>{yen(tax.gross)}</Text>
            </View>
          </>
        ) : (
          <View style={s.tfoot}>
            <Text style={s.tfootLabel}>合計</Text>
            <Text style={s.tfootValue}>{yen(invoice.total)}</Text>
          </View>
        )}

        {/* お振込先と、消費税の内訳（インボイス制度対応）を横に並べる */}
        <View style={s.bottomRow} wrap={false}>
          <View style={s.bank}>
            <Text style={s.bankTitle}>お振込先</Text>
            <View style={s.bankRow}><Text style={s.bankKey}>銀行名</Text><Text style={s.bankVal}>{bank.bankName}</Text></View>
            <View style={s.bankRow}><Text style={s.bankKey}>種別</Text><Text style={s.bankVal}>{bank.accountType}</Text></View>
            <View style={s.bankRow}><Text style={s.bankKey}>口座番号</Text><Text style={s.bankVal}>{bank.accountNumber}</Text></View>
            <View style={s.bankRow}><Text style={s.bankKey}>口座名義</Text><Text style={s.bankVal}>{bank.accountHolder}</Text></View>
            <Text style={s.due}>お支払期限: {dueDateLabel}</Text>
            <Text style={s.due}>（振込手数料はご負担ください）</Text>
          </View>
          <View style={s.taxBox}>
            <View style={s.taxRow}>
              <Text style={s.taxKey}>{tax.rate}% 対象（税抜）</Text>
              <Text style={s.taxVal}>{yen(tax.net)}</Text>
            </View>
            <View style={s.taxRow}>
              <Text style={s.taxKey}>消費税（{tax.rate}%）</Text>
              <Text style={s.taxVal}>{yen(tax.tax)}</Text>
            </View>
            <View style={[s.taxRow, s.taxTotalRow]}>
              <Text style={s.taxKeyBold}>合計（税込）</Text>
              <Text style={s.taxValBold}>{yen(tax.gross)}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

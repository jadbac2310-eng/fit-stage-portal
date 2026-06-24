import { Document, Page, View, Text, StyleSheet, Font } from "@react-pdf/renderer";
import type { CustomerInvoice } from "./invoices";

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

const s = StyleSheet.create({
  page: { fontFamily: "NotoSansJP", fontSize: 10, color: C.ink, paddingTop: 40, paddingBottom: 48, paddingHorizontal: 44, lineHeight: 1.4 },
  title: { fontSize: 22, fontWeight: "bold", textAlign: "center", letterSpacing: 8, marginBottom: 24 },

  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 22 },
  toBox: { width: "55%" },
  toName: { fontSize: 14, fontWeight: "bold", borderBottomWidth: 1, borderBottomColor: "#9ca3af", paddingBottom: 3 },
  toAddr: { fontSize: 9, color: C.sub, marginTop: 6 },
  fromBox: { width: "42%", alignItems: "flex-end" },
  fromName: { fontSize: 12, fontWeight: "bold" },
  fromLine: { fontSize: 9, color: C.sub },

  metaRow: { flexDirection: "row", justifyContent: "space-between", fontSize: 9, color: C.sub, marginBottom: 14 },

  totalBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: C.faint, borderRadius: 6, paddingVertical: 14, paddingHorizontal: 18, marginBottom: 22 },
  totalLabel: { fontSize: 11, fontWeight: "bold", color: "#374151", lineHeight: 1 },
  totalValue: { fontSize: 20, fontWeight: "bold", lineHeight: 1 },

  th: { flexDirection: "row", borderBottomWidth: 1.5, borderBottomColor: "#9ca3af", paddingBottom: 5, marginBottom: 2 },
  thText: { fontSize: 9, color: C.sub, fontWeight: "bold" },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.faint, paddingVertical: 5 },
  cDate: { width: "22%" },
  cLabel: { width: "56%" },
  cAmount: { width: "22%", textAlign: "right" },

  tfoot: { flexDirection: "row", alignItems: "center", paddingTop: 8 },
  tfootLabel: { width: "78%", textAlign: "right", fontSize: 10, fontWeight: "bold", color: "#374151", paddingRight: 8, lineHeight: 1 },
  tfootValue: { width: "22%", textAlign: "right", fontSize: 12, fontWeight: "bold", lineHeight: 1 },

  taxBox: { marginTop: 18, marginLeft: "auto", width: "55%", borderWidth: 1, borderColor: C.line, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 12 },
  taxRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  taxKey: { fontSize: 9, color: C.sub },
  taxVal: { fontSize: 9, textAlign: "right" },
  taxTotalRow: { borderTopWidth: 0.5, borderTopColor: C.line, marginTop: 3, paddingTop: 4 },
  taxKeyBold: { fontSize: 10, fontWeight: "bold", color: "#374151" },
  taxValBold: { fontSize: 11, fontWeight: "bold", textAlign: "right" },

  bank: { marginTop: 26, borderWidth: 1, borderColor: C.line, borderRadius: 6, padding: 14 },
  bankTitle: { fontSize: 10, fontWeight: "bold", marginBottom: 8 },
  bankRow: { flexDirection: "row", marginBottom: 3 },
  bankKey: { width: 64, color: C.sub, fontSize: 9 },
  bankVal: { fontSize: 9 },
  due: { fontSize: 9, color: C.sub, marginTop: 10 },
});

export interface InvoicePdfData {
  invoice: CustomerInvoice;
  address?: string;
  issuer: { name: string; contact?: string; registrationNumber?: string; address: string; tel: string; email: string };
  invoiceNo: string;
  monthLabel: string;
  addresseeSuffix: string;
  tax: { rate: number; net: number; tax: number; gross: number };
}

export function InvoiceDocument({ invoice, address, issuer, invoiceNo, monthLabel, addresseeSuffix, tax }: InvoicePdfData) {
  return (
    <Document title={`請求書 ${invoice.customerName} ${monthLabel}`}>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>請　求　書</Text>

        <View style={s.headerRow}>
          <View style={s.toBox}>
            <Text style={s.toName}>{invoice.customerName} {addresseeSuffix}</Text>
            {address ? <Text style={s.toAddr}>{address}</Text> : null}
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
        </View>

        <View style={s.totalBox}>
          <Text style={s.totalLabel}>ご請求金額（税込）</Text>
          <Text style={s.totalValue}>{yen(invoice.total)}</Text>
        </View>

        {/* 明細 */}
        <View style={s.th}>
          <Text style={[s.thText, s.cDate]}>日付</Text>
          <Text style={[s.thText, s.cLabel]}>品目</Text>
          <Text style={[s.thText, s.cAmount]}>金額</Text>
        </View>
        {invoice.lines.map((l, i) => (
          <View key={i} style={s.tr} wrap={false}>
            <Text style={s.cDate}>{l.date}</Text>
            <Text style={s.cLabel}>{l.label}</Text>
            <Text style={s.cAmount}>{yen(l.amount)}</Text>
          </View>
        ))}
        <View style={s.tfoot}>
          <Text style={s.tfootLabel}>合計</Text>
          <Text style={s.tfootValue}>{yen(invoice.total)}</Text>
        </View>

        {/* 消費税の内訳（インボイス制度対応） */}
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
      </Page>
    </Document>
  );
}

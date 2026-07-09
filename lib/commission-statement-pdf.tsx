import { Document, Page, View, Text, StyleSheet, Font } from "@react-pdf/renderer";
import type { StatementLine, HourlyStatementLine } from "./commission-statement";

// 日本語フォント（実行時にCDNから登録）。
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
  faint: "#f3f4f6",
};

const s = StyleSheet.create({
  page: { fontFamily: "NotoSansJP", fontSize: 10, color: C.ink, paddingTop: 40, paddingBottom: 48, paddingHorizontal: 44, lineHeight: 1.4 },
  title: { fontSize: 22, fontWeight: "bold", textAlign: "center", letterSpacing: 8, marginBottom: 24 },

  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 22 },
  toBox: { width: "55%" },
  toName: { fontSize: 14, fontWeight: "bold", borderBottomWidth: 1, borderBottomColor: "#9ca3af", paddingBottom: 3 },
  toSub: { fontSize: 9, color: C.sub, marginTop: 6 },
  fromBox: { width: "42%", alignItems: "flex-end" },
  fromName: { fontSize: 12, fontWeight: "bold" },
  fromLine: { fontSize: 9, color: C.sub },

  metaRow: { flexDirection: "row", justifyContent: "space-between", fontSize: 9, color: C.sub, marginBottom: 14 },

  totalBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: C.faint, borderRadius: 6, paddingVertical: 14, paddingHorizontal: 18, marginBottom: 22 },
  totalLabel: { fontSize: 11, fontWeight: "bold", color: "#374151", lineHeight: 1 },
  totalValue: { fontSize: 20, fontWeight: "bold", lineHeight: 1 },

  sectionTitle: { fontSize: 11, fontWeight: "bold", color: "#374151", marginBottom: 6 },
  section: { marginBottom: 18 },

  th: { flexDirection: "row", borderBottomWidth: 1.5, borderBottomColor: "#9ca3af", paddingBottom: 5, marginBottom: 2 },
  thText: { fontSize: 9, color: C.sub, fontWeight: "bold" },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.faint, paddingVertical: 5 },
  cDate: { width: "18%" },
  cCustomer: { width: "34%" },
  cLabel: { width: "26%" },
  cAmount: { width: "22%", textAlign: "right" },
  cHourlyTitle: { width: "48%" },
  cHours: { width: "12%", textAlign: "right" },

  tfoot: { flexDirection: "row", alignItems: "center", paddingTop: 8 },
  tfootLabel: { width: "78%", textAlign: "right", fontSize: 10, fontWeight: "bold", color: "#374151", paddingRight: 8, lineHeight: 1 },
  tfootValue: { width: "22%", textAlign: "right", fontSize: 12, fontWeight: "bold", lineHeight: 1 },

  taxBox: { marginTop: 10, marginLeft: "auto", width: "55%", borderWidth: 1, borderColor: "#d1d5db", borderRadius: 6, paddingVertical: 8, paddingHorizontal: 12 },
  taxRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  taxKey: { fontSize: 9, color: C.sub },
  taxVal: { fontSize: 9, textAlign: "right" },
  taxTotalRow: { borderTopWidth: 0.5, borderTopColor: "#d1d5db", marginTop: 3, paddingTop: 4 },
  taxKeyBold: { fontSize: 10, fontWeight: "bold", color: "#374151" },
  taxValBold: { fontSize: 11, fontWeight: "bold", textAlign: "right" },
});

function LineSection({ title, lines, subtotal }: { title: string; lines: StatementLine[]; subtotal: number }) {
  if (lines.length === 0) return null;
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.th}>
        <Text style={[s.thText, s.cDate]}>日付</Text>
        <Text style={[s.thText, s.cCustomer]}>顧客</Text>
        <Text style={[s.thText, s.cLabel]}>内容</Text>
        <Text style={[s.thText, s.cAmount]}>金額</Text>
      </View>
      {lines.map((l, i) => (
        <View key={i} style={s.tr} wrap={false}>
          <Text style={s.cDate}>{l.date}</Text>
          <Text style={s.cCustomer}>{l.customerName}</Text>
          <Text style={s.cLabel}>{l.label}</Text>
          <Text style={s.cAmount}>{yen(l.amount)}</Text>
        </View>
      ))}
      <View style={s.tfoot}>
        <Text style={s.tfootLabel}>小計</Text>
        <Text style={s.tfootValue}>{yen(subtotal)}</Text>
      </View>
    </View>
  );
}

function HourlyLineSection({ lines, subtotal }: { lines: HourlyStatementLine[]; subtotal: number }) {
  if (lines.length === 0) return null;
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>業務</Text>
      <View style={s.th}>
        <Text style={[s.thText, s.cDate]}>日付</Text>
        <Text style={[s.thText, s.cHourlyTitle]}>業務内容</Text>
        <Text style={[s.thText, s.cHours]}>時間</Text>
        <Text style={[s.thText, s.cAmount]}>金額</Text>
      </View>
      {lines.map((l, i) => (
        <View key={i} style={s.tr} wrap={false}>
          <Text style={s.cDate}>{l.date}</Text>
          <Text style={s.cHourlyTitle}>{l.title}</Text>
          <Text style={s.cHours}>{l.hours}h</Text>
          <Text style={s.cAmount}>{yen(l.amount)}</Text>
        </View>
      ))}
      <View style={s.tfoot}>
        <Text style={s.tfootLabel}>小計</Text>
        <Text style={s.tfootValue}>{yen(subtotal)}</Text>
      </View>
    </View>
  );
}

export interface CommissionStatementPdfData {
  trainerName: string;
  trainerInvoiceNumber?: string;
  trainerLines: StatementLine[];
  trainerTotal: number;
  salesLines: StatementLine[];
  salesTotal: number;
  hourlyLines: HourlyStatementLine[];
  hourlyTotal: number;
  total: number;
  tax: { rate: number; net: number; tax: number; gross: number };
  issuer: { name: string; contact?: string; address: string; tel: string };
  statementNo: string;
  monthLabel: string;
}

export function CommissionStatementDocument({
  trainerName, trainerInvoiceNumber, trainerLines, trainerTotal, salesLines, salesTotal, hourlyLines, hourlyTotal, total, tax, issuer, statementNo, monthLabel,
}: CommissionStatementPdfData) {
  return (
    <Document title={`コミッション明細 ${trainerName} ${monthLabel}`}>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>コミッション明細</Text>

        <View style={s.headerRow}>
          <View style={s.toBox}>
            <Text style={s.toName}>{trainerName} 様</Text>
            {trainerInvoiceNumber ? <Text style={s.toSub}>登録番号: {trainerInvoiceNumber}</Text> : null}
          </View>
          <View style={s.fromBox}>
            <Text style={s.fromName}>{issuer.name}</Text>
            {issuer.contact ? <Text style={s.fromLine}>担当: {issuer.contact}</Text> : null}
            {issuer.address.split("\n").map((line, i) => (
              <Text key={i} style={s.fromLine}>{line}</Text>
            ))}
            <Text style={s.fromLine}>{issuer.tel}</Text>
          </View>
        </View>

        <View style={s.metaRow}>
          <Text>明細番号: {statementNo}</Text>
          <Text>対象月: {monthLabel}</Text>
        </View>

        <View style={s.totalBox}>
          <Text style={s.totalLabel}>お支払い金額</Text>
          <Text style={s.totalValue}>{yen(total)}</Text>
        </View>

        {/* レッスン担当分・営業分・業務（単価・歩合率は表示しない） */}
        <LineSection title="レッスン担当分" lines={trainerLines} subtotal={trainerTotal} />
        <LineSection title="営業分（レッスン歩合・成約ボーナス）" lines={salesLines} subtotal={salesTotal} />
        <HourlyLineSection lines={hourlyLines} subtotal={hourlyTotal} />

        {/* 消費税の内訳（各金額を税込として税抜・消費税に割り戻し） */}
        {total > 0 ? (
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
        ) : null}
      </Page>
    </Document>
  );
}

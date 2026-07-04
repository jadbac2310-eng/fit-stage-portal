import { Document, Page, View, Text, StyleSheet, Font } from "@react-pdf/renderer";
import type { TrainerLessonRow } from "./commissions";

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
  cDate: { width: "18%" },
  cCustomer: { width: "34%" },
  cCourse: { width: "26%" },
  cAmount: { width: "22%", textAlign: "right" },

  tfoot: { flexDirection: "row", alignItems: "center", paddingTop: 8 },
  tfootLabel: { width: "78%", textAlign: "right", fontSize: 10, fontWeight: "bold", color: "#374151", paddingRight: 8, lineHeight: 1 },
  tfootValue: { width: "22%", textAlign: "right", fontSize: 12, fontWeight: "bold", lineHeight: 1 },
});

export interface CommissionStatementPdfData {
  trainerName: string;
  lessons: TrainerLessonRow[];
  total: number;
  issuer: { name: string; contact?: string; address: string; tel: string };
  statementNo: string;
  monthLabel: string;
}

export function CommissionStatementDocument({ trainerName, lessons, total, issuer, statementNo, monthLabel }: CommissionStatementPdfData) {
  return (
    <Document title={`コミッション明細 ${trainerName} ${monthLabel}`}>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>コミッション明細</Text>

        <View style={s.headerRow}>
          <View style={s.toBox}>
            <Text style={s.toName}>{trainerName} 様</Text>
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

        {/* レッスン明細（単価・歩合率は表示しない） */}
        <View style={s.th}>
          <Text style={[s.thText, s.cDate]}>日付</Text>
          <Text style={[s.thText, s.cCustomer]}>顧客</Text>
          <Text style={[s.thText, s.cCourse]}>コース</Text>
          <Text style={[s.thText, s.cAmount]}>金額</Text>
        </View>
        {lessons.map((l) => (
          <View key={l.lessonId} style={s.tr} wrap={false}>
            <Text style={s.cDate}>{l.scheduledAt.slice(0, 10)}</Text>
            <Text style={s.cCustomer}>{l.customerName}</Text>
            <Text style={s.cCourse}>{l.course || "—"}</Text>
            <Text style={s.cAmount}>{yen(l.commission)}</Text>
          </View>
        ))}
        <View style={s.tfoot}>
          <Text style={s.tfootLabel}>合計</Text>
          <Text style={s.tfootValue}>{yen(total)}</Text>
        </View>
      </Page>
    </Document>
  );
}

import { Document, Page, View, Text, StyleSheet, Font } from "@react-pdf/renderer";
import { EXERCISE_TYPE_LABEL, formatSet } from "./exercise-types";
import { monthLabel, type MonthlyReport } from "./monthly-reports";

// 日本語フォント（実行時にCDNから登録）。氏名・種目に任意の漢字が入るため全字対応のNoto Sans JP。
Font.register({
  family: "NotoSansJP",
  fonts: [
    { src: "https://cdn.jsdelivr.net/npm/@expo-google-fonts/noto-sans-jp/NotoSansJP_400Regular.ttf", fontWeight: "normal" },
    { src: "https://cdn.jsdelivr.net/npm/@expo-google-fonts/noto-sans-jp/NotoSansJP_700Bold.ttf", fontWeight: "bold" },
  ],
});

const C = {
  ink:    "#0f172a", // slate-900（ヒーロー背景）
  ink2:   "#1e293b",
  text:   "#111827",
  sub:    "#6b7280",
  line:   "#e5e7eb",
  faint:  "#f8fafc",
  accent: "#22c55e", // green-500
  accentD:"#16a34a",
};

const s = StyleSheet.create({
  page: { fontFamily: "NotoSansJP", fontSize: 9.5, color: C.text, paddingTop: 28, paddingBottom: 40, paddingHorizontal: 32, lineHeight: 1.4 },

  // ヒーロー
  hero: { backgroundColor: C.ink, borderRadius: 14, paddingVertical: 22, paddingHorizontal: 24, marginBottom: 16 },
  brandRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  brandDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.accent, marginRight: 6 },
  brand: { color: "#e2e8f0", fontSize: 9, fontWeight: "bold", letterSpacing: 3 },
  heroTitle: { color: "#ffffff", fontSize: 26, fontWeight: "bold", letterSpacing: 2, lineHeight: 1.1 },
  heroTitleAccent: { color: C.accent },
  heroSubRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 10 },
  heroName: { color: "#ffffff", fontSize: 15, fontWeight: "bold" },
  heroMonth: { color: "#94a3b8", fontSize: 10 },

  // 統計バンド（ヒーロー内）
  stats: { flexDirection: "row", marginTop: 18, gap: 8 },
  stat: { flex: 1, backgroundColor: C.ink2, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 6, alignItems: "center" },
  statNum: { color: C.accent, fontSize: 19, fontWeight: "bold", lineHeight: 1 },
  statUnit: { color: "#cbd5e1", fontSize: 7.5, fontWeight: "bold" },
  statLabel: { color: "#94a3b8", fontSize: 7.5, marginTop: 5 },

  sectionTitle: { fontSize: 11, fontWeight: "bold", color: C.text, marginBottom: 8, marginTop: 4 },

  // セッションカード
  card: { borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 12, marginBottom: 9 },
  cardHead: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  dateChip: { backgroundColor: C.ink, color: "#ffffff", fontSize: 9, fontWeight: "bold", borderRadius: 6, paddingVertical: 3, paddingHorizontal: 7, marginRight: 8 },
  cardMeta: { color: C.sub, fontSize: 8 },

  exRow: { flexDirection: "row", marginBottom: 4 },
  exName: { width: "32%", fontSize: 9, fontWeight: "bold", paddingRight: 6 },
  exType: { fontSize: 7, color: C.accentD, fontWeight: "bold" },
  exSets: { width: "68%", fontSize: 8.5, color: "#374151" },

  comment: { marginTop: 7, backgroundColor: "#f0fdf4", borderLeftWidth: 3, borderLeftColor: C.accent, borderRadius: 4, paddingVertical: 6, paddingHorizontal: 9 },
  commentLabel: { fontSize: 7.5, fontWeight: "bold", color: C.accentD, marginBottom: 2 },
  commentText: { fontSize: 8.5, color: "#166534" },

  // フッター
  cheer: { backgroundColor: C.faint, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, marginTop: 6, alignItems: "center" },
  cheerText: { fontSize: 10, fontWeight: "bold", color: C.text },
  cheerSub: { fontSize: 8, color: C.sub, marginTop: 3 },
  foot: { flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
  footText: { fontSize: 7.5, color: C.sub },
});

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const w = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()}(${w})`;
}

export interface ReportPdfData {
  report: MonthlyReport;
  issuer: { name: string; address: string; tel: string; email: string };
}

export function ReportDocument({ report, issuer }: ReportPdfData) {
  const { stats } = report;
  return (
    <Document title={`トレーニングレポート ${report.customerName} ${monthLabel(report.period)}`}>
      <Page size="A4" style={s.page}>
        {/* ヒーロー */}
        <View style={s.hero}>
          <View style={s.brandRow}>
            <View style={s.brandDot} />
            <Text style={s.brand}>{issuer.name.toUpperCase()}</Text>
          </View>
          <Text style={s.heroTitle}>TRAINING <Text style={s.heroTitleAccent}>REPORT</Text></Text>
          <View style={s.heroSubRow}>
            <Text style={s.heroName}>{report.customerName} 様</Text>
            <Text style={s.heroMonth}>{monthLabel(report.period)}のトレーニング記録</Text>
          </View>

          <View style={s.stats}>
            <View style={s.stat}>
              <Text style={s.statNum}>{stats.sessionCount}<Text style={s.statUnit}> 回</Text></Text>
              <Text style={s.statLabel}>レッスン</Text>
            </View>
            <View style={s.stat}>
              <Text style={s.statNum}>{stats.exerciseCount}<Text style={s.statUnit}> 種目</Text></Text>
              <Text style={s.statLabel}>のべ種目数</Text>
            </View>
            <View style={s.stat}>
              <Text style={s.statNum}>{stats.totalSets}<Text style={s.statUnit}> set</Text></Text>
              <Text style={s.statLabel}>総セット数</Text>
            </View>
            <View style={s.stat}>
              <Text style={s.statNum}>{stats.totalVolumeKg.toLocaleString("ja-JP")}<Text style={s.statUnit}> kg</Text></Text>
              <Text style={s.statLabel}>総挙上量</Text>
            </View>
          </View>
        </View>

        <Text style={s.sectionTitle}>トレーニング内容</Text>

        {report.sessions.map((sess, i) => (
          <View key={i} style={s.card} wrap={false}>
            <View style={s.cardHead}>
              <Text style={s.dateChip}>{fmtDate(sess.date)}</Text>
              <Text style={s.cardMeta}>
                {sess.trainerName ? `担当 ${sess.trainerName}` : ""}
                {sess.location ? `${sess.trainerName ? "  /  " : ""}${sess.location}` : ""}
              </Text>
            </View>

            {sess.exercises.map((ex, j) => (
              <View key={j} style={s.exRow}>
                <Text style={s.exName}>{ex.name} <Text style={s.exType}>{EXERCISE_TYPE_LABEL[ex.type]}</Text></Text>
                <Text style={s.exSets}>{ex.sets.map((set) => formatSet(set) || "-").join("  /  ")}</Text>
              </View>
            ))}

            {sess.impression ? (
              <View style={s.comment}>
                <Text style={s.commentLabel}>トレーナーより</Text>
                <Text style={s.commentText}>{sess.impression}</Text>
              </View>
            ) : null}
          </View>
        ))}

        {/* 応援メッセージ */}
        <View style={s.cheer} wrap={false}>
          <Text style={s.cheerText}>今月もお疲れさまでした！</Text>
          <Text style={s.cheerSub}>積み重ねた{report.stats.sessionCount}回が、確実に力になっています。来月も一緒に頑張りましょう。</Text>
        </View>

        <View style={s.foot}>
          <Text style={s.footText}>{issuer.name}</Text>
          <Text style={s.footText}>{issuer.tel}　{issuer.email}</Text>
        </View>
      </Page>
    </Document>
  );
}

import { Document, Page, View, Text, Image, StyleSheet, Font } from "@react-pdf/renderer";
import { EXERCISE_TYPE_LABEL, formatSet } from "./exercise-types";
import { monthLabel, type MonthlyReport } from "./monthly-reports";
import { FS_WORDMARK_PNG, FS_MONOGRAM_PNG } from "./fitstage-logo";

// FIT STAGE のブランドフォント（明朝＝高級感）。日本語は Noto Serif JP、英字見出しは Cormorant Garamond。
Font.register({
  family: "NotoSerifJP",
  fonts: [
    { src: "https://cdn.jsdelivr.net/npm/@expo-google-fonts/noto-serif-jp/NotoSerifJP_400Regular.ttf", fontWeight: "normal" },
    { src: "https://cdn.jsdelivr.net/npm/@expo-google-fonts/noto-serif-jp/NotoSerifJP_600SemiBold.ttf", fontWeight: "bold" },
  ],
});
Font.register({
  family: "Cormorant",
  fonts: [
    { src: "https://cdn.jsdelivr.net/npm/@expo-google-fonts/cormorant-garamond/CormorantGaramond_500Medium.ttf", fontWeight: "normal" },
    { src: "https://cdn.jsdelivr.net/npm/@expo-google-fonts/cormorant-garamond/CormorantGaramond_700Bold.ttf", fontWeight: "bold" },
  ],
});

// 黒 × 金 のブランドカラー
const C = {
  black:  "#0a0a0a",
  ink:    "#1a1a1a",
  gold:   "#C9A84C",
  goldD:  "#a8883a",
  cream:  "#f1e7cf",
  muted:  "#6b6256",
  ivory:  "#fbf9f3",
  card:   "#ffffff",
  border: "#e7ddc6",
  commentBg: "#faf5e8",
};

const s = StyleSheet.create({
  page: { fontFamily: "NotoSerifJP", fontSize: 9.5, color: C.ink, backgroundColor: C.ivory, paddingTop: 32, paddingBottom: 40, paddingHorizontal: 36, lineHeight: 1.45 },

  // ヘッダー
  header: { alignItems: "center", marginBottom: 8 },
  wordmark: { width: 150 },
  rule: { width: 46, height: 1.5, backgroundColor: C.gold, marginTop: 12, marginBottom: 10 },
  enTitle: { fontFamily: "Cormorant", fontSize: 23, fontWeight: "bold", letterSpacing: 5, color: C.black, lineHeight: 1 },
  jaTitle: { fontSize: 7.5, letterSpacing: 4, color: C.goldD, marginTop: 9 },

  // 宛名・対象月
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 16, marginBottom: 14, borderBottomWidth: 0.8, borderBottomColor: C.border, paddingBottom: 8 },
  toName: { fontSize: 15, fontWeight: "bold", color: C.ink },
  month: { fontSize: 10, color: C.goldD },

  // 統計（黒バンド × 金）
  stats: { flexDirection: "row", backgroundColor: C.black, borderRadius: 8, paddingVertical: 14, marginBottom: 18 },
  stat: { flex: 1, alignItems: "center", borderLeftWidth: 0.6, borderLeftColor: "#2a2a2a" },
  statNum: { fontFamily: "NotoSerifJP", color: C.gold, fontSize: 18, fontWeight: "bold", lineHeight: 1 },
  statUnit: { fontFamily: "NotoSerifJP", fontSize: 8, color: C.cream },
  statLabel: { fontSize: 7.5, color: "#b8ae97", marginTop: 5, letterSpacing: 1 },

  sectionRow: { flexDirection: "row", alignItems: "center", marginBottom: 9 },
  sectionTick: { width: 3, height: 13, backgroundColor: C.gold, marginRight: 7 },
  sectionTitle: { fontSize: 11.5, fontWeight: "bold", color: C.ink, letterSpacing: 1 },

  // セッションカード
  card: { borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 12, marginBottom: 9, backgroundColor: C.card },
  cardHead: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  dateChip: { backgroundColor: C.black, color: C.gold, fontSize: 9, fontWeight: "bold", borderRadius: 4, paddingVertical: 3, paddingHorizontal: 8, marginRight: 8, letterSpacing: 0.5 },
  cardMeta: { color: C.muted, fontSize: 8 },

  exRow: { flexDirection: "row", marginBottom: 4, alignItems: "baseline" },
  exName: { width: "34%", fontSize: 9, fontWeight: "bold", color: C.ink, paddingRight: 6 },
  exType: { fontSize: 7, color: C.goldD },
  exSets: { width: "66%", fontSize: 8.5, color: "#4b463c" },

  comment: { marginTop: 7, backgroundColor: C.commentBg, borderLeftWidth: 3, borderLeftColor: C.gold, borderRadius: 3, paddingVertical: 6, paddingHorizontal: 9 },
  commentLabel: { fontSize: 7.5, fontWeight: "bold", color: C.goldD, marginBottom: 2, letterSpacing: 1 },
  commentText: { fontSize: 8.5, color: "#5a4f33" },

  // 応援・フッター
  cheer: { borderWidth: 1, borderColor: C.gold, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16, marginTop: 6, alignItems: "center", backgroundColor: "#fcf8ee" },
  cheerText: { fontSize: 11, fontWeight: "bold", color: C.black },
  cheerSub: { fontSize: 8, color: C.muted, marginTop: 3 },

  footRule: { height: 1, backgroundColor: C.gold, marginTop: 16, marginBottom: 8 },
  foot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  footLeft: { flexDirection: "row", alignItems: "center" },
  footMono: { width: 16, height: 16, marginRight: 6 },
  footBrand: { fontSize: 8.5, fontWeight: "bold", color: C.ink, letterSpacing: 1 },
  footText: { fontSize: 7.5, color: C.muted },
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
  const statItems = [
    { n: String(stats.sessionCount), u: "回", l: "SESSIONS" },
    { n: String(stats.exerciseCount), u: "種目", l: "EXERCISES" },
    { n: String(stats.totalSets), u: "set", l: "TOTAL SETS" },
    { n: stats.totalVolumeKg.toLocaleString("en-US"), u: "kg", l: "VOLUME" },
  ];

  return (
    <Document title={`トレーニングレポート ${report.customerName} ${monthLabel(report.period)}`}>
      <Page size="A4" style={s.page}>
        {/* ヘッダー（ワードマーク） */}
        <View style={s.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={FS_WORDMARK_PNG} style={s.wordmark} />
          <View style={s.rule} />
          <Text style={s.enTitle}>TRAINING REPORT</Text>
          <Text style={s.jaTitle}>MONTHLY TRAINING RECORD</Text>
        </View>

        {/* 宛名・対象月 */}
        <View style={s.metaRow}>
          <Text style={s.toName}>{report.customerName} 様</Text>
          <Text style={s.month}>{monthLabel(report.period)} の記録</Text>
        </View>

        {/* 統計（黒 × 金） */}
        <View style={s.stats}>
          {statItems.map((st, i) => (
            <View key={i} style={[s.stat, i === 0 ? { borderLeftWidth: 0 } : {}]}>
              <Text style={s.statNum}>{st.n}<Text style={s.statUnit}> {st.u}</Text></Text>
              <Text style={s.statLabel}>{st.l}</Text>
            </View>
          ))}
        </View>

        <View style={s.sectionRow}>
          <View style={s.sectionTick} />
          <Text style={s.sectionTitle}>トレーニング内容</Text>
        </View>

        {report.sessions.map((sess, i) => (
          <View key={i} style={s.card} wrap={false}>
            <View style={s.cardHead}>
              <Text style={s.dateChip}>{fmtDate(sess.date)}</Text>
              <Text style={s.cardMeta}>
                {sess.trainerName ? `担当 ${sess.trainerName}` : ""}
                {sess.location ? `${sess.trainerName ? "   /   " : ""}${sess.location}` : ""}
              </Text>
            </View>

            {sess.exercises.map((ex, j) => (
              <View key={j} style={s.exRow}>
                <Text style={s.exName}>{ex.name} <Text style={s.exType}>{EXERCISE_TYPE_LABEL[ex.type]}</Text></Text>
                <Text style={s.exSets}>{ex.sets.map((set) => formatSet(set) || "-").join("   /   ")}</Text>
              </View>
            ))}

            {sess.impression ? (
              <View style={s.comment}>
                <Text style={s.commentLabel}>TRAINER&apos;S NOTE</Text>
                <Text style={s.commentText}>{sess.impression}</Text>
              </View>
            ) : null}
          </View>
        ))}

        {/* 応援メッセージ */}
        <View style={s.cheer} wrap={false}>
          <Text style={s.cheerText}>今月もお疲れさまでした</Text>
          <Text style={s.cheerSub}>積み重ねた{report.stats.sessionCount}回が、確実に力になっています。来月も一緒に頑張りましょう。</Text>
        </View>

        {/* フッター */}
        <View style={s.footRule} />
        <View style={s.foot}>
          <View style={s.footLeft}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={FS_MONOGRAM_PNG} style={s.footMono} />
            <Text style={s.footBrand}>{issuer.name}</Text>
          </View>
          <Text style={s.footText}>{issuer.tel}　{issuer.email}</Text>
        </View>
      </Page>
    </Document>
  );
}

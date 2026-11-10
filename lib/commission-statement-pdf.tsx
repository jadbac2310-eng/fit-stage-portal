import { Document, Page, View, Text, StyleSheet, Font } from "@react-pdf/renderer";
import type { StatementLine, HourlyStatementLine, AdjustmentStatementLine } from "./commission-statement";

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

/**
 * 詰め具合（0＝ゆったり 〜 3＝いちばん詰める）。
 *
 * 明細は1枚に収める（2026-11-10、尚樹の指示）。16行の月に、最後の消費税の箱だけが2枚目にこぼれていた。
 * 行数に合わせて、字の大きさと行の間を少しずつ詰める。少ない月は今までどおりゆったり出す。
 * いちばん詰めても入らない行数（下の MAX_ROWS を超える）なら2枚になるが、そのときも消費税の箱は途中で切らない。
 */
const DENSITY = [
  { padTop: 40, padBottom: 48, padX: 44, title: 22, titleGap: 24, gap: 22, font: 10,  rowPad: 5,   section: 18, totalPad: 14, totalFont: 20 },
  { padTop: 30, padBottom: 30, padX: 42, title: 19, titleGap: 14, gap: 14, font: 9.5, rowPad: 3.5, section: 12, totalPad: 11, totalFont: 18 },
  { padTop: 24, padBottom: 24, padX: 40, title: 17, titleGap: 10, gap: 10, font: 8.5, rowPad: 2.2, section: 9,  totalPad: 9,  totalFont: 16 },
  { padTop: 20, padBottom: 20, padX: 38, title: 15, titleGap: 8,  gap: 8,  font: 7.5, rowPad: 1.3, section: 7,  totalPad: 7,  totalFont: 15 },
] as const;

/**
 * その詰め具合で1枚に入る行数（明細1区分・調整なしのとき）。実際にPDFを作って数えた値から、1行ぶん余裕を引いてある
 * （scratchpad の commtest/pdf-fit.mts）。字や余白を変えたら数え直すこと。
 */
export const MAX_ROWS = [12, 19, 27, 35] as const;

/**
 * 1枚に収まる、いちばんゆったりした詰め具合を選ぶ。
 * 区分が増えると見出しと小計のぶん、調整があると内訳の行と振込額の行のぶん、場所を取るので行数に換算して足す。
 */
export function pickDensity(c: { lines: number; sections: number; adjustments: number; hasInvoiceNumber?: boolean }): number {
  const rows = c.lines
    + Math.max(0, c.sections - 1) * 3.5
    + (c.adjustments > 0 ? c.adjustments * 2 + 6 : 0)
    + (c.hasInvoiceNumber ? 1 : 0);
  const i = MAX_ROWS.findIndex((max) => rows <= max);
  return i === -1 ? MAX_ROWS.length - 1 : i;
}

function makeStyles(level: number) {
  const d = DENSITY[level];
  const k = d.font / 10; // 字の大きさの比。小さい字はこれで一緒に縮める
  return StyleSheet.create({
  page: { fontFamily: "NotoSansJP", fontSize: d.font, color: C.ink, paddingTop: d.padTop, paddingBottom: d.padBottom, paddingHorizontal: d.padX, lineHeight: 1.4 },
  title: { fontSize: d.title, fontWeight: "bold", textAlign: "center", letterSpacing: 8, marginBottom: d.titleGap },

  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: d.gap },
  toBox: { width: "55%" },
  toName: { fontSize: 14 * k, fontWeight: "bold", borderBottomWidth: 1, borderBottomColor: "#9ca3af", paddingBottom: 3 },
  toSub: { fontSize: 9 * k, color: C.sub, marginTop: 6 * k },
  fromBox: { width: "42%", alignItems: "flex-end" },
  fromName: { fontSize: 12 * k, fontWeight: "bold" },
  fromLine: { fontSize: 9 * k, color: C.sub },

  metaRow: { flexDirection: "row", justifyContent: "space-between", fontSize: 9 * k, color: C.sub, marginBottom: 14 * k },
  totalBoxStacked: { backgroundColor: C.faint, borderRadius: 6, paddingVertical: d.totalPad - 2, paddingHorizontal: 18, marginBottom: d.gap },
  totalLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 3 * k },
  totalLineFinal: { borderTopWidth: 0.5, borderTopColor: "#9ca3af", marginTop: 6 * k, paddingTop: 8 * k },
  totalSubLabel: { fontSize: 10 * k, color: "#374151", lineHeight: 1 },
  totalSubValue: { fontSize: 12 * k, fontWeight: "bold", lineHeight: 1 },

  totalBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: C.faint, borderRadius: 6, paddingVertical: d.totalPad, paddingHorizontal: 18, marginBottom: d.gap },
  totalLabel: { fontSize: 11 * k, fontWeight: "bold", color: "#374151", lineHeight: 1 },
  totalValue: { fontSize: d.totalFont, fontWeight: "bold", lineHeight: 1 },

  sectionTitle: { fontSize: 11 * k, fontWeight: "bold", color: "#374151", marginBottom: 6 * k },
  section: { marginBottom: d.section },

  th: { flexDirection: "row", borderBottomWidth: 1.5, borderBottomColor: "#9ca3af", paddingBottom: 5 * k, marginBottom: 2 },
  thText: { fontSize: 9 * k, color: C.sub, fontWeight: "bold" },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.faint, paddingVertical: d.rowPad },
  cDate: { width: "18%" },
  cCustomer: { width: "34%" },
  cLabel: { width: "26%" },
  cAmount: { width: "22%", textAlign: "right" },
  cHourlyTitle: { width: "48%" },
  cHours: { width: "12%", textAlign: "right" },
  cAdjustLabel: { width: "78%" },

  tfoot: { flexDirection: "row", alignItems: "center", paddingTop: 8 * k },
  tfootLabel: { width: "78%", textAlign: "right", fontSize: 10 * k, fontWeight: "bold", color: "#374151", paddingRight: 8, lineHeight: 1 },
  tfootValue: { width: "22%", textAlign: "right", fontSize: 12 * k, fontWeight: "bold", lineHeight: 1 },

  taxBox: { marginTop: 10 * k, marginLeft: "auto", width: "55%", borderWidth: 1, borderColor: "#d1d5db", borderRadius: 6, paddingVertical: 8 * k, paddingHorizontal: 12 },
  taxRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 * k },
  taxKey: { fontSize: 9 * k, color: C.sub },
  taxVal: { fontSize: 9 * k, textAlign: "right" },
  taxTotalRow: { borderTopWidth: 0.5, borderTopColor: "#d1d5db", marginTop: 3, paddingTop: 4 * k },
  taxCaption: { fontSize: 8 * k, color: C.sub, marginBottom: 3 },
  taxKeyBold: { fontSize: 10 * k, fontWeight: "bold", color: "#374151" },
  taxValBold: { fontSize: 11 * k, fontWeight: "bold", textAlign: "right" },
  });
}
const STYLES = DENSITY.map((_, i) => makeStyles(i));
type S = ReturnType<typeof makeStyles>;

function LineSection({ s, title, lines, subtotal }: { s: S; title: string; lines: StatementLine[]; subtotal: number }) {
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

function HourlyLineSection({ s, lines, subtotal }: { s: S; lines: HourlyStatementLine[]; subtotal: number }) {
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

/**
 * 前払いの差し引き・立替の精算。
 *
 * 合計だけ減らすと受け取る側は理由が分からない。何がいくら引かれたかを必ず残す。
 *
 * 総支給額は減らさない。減るのは支給日に振り込む額だけ。
 */
function AdjustmentSection({
  s, lines, subtotal, rewardTotal, payable,
}: { s: S; lines: AdjustmentStatementLine[]; subtotal: number; rewardTotal: number; payable: number }) {
  if (lines.length === 0) return null;
  const signed = (n: number) => (n < 0 ? `−${yen(Math.abs(n))}` : yen(n));
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>調整（前払いの差し引き・立替の精算）</Text>
      <View style={s.th}>
        <Text style={[s.thText, s.cAdjustLabel]}>内容</Text>
        <Text style={[s.thText, s.cAmount]}>金額</Text>
      </View>
      {lines.map((l, i) => (
        <View key={i} style={s.tr} wrap={false}>
          <Text style={s.cAdjustLabel}>{l.note ? `${l.label}（${l.note}）` : l.label}</Text>
          <Text style={s.cAmount}>{signed(l.amount)}</Text>
        </View>
      ))}
      <View style={s.tfoot}>
        <Text style={s.tfootLabel}>総支給額</Text>
        <Text style={s.tfootValue}>{yen(rewardTotal)}</Text>
      </View>
      <View style={s.tfoot}>
        <Text style={s.tfootLabel}>調整 小計</Text>
        <Text style={s.tfootValue}>{signed(subtotal)}</Text>
      </View>
      <View style={s.tfoot}>
        <Text style={s.tfootLabel}>お振込額</Text>
        <Text style={s.tfootValue}>{yen(payable)}</Text>
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
  /** 報酬の合計（レッスン＋営業＋業務）。調整は含まない */
  total: number;
  adjustmentLines?: AdjustmentStatementLine[];
  adjustmentTotal?: number;
  /** 実際に振り込む額（報酬 ＋ 調整）。未指定なら total を使う */
  payable?: number;
  tax: { rate: number; net: number; tax: number; gross: number };
  issuer: { name: string; contact?: string; address: string; tel: string };
  statementNo: string;
  monthLabel: string;
  /** 「2026年11月15日」。支払日は人によって違う（杉元さんは15日、ほかは25日） */
  payDateLabel?: string;
}

export function CommissionStatementDocument({
  trainerName, trainerInvoiceNumber, trainerLines, trainerTotal, salesLines, salesTotal, hourlyLines, hourlyTotal, total,
  adjustmentLines = [], adjustmentTotal = 0, payable, tax, issuer, statementNo, monthLabel, payDateLabel,
}: CommissionStatementPdfData) {
  const paid = payable ?? total;
  // 1枚に収まるよう、行数に合わせて詰め具合を選ぶ
  const level = pickDensity({
    lines: trainerLines.length + salesLines.length + hourlyLines.length,
    sections: [trainerLines, salesLines, hourlyLines].filter((l) => l.length > 0).length,
    adjustments: adjustmentLines.length,
    hasInvoiceNumber: !!trainerInvoiceNumber,
  });
  const s = STYLES[level];
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
          {payDateLabel ? <Text>お支払日: {payDateLabel}</Text> : null}
        </View>

        {/* 前払いの差し引きがある月は「総支給額」と「お振込額」を分けて出す。
            総支給額は減らさない。減るのは振り込む額だけ。 */}
        {adjustmentTotal === 0 ? (
          <View style={s.totalBox}>
            <Text style={s.totalLabel}>お支払い金額</Text>
            <Text style={s.totalValue}>{yen(total)}</Text>
          </View>
        ) : (
          <View style={s.totalBoxStacked}>
            <View style={s.totalLine}>
              <Text style={s.totalSubLabel}>総支給額</Text>
              <Text style={s.totalSubValue}>{yen(total)}</Text>
            </View>
            {adjustmentLines.map((l, i) => (
              <View key={i} style={s.totalLine}>
                <Text style={s.totalSubLabel}>{l.label}</Text>
                <Text style={s.totalSubValue}>
                  {l.amount < 0 ? `−${yen(Math.abs(l.amount))}` : yen(l.amount)}
                </Text>
              </View>
            ))}
            <View style={[s.totalLine, s.totalLineFinal]}>
              <Text style={s.totalLabel}>お振込額</Text>
              <Text style={s.totalValue}>{yen(paid)}</Text>
            </View>
          </View>
        )}

        {/* レッスン担当分・営業分・業務（単価・歩合率は表示しない） */}
        <LineSection s={s} title="レッスン担当分" lines={trainerLines} subtotal={trainerTotal} />
        <LineSection s={s} title="営業分（レッスン歩合・成約ボーナス）" lines={salesLines} subtotal={salesTotal} />
        <HourlyLineSection s={s} lines={hourlyLines} subtotal={hourlyTotal} />
        <AdjustmentSection s={s} lines={adjustmentLines} subtotal={adjustmentTotal} rewardTotal={total} payable={paid} />

        {/* 消費税の内訳。割り戻す元は総支給額（前払いの差し引きは報酬ではないので含めない） */}
        {total > 0 ? (
          <View style={s.taxBox} wrap={false}>
            <Text style={s.taxCaption}>総支給額の内訳</Text>
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

"use server";

import { revalidatePath } from "next/cache";
import { getCustomer, getCustomers, updateCustomer } from "@/lib/customers";
import { requireAdmin } from "@/lib/members";
import { logActivity } from "@/lib/activity-logs";
import { getAllCustomerPlans } from "@/lib/customer-plans";
import { getAllSessionPasses } from "@/lib/session-passes";
import { getLessons } from "@/lib/lessons";
import { getTrialLessons } from "@/lib/trial-lessons";
import { getCustomerMonthlyItems } from "@/lib/customer-monthly-items";
import { getAllPlans } from "@/lib/plans-master";
import { billingGroups, buildGroupInvoice, invoiceFeesFromPlans, billingName, monthLabel, billingPeriodLabel, dueDateLabel, formatDueDate, BANK_INFO, ISSUER } from "@/lib/invoices";
import { tieredLessonPricesAll } from "@/lib/session-tiers";
import { getInvoiceDueDate, setInvoiceDueDate } from "@/lib/invoice-due-dates";
import { loadGroupInvoice, renderInvoicePdf, invoiceFilename } from "@/lib/invoice-render";
import { isMailConfigured, mailFromAddress, sendMail } from "@/lib/mailer";
import { recentInvoiceMail, markInvoiceMailStart, markInvoiceMailSent, clearInvoiceMailStart } from "@/lib/invoice-mail-guard";

// 請求書の宛名（billing_name）を更新する。空なら氏名に戻す。
export async function updateBillingNameAction(customerId: string, name: string) {
  await requireAdmin();
  await updateCustomer(customerId, { billingName: name.trim() || null });
  await logActivity({ action: "update", entityType: "invoice", entityId: customerId, summary: `請求書の宛名を変更: ${name.trim() || "（氏名に戻す）"}` });
  revalidatePath("/invoices");
  revalidatePath("/master/customers");
}

/**
 * 請求書（まとめ先=biller、対象月）の支払期限を上書きする。
 * dueDate が空なら設定を消して既定（対象月の翌月末日）に戻す。
 */
export async function updateInvoiceDueDateAction(
  billerId: string,
  month: string,
  dueDate: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  if (!billerId || !/^\d{4}-\d{2}$/.test(month)) return { ok: false, error: "対象が不正です" };
  const value = dueDate?.trim() || null;
  if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return { ok: false, error: "日付の形式が不正です" };

  await setInvoiceDueDate(billerId, month, value);
  // 既定に戻したときのログは、その顧客のルールで計算した日付を書く
  const biller = value ? null : await getCustomer(billerId);
  await logActivity({
    action: "update", entityType: "invoice", entityId: billerId,
    summary: `支払期限を変更: ${month} → ${value ? formatDueDate(value) : `既定（${dueDateLabel(month, null, biller ?? undefined)}）`}`,
  });
  revalidatePath("/invoices");
  revalidatePath("/invoices/print");
  return { ok: true };
}

function yen(n: number): string {
  return `¥${Math.round(n).toLocaleString("ja-JP")}`;
}

/**
 * 請求書1件（まとめ先=biller、対象月）について、顧客へLINEで貼って送るための
 * 「内訳＋金額＋お振込先」メッセージ文面を組み立てて返す。
 * 実際の送信は行わない（社長が公式LINEに貼って送る）。
 */
export async function createInvoiceShareAction(
  billerId: string,
  month: string,
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  await requireAdmin();
  if (!billerId || !month) return { ok: false, error: "対象が不正です" };

  const [customers, plans, passes, lessons, trialLessons, plansMaster, monthlyItems] = await Promise.all([
    getCustomers(), getAllCustomerPlans(), getAllSessionPasses(), getLessons(), getTrialLessons(), getAllPlans(), getCustomerMonthlyItems(),
  ]);

  // まとめ先(biller)のグループを解決
  const groups = billingGroups(customers);
  const group = groups.find((g) => g.biller.id === billerId)
    ?? groups.find((g) => g.members.some((m) => m.id === billerId));
  if (!group) return { ok: false, error: "顧客が見つかりません" };
  const biller = group.biller;

  // 請求書の内訳（全明細）
  // 段階単価（まとめた人数の合計で単価が変わる契約）をレッスンごとに当てはめる
  const tieredPrices = tieredLessonPricesAll({ customers, lessons });

  const invoice = buildGroupInvoice(
    biller, group.members, month,
    { plans, passes, lessons, trialLessons, monthlyItems, tieredPrices }, invoiceFeesFromPlans(plansMaster),
  );
  if (invoice.lines.length === 0) return { ok: false, error: "対象月の請求がありません" };

  const dueOverride = await getInvoiceDueDate(biller.id, month);

  // メッセージ文面
  const lines: string[] = [];
  lines.push(`${billingName(biller)} 様`);
  lines.push("");
  lines.push("いつもありがとうございます。");
  const periodLabel = billingPeriodLabel(month, biller.billingCutoffDay);
  lines.push(`${monthLabel(month)}分のご請求をお送りします。`);
  if (periodLabel) lines.push(`対象期間：${periodLabel}`);
  lines.push("");
  // 内訳は「何回・いくら」だけ。1本ずつ並べると長くて読まれない（PDFに全部載っている）
  const counts = new Map<string, { count: number; amount: number }>();
  for (const l of invoice.lines) {
    const cur = counts.get(l.label) ?? { count: 0, amount: 0 };
    counts.set(l.label, { count: cur.count + 1, amount: cur.amount + l.amount });
  }
  for (const [label, c] of counts) lines.push(c.count > 1 ? `${label}　${c.count}回　${yen(c.amount)}` : `${label}　${yen(c.amount)}`);
  lines.push(`合計　${yen(invoice.total)}（税込）`);
  lines.push("");
  lines.push("【お振込先】");
  lines.push(`${BANK_INFO.bankName}　${BANK_INFO.accountType}　${BANK_INFO.accountNumber}`);
  lines.push(`口座名義：${BANK_INFO.accountHolder}`);
  lines.push(`お支払期限：${dueDateLabel(month, dueOverride, biller)}（振込手数料はご負担ください）`);
  lines.push("");
  lines.push("ご不明点はこのトークにご返信ください。");
  lines.push("FIT STAGE");
  const message = lines.join("\n");

  await logActivity({
    action: "create", entityType: "invoice", entityId: biller.id,
    summary: `請求LINE文面を作成: ${billingName(biller)} ${month}`,
  });

  return { ok: true, message };
}


/**
 * 請求書をメールで送るときの 件名・本文 を作る。
 *
 * 尚樹が毎月手で打っていた文面（宛名＋「〇月に実施した健康運動指導の請求書を添付」）をそのまま出す。
 * 宛名は顧客マスタの「請求メールの宛名」。未設定なら「ご担当者様」。
 * PDFはメールアプリ側で添付する（iPhoneの共有シートなら本文と一緒に渡せる）。
 */
export async function createInvoiceEmailAction(
  billerId: string,
  month: string,
): Promise<
  | { ok: true; to: string; subject: string; body: string; canSend: boolean; from: string | null }
  | { ok: false; error: string }
> {
  await requireAdmin();
  if (!billerId || !month) return { ok: false, error: "対象が不正です" };

  const loaded = await loadGroupInvoice(billerId, month);
  if (!loaded) return { ok: false, error: "顧客が見つかりません" };
  const { biller, invoice, dueOverride } = loaded;
  if (invoice.lines.length === 0) return { ok: false, error: "対象月の請求がありません" };

  const [y, mm] = month.split("-");
  const ym = `${y}年${parseInt(mm, 10)}月`;
  const contact = biller.billingContactName?.trim();
  const subject = `請求書送付のご連絡｜健康運動指導（${ym}実施分）`;
  const body = [
    billingName(biller),
    contact ? `${contact} 様` : "ご担当者様",
    "",
    "いつもお世話になっております。FIT STAGEの坂根です。",
    "",
    `${ym}に実施いたしました健康運動指導につきまして、請求書を添付にてお送りいたします。`,
    "ご確認のうえ、お振込みいただけますと幸いです。",
    "",
    `ご請求金額：${yen(invoice.total)}（税込）`,
    `お支払期限：${dueDateLabel(month, dueOverride, biller)}`,
    "",
    "ご不明点等ございましたらお知らせください。",
    "何卒よろしくお願い申し上げます。",
    "",
    "――――――――――――",
    ISSUER.name,
    "坂根 尚樹",
    "〒564-0051",
    ISSUER.address.split("\n").join(" "),
    ISSUER.tel,
    `Mail：${ISSUER.email}`,
    "――――――――――――",
  ].join("\n");

  await logActivity({
    action: "create", entityType: "invoice", entityId: biller.id,
    summary: `請求メール文面を作成: ${billingName(biller)} ${month}`,
  });

  return { ok: true, to: biller.email ?? "", subject, body, canSend: isMailConfigured(), from: mailFromAddress() };
}

/**
 * 請求書PDFを添付して、Gmail から送る（lib/mailer.ts）。
 * 宛先・件名・本文は画面で直したものを受け取る。送れたら活動ログに残す。
 *
 * 同じ請求書を同じ宛先へ、少し前に送って（送りかけて）いたら、いったん止めて確かめる（duplicate）。
 * 「それでも送る」と答えたときだけ force で送る。理由は lib/invoice-mail-guard.ts。
 */
export async function sendInvoiceEmailAction(
  billerId: string,
  month: string,
  mail: { to: string; subject: string; body: string },
  opts?: { force?: boolean },
): Promise<{ ok: true; to: string } | { ok: false; error: string; duplicate?: boolean }> {
  await requireAdmin();
  if (!billerId || !month) return { ok: false, error: "対象が不正です" };
  const to = mail.to.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { ok: false, error: "宛先のメールアドレスを確認してください" };
  if (!mail.subject.trim()) return { ok: false, error: "件名が空です" };
  if (!mail.body.trim()) return { ok: false, error: "本文が空です" };
  if (!isMailConfigured()) return { ok: false, error: "Gmail の送信設定がまだありません（Vercel に GMAIL_USER と GMAIL_APP_PASSWORD を入れてください）" };

  const loaded = await loadGroupInvoice(billerId, month);
  if (!loaded) return { ok: false, error: "顧客が見つかりません" };
  if (loaded.invoice.lines.length === 0) return { ok: false, error: "対象月の請求がありません" };

  // まとめ請求のときも、記録は請求先（biller）で1つにそろえる
  const guardId = loaded.biller.id;
  const name = billingName(loaded.biller);
  if (!opts?.force) {
    const recent = await recentInvoiceMail(guardId, month, to);
    if (recent) {
      const when = recent.minutesAgo < 1 ? "ついさっき" : `${recent.minutesAgo}分前に`;
      return { ok: false, duplicate: true, error: `${when}、同じ請求書を ${to} へ送っています。Gmail の「送信済み」で届いているか確かめてください。` };
    }
  }

  const pdf = await renderInvoicePdf(loaded, month);
  const logId = await markInvoiceMailStart(guardId, name, month, to);
  const sent = await sendMail({
    to,
    subject: mail.subject.trim(),
    text: mail.body,
    attachments: [{ filename: invoiceFilename(loaded.invoice, month), content: pdf }],
  });
  if (!sent.ok) {
    await clearInvoiceMailStart(logId);
    return sent;
  }
  if (logId) await markInvoiceMailSent(logId, name, month, to);
  else await logActivity({ action: "create", entityType: "invoice", entityId: guardId, summary: `請求書をメール送信: ${name} ${month} → ${to}` });
  return { ok: true, to };
}

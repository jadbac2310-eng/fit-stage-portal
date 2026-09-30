import { NextRequest, NextResponse } from "next/server";
import { addCustomer } from "@/lib/customers";
import { addTrialLesson } from "@/lib/trial-lessons";
import { getStores } from "@/lib/stores";
import { getMembers } from "@/lib/members";
import { pushLineMessage } from "@/lib/line";
import { portalUrl } from "@/lib/line-notify";

/**
 * HPの体験予約フォーム（/store/reserve/）からの申込を受け取る。
 *
 * 呼び出し元は fit-stage サイトの Vercel Function（api/reserve.js）で、
 * ブラウザからは直接呼ばれない（秘密キーをHTMLに置かずに済むため）。
 *
 * 受け取ったら
 *   1. 顧客を作成（status=trial）
 *   2. 体験レッスンを下書き作成（希望店舗・希望日時を反映）
 *   3. 管理者へLINEで通知
 * を行う。1でこけたら失敗、2・3でこけても申込自体は成功として返す
 * （HP側は通知メールが別経路で飛んでいるため、ここで落として再送させない）。
 */

export const runtime = "nodejs";

type Body = {
  full_name?: string;
  email?: string;
  phone_number?: string;
  store_name?: string;
  preferred_at_1?: string;   // "2026-10-03T10:00"（日本時間の壁時計）
  preferred_at_2?: string;
  schedule_note?: string;    // 「22日の午後なら可」などの補足
  people?: string;
  trainer?: string;
  parking?: string;
  goals?: string;            // 複数選択。HP側で「、」つなぎにしてある
  habit?: string;
  goal?: string;
};

/** datetime-local の値（日本時間）を UTC の ISO 文字列にする */
function jstLocalToISO(value?: string): string | null {
  if (!value) return null;
  const d = new Date(`${value.length === 16 ? value : value.slice(0, 16)}:00+09:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** 日本時間で「10/3(金) 10:00」の形にする（通知と備考の表示用） */
function jstLabel(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  const wd = ["日", "月", "火", "水", "木", "金", "土"][d.getUTCDay()];
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${wd}) ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

/**
 * 備考は「ラベル: 値」を1行ずつ並べる。
 * ポータルの体験レッスン画面がこの形を項目リストとして表示するため、形式を合わせる。
 */
function buildNote(b: Body, secondISO: string | null): string {
  const lines: [string, string | undefined][] = [
    ["希望店舗", b.store_name],
    ["希望日時（第2希望）", secondISO ? jstLabel(secondISO) : undefined],
    ["日時の補足", b.schedule_note],
    ["利用人数", b.people],
    ["希望トレーナー", b.trainer],
    ["駐車場", b.parking],
    ["お悩み・目的", b.goals],
    ["運動習慣", b.habit],
    ["詳しい内容・ご要望", b.goal],
  ];
  return lines
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `${k}: ${v!.trim().replace(/\s*\n\s*/g, " ")}`)
    .join("\n");
}

/** 予約が入ったことを管理者のLINEへ通知する（失敗しても申込は成功扱い） */
async function notifyAdmins(customerName: string, storeName: string | undefined, firstISO: string | null) {
  if ((process.env.LINE_NOTIFY_RESERVATION ?? "").trim().toLowerCase() === "off") return;
  try {
    const members = await getMembers();
    // 既定は管理者全員。RESERVE_NOTIFY_MEMBER_IDS で送信先を明示指定もできる。
    const explicit = (process.env.RESERVE_NOTIFY_MEMBER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const targets = members.filter((m) =>
      m.lineUserId && (explicit.length > 0 ? explicit.includes(m.id) : m.isAdmin));
    if (targets.length === 0) return;

    const text = [
      "🔔 体験レッスンの申込が入りました",
      `お名前: ${customerName}`,
      storeName ? `希望店舗: ${storeName}` : null,
      firstISO ? `希望日時: ${jstLabel(firstISO)}` : null,
      "",
      portalUrl("/lessons/trial"),
    ].filter(Boolean).join("\n");

    await Promise.all(targets.map((m) => pushLineMessage(m.lineUserId!, text)));
  } catch (e) {
    console.error("[reserve-webhook] LINE通知に失敗", e);
  }
}

export async function POST(req: NextRequest) {
  // 専用の合言葉を優先する。未設定なら既存のカウンセリング用と同じものを使う。
  // 別にしておくと、HP側と揃えるときに既存の連携を触らずに済む。
  // 前後の空白は落としてから比べる。設定画面に貼り付けるときに改行や空白が
  // 紛れ込むことがあり、見た目が同じなのに合わないという事故が起きるため。
  const secret = (process.env.RESERVE_WEBHOOK_SECRET || process.env.CONSULTATION_WEBHOOK_SECRET || "").trim();
  if (!secret) {
    // 合言葉が未設定。値が合わない場合と区別できるよう、別のコードで返す。
    console.error("[reserve-webhook] RESERVE_WEBHOOK_SECRET が未設定です");
    return NextResponse.json({ error: "Webhook secret is not configured" }, { status: 503 });
  }
  if ((req.headers.get("x-webhook-secret") ?? "").trim() !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const fullName = body.full_name?.trim();
  const email = body.email?.trim();
  if (!fullName || !email) {
    return NextResponse.json({ error: "full_name and email are required" }, { status: 400 });
  }

  const firstISO = jstLocalToISO(body.preferred_at_1);
  const secondISO = jstLocalToISO(body.preferred_at_2);

  try {
    const customer = await addCustomer({
      email,
      fullName,
      phoneNumber: body.phone_number?.trim() || undefined,
      status: "trial",
      customerType: "individual",
      agreedToTerms: false,
    });

    // 体験レッスンの下書き作成。ここで失敗しても顧客登録は成功として返す。
    let trialCreated = false;
    try {
      // 希望店舗は店舗マスタと名前で照合する（「迷っている・相談したい」等は未設定のまま）。
      // マスタ側の名前に空白が紛れていても拾えるよう、両側の前後空白を落として比べる。
      const storeName = body.store_name?.trim();
      const storeId = storeName
        ? (await getStores()).find((s) => s.name.trim() === storeName)?.id ?? null
        : null;

      await addTrialLesson({
        customerId: customer.id,
        // 希望日時が取れないときは申込日時を仮で入れる（担当者が後で確定する）
        scheduledAt: firstISO ?? new Date().toISOString(),
        storeId,
        note: buildNote(body, secondISO) || undefined,
      });
      trialCreated = true;
    } catch (e) {
      console.error("[reserve-webhook] 体験レッスンの作成に失敗", e);
    }

    await notifyAdmins(fullName, body.store_name?.trim(), firstISO);

    return NextResponse.json({ success: true, customer_id: customer.id, trial_created: trialCreated });
  } catch (e) {
    console.error("[reserve-webhook] 失敗", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { addCustomer, getCustomers, updateCustomer } from "@/lib/customers";
import { addMembershipApplication } from "@/lib/membership-applications";
import { getStores } from "@/lib/stores";
import { getMembers } from "@/lib/members";
import { pushLineMessage } from "@/lib/line";
import { portalUrl, canNotifyByLine } from "@/lib/line-notify";

/**
 * HPの入会申し込みフォーム（/store/join/）からの申込を受け取る。
 *
 * 呼び出し元は fit-stage サイトの Vercel Function（api/join.js）で、
 * ブラウザからは直接呼ばれない（秘密キーをHTMLに置かずに済むため）。
 *
 * 受け取ったら
 *   1. 申込書を原本として保存（membership_applications）
 *   2. 顧客マスタに反映（同じメールの人がいれば更新、いなければ新規）
 *   3. 管理者へLINEで通知
 * を行う。1でこけたら失敗、2・3でこけても申込自体は成功として返す
 * （HP側は通知メールが別経路で飛んでいるため、ここで落として再送させない）。
 *
 * 顧客の在籍ステータスはここでは変えない。入金の確認が済んでから
 * 担当者が顧客マスタで「在籍中」にする運用のため。
 */

export const runtime = "nodejs";

type Body = {
  store_name?: string;
  full_name?: string;
  full_name_kana?: string;
  date_of_birth?: string;
  phone_number?: string;
  email?: string;
  postal_code?: string;
  address?: string;
  emergency_name?: string;
  emergency_relation?: string;
  emergency_phone?: string;
  plan?: string;
  payment_method?: string;
  health_condition?: string;
  health_medicine?: string;
  health_injury?: string;
  health_maternity?: string;
  photo_consent?: string;
  request_note?: string;
  agreed_to_terms?: string;
  agreed_at?: string;
  signature_name?: string;
};

const trim = (v?: string) => {
  const s = (v ?? "").trim();
  return s === "" ? undefined : s;
};

/** 郵便番号と住所をひとつにまとめる（顧客マスタの住所は1項目のため） */
function fullAddress(zip?: string, addr?: string): string | undefined {
  const z = trim(zip);
  const a = trim(addr);
  if (!z && !a) return undefined;
  return [z ? `〒${z.replace(/^〒/, "")}` : null, a].filter(Boolean).join(" ");
}

/** 申込が入ったことを管理者のLINEへ通知する（失敗しても申込は成功扱い） */
async function notifyAdmins(a: {
  fullName: string;
  storeName?: string;
  plan?: string;
  health: boolean;
}) {
  if ((process.env.LINE_NOTIFY_JOIN ?? "").trim().toLowerCase() === "off") return;
  try {
    const members = await getMembers();
    // 既定は管理者全員。JOIN_NOTIFY_MEMBER_IDS で送信先を明示指定もできる。
    const explicit = (process.env.JOIN_NOTIFY_MEMBER_IDS ?? "")
      .split(",").map((s) => s.trim()).filter(Boolean);
    const targets = members.filter((m) =>
      canNotifyByLine(m) && (explicit.length > 0 ? explicit.includes(m.id) : m.isAdmin));
    if (targets.length === 0) return;

    const text = [
      "📝 入会のお申し込みが入りました",
      `お名前: ${a.fullName}`,
      a.storeName ? `店舗: ${a.storeName}` : null,
      a.plan ? `プラン: ${a.plan}` : null,
      a.health ? "※ 健康状態に申告あり" : null,
      "",
      portalUrl("/master/applications"),
    ].filter(Boolean).join("\n");

    await Promise.all(targets.map((m) => pushLineMessage(m.lineUserId!, text)));
  } catch (e) {
    console.error("[join-webhook] LINE通知に失敗", e);
  }
}

export async function POST(req: NextRequest) {
  // 体験予約と同じ合言葉を使う。HP側の設定を1つにしておくため。
  // 前後の空白は落としてから比べる（設定画面に貼るときに紛れ込むため）。
  const secret = (process.env.RESERVE_WEBHOOK_SECRET || process.env.CONSULTATION_WEBHOOK_SECRET || "").trim();
  if (!secret) {
    console.error("[join-webhook] RESERVE_WEBHOOK_SECRET が未設定です");
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

  const fullName = trim(body.full_name);
  const email = trim(body.email);
  if (!fullName) {
    return NextResponse.json({ error: "full_name is required" }, { status: 400 });
  }

  const storeName = trim(body.store_name);
  const address = fullAddress(body.postal_code, body.address);
  const maternity = (body.health_maternity ?? "").trim() !== "";
  const health =
    body.health_condition === "ある" ||
    body.health_medicine === "ある" ||
    body.health_injury === "ある" ||
    maternity;

  // 希望店舗は店舗マスタと名前で照合する（見つからなければ名前だけ残す）
  let storeId: string | undefined;
  try {
    if (storeName) {
      storeId = (await getStores()).find((s) => s.name.trim() === storeName)?.id;
    }
  } catch (e) {
    console.error("[join-webhook] 店舗マスタの参照に失敗", e);
  }

  // 顧客マスタへの反映。ここでこけても申込書は残すので、先に顧客を試す。
  let customerId: string | undefined;
  try {
    const existing = email
      ? (await getCustomers()).find((c) => c.email?.trim().toLowerCase() === email.toLowerCase())
      : undefined;

    if (existing) {
      // 体験のときに作られた顧客に、申込書の内容を上書きする。
      // 在籍ステータスは触らない（入金確認後に担当者が変える運用）。
      await updateCustomer(existing.id, {
        fullName,
        ...(trim(body.date_of_birth) ? { dateOfBirth: trim(body.date_of_birth) } : {}),
        ...(address ? { address } : {}),
        ...(trim(body.phone_number) ? { phoneNumber: trim(body.phone_number) } : {}),
        agreedToTerms: true,
      });
      customerId = existing.id;
    } else {
      const created = await addCustomer({
        email,
        fullName,
        dateOfBirth: trim(body.date_of_birth),
        address,
        phoneNumber: trim(body.phone_number),
        status: "pending",
        customerType: "individual",
        agreedToTerms: true,
      });
      customerId = created.id;
    }
  } catch (e) {
    console.error("[join-webhook] 顧客マスタへの反映に失敗", e);
  }

  try {
    const app = await addMembershipApplication({
      customerId,
      storeId,
      storeName,
      fullName,
      fullNameKana:      trim(body.full_name_kana),
      dateOfBirth:       trim(body.date_of_birth),
      phoneNumber:       trim(body.phone_number),
      email,
      postalCode:        trim(body.postal_code),
      address:           trim(body.address),
      emergencyName:     trim(body.emergency_name),
      emergencyRelation: trim(body.emergency_relation),
      emergencyPhone:    trim(body.emergency_phone),
      plan:              trim(body.plan),
      paymentMethod:     trim(body.payment_method),
      healthCondition:   trim(body.health_condition),
      healthMedicine:    trim(body.health_medicine),
      healthInjury:      trim(body.health_injury),
      healthMaternity:   maternity,
      photoConsent:      trim(body.photo_consent),
      requestNote:       trim(body.request_note),
      agreedToTerms:     (body.agreed_to_terms ?? "").trim() !== "",
      agreedAt:          new Date().toISOString(),
      signatureName:     trim(body.signature_name),
    });

    await notifyAdmins({ fullName, storeName, plan: trim(body.plan), health });

    return NextResponse.json({ success: true, application_id: app.id, customer_id: customerId });
  } catch (e) {
    console.error("[join-webhook] 失敗", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

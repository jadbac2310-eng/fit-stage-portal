import { NextRequest, NextResponse } from "next/server";
import { addCustomer } from "@/lib/customers";
import { addTrialLesson } from "@/lib/trial-lessons";

export async function POST(req: NextRequest) {
  const secret = process.env.CONSULTATION_WEBHOOK_SECRET;
  if (!secret || req.headers.get("x-webhook-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, string | null>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    email, full_name, date_of_birth,
    address, phone_number, desired_start_date,
    trial_scheduled_at,
    note,
  } = body;
  if (!email || !full_name) {
    return NextResponse.json({ error: "email and full_name are required" }, { status: 400 });
  }

  try {
    const customer = await addCustomer({
      email: email as string,
      fullName: full_name as string,
      dateOfBirth: date_of_birth ?? undefined,
      address: address ?? undefined,
      phoneNumber: phone_number ?? undefined,
      desiredStartDate: desired_start_date ?? undefined,
      status: "trial",
      customerType: "individual",
      agreedToTerms: false,
      note: note ?? undefined,
    });

    // 顧客登録と同時に体験レッスンを下書き作成（営業担当は後で割当）。
    // 日時は希望日を使用し、無ければ申込日時を仮で入れる。
    let trialCreated = false;
    try {
      await addTrialLesson({
        customerId: customer.id,
        scheduledAt:
          (trial_scheduled_at as string) ||
          (desired_start_date as string) ||
          new Date().toISOString(),
      });
      trialCreated = true;
    } catch (te) {
      // 体験レッスン作成に失敗しても顧客登録は成功として扱う
      console.error("consultation-webhook trial-lesson error:", te);
    }

    return NextResponse.json({ success: true, customer_id: customer.id, trial_created: trialCreated });
  } catch (e) {
    console.error("consultation-webhook error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

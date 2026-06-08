import { NextRequest, NextResponse } from "next/server";
import { addCustomer } from "@/lib/customers";

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

  const { email, full_name, date_of_birth, note } = body;
  if (!email || !full_name) {
    return NextResponse.json({ error: "email and full_name are required" }, { status: 400 });
  }

  try {
    await addCustomer({
      email: email as string,
      fullName: full_name as string,
      dateOfBirth: date_of_birth ?? undefined,
      status: "trial",
      customerType: "individual",
      agreedToTerms: false,
      note: note ?? undefined,
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("consultation-webhook error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

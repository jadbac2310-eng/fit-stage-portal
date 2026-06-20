import { createClient } from "@supabase/supabase-js";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const mode = process.argv[2]; // "list" or "delete"

// Stripe由来の入金（stripe_session_id がある＝決済リンク経由）
const { data: pays, error: e1 } = await db
  .from("payments")
  .select("id, customer_id, source_type, source_id, amount, method, paid_at, stripe_session_id")
  .not("stripe_session_id", "is", null);
if (e1) { console.error("payments取得エラー", e1); process.exit(1); }

const { data: checkouts, error: e2 } = await db
  .from("stripe_checkouts")
  .select("id, customer_name, month, amount, status, session_id");
if (e2) { console.error("stripe_checkouts取得エラー", e2); process.exit(1); }

console.log("=== Stripe入金(payments) ===", pays.length, "件");
for (const p of pays) console.log(`  ${p.method} ¥${p.amount} ${p.source_type} paid_at=${p.paid_at} session=${p.stripe_session_id}`);
console.log("=== 決済リンク(stripe_checkouts) ===", checkouts.length, "件");
for (const c of checkouts) console.log(`  ${c.customer_name ?? ""} ${c.month} ¥${c.amount} status=${c.status} session=${c.session_id}`);

if (mode !== "delete") {
  console.log("\n(確認のみ。削除するには引数 delete を付けて実行)");
  process.exit(0);
}

const sessionIds = checkouts.map((c) => c.session_id);
const payIds = pays.map((p) => p.id);

if (payIds.length) {
  const { error } = await db.from("payments").delete().in("id", payIds);
  if (error) { console.error("payments削除エラー", error); process.exit(1); }
  console.log(`\npayments を ${payIds.length} 件削除しました`);
}
if (sessionIds.length) {
  const { error } = await db.from("stripe_checkouts").delete().in("session_id", sessionIds);
  if (error) { console.error("stripe_checkouts削除エラー", error); process.exit(1); }
  console.log(`stripe_checkouts を ${sessionIds.length} 件削除しました`);
}
console.log("完了。該当顧客は「未入金」に戻りました。");

-- Stripe決済（カード）。既存の入金台帳(payments)にカード入金を自動記録するための拡張。
-- 決済リンク(Checkout Session)を発行→顧客が支払い→webhookで対象売上に payments 行(method=カード)を自動作成する。
alter table public.payments add column if not exists stripe_session_id        text;
alter table public.payments add column if not exists stripe_payment_intent_id text;

-- 発行した決済リンク（Checkout Session）。1リンク=顧客×対象月の未入金分まとめ払い。
-- covered = 支払い対象の売上項目一覧。webhook完了時にこの各項目へ payments 行を作成する。
create table if not exists public.stripe_checkouts (
  id                 uuid primary key default gen_random_uuid(),
  session_id         text not null unique,                  -- Stripe Checkout Session ID
  payment_intent_id  text,
  customer_id        uuid references public.customers(id) on delete set null,
  customer_name      text,
  month              text,                                  -- 対象月 YYYY-MM
  amount             integer not null default 0,            -- 合計金額（円）
  covered            jsonb not null default '[]'::jsonb,    -- [{source_type, source_id, amount}]
  status             text not null default 'pending',       -- pending | paid | expired | canceled
  url                text,                                  -- 決済リンクURL
  created_by         uuid references public.members(id),
  created_at         timestamptz not null default now(),
  paid_at            timestamptz
);
create index if not exists idx_stripe_checkouts_status   on public.stripe_checkouts (status);
create index if not exists idx_stripe_checkouts_customer on public.stripe_checkouts (customer_id);
create index if not exists idx_stripe_checkouts_month    on public.stripe_checkouts (month);
